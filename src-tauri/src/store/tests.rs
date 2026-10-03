use super::*;
use serde_json::json;

fn planner() -> Value {
    serde_json::from_str(include_str!("../../../tests/fixtures/planner-v1.json")).unwrap()
}

fn legacy(connection: &Connection, payload: &str) {
    connection
        .execute_batch(
            "CREATE TABLE planner(id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL);
         PRAGMA user_version=1;",
        )
        .unwrap();
    connection
        .execute("INSERT INTO planner VALUES(1, ?1)", [payload])
        .unwrap();
}

fn loaded(connection: &Connection) -> Value {
    serde_json::from_str(&read(connection).unwrap().unwrap()).unwrap()
}

fn revision(connection: &Connection, kind: &str, id: &str) -> i64 {
    connection
        .query_row(
            "SELECT revision FROM planner_entities WHERE kind=?1 AND entity_id=?2",
            params![kind, id],
            |row| row.get(0),
        )
        .unwrap()
}

#[test]
fn starts_empty_and_round_trips_the_existing_document_contract() {
    let connection = Connection::open_in_memory().unwrap();
    initialize(&connection).unwrap();
    assert_eq!(read(&connection).unwrap(), None);
    write(&connection, &planner().to_string()).unwrap();
    assert_eq!(loaded(&connection), planner());
    assert_eq!(database_version(&connection).unwrap(), 2);
    initialize(&connection).unwrap();
    assert_eq!(loaded(&connection), planner());
}

#[test]
fn failed_initialization_is_exposed_to_the_ui_without_allowing_writes() {
    let connection = Connection::open_in_memory().unwrap();
    legacy(&connection, "invalid JSON");
    let store = Store::new(connection);
    assert!(store.lock().is_err());
    let connection = store.connection.lock().unwrap();
    assert_eq!(database_version(&connection).unwrap(), 1);
    let saved: String = connection
        .query_row("SELECT payload FROM planner WHERE id=1", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!(saved, "invalid JSON");
}

#[test]
fn migrates_losslessly_and_keeps_the_original_snapshot() {
    let connection = Connection::open_in_memory().unwrap();
    let mut original = planner();
    original["customMetadata"] = json!({"keep":true});
    original["blocks"][0]["extraField"] = json!("preserved");
    let raw = serde_json::to_string_pretty(&original).unwrap();
    legacy(&connection, &raw);
    initialize(&connection).unwrap();
    assert_eq!(loaded(&connection), original);
    let mut edited = original.clone();
    edited["blocks"][0]["title"] = json!("Edited after migration");
    write(&connection, &edited.to_string()).unwrap();
    initialize(&connection).unwrap();
    let snapshot: String = connection
        .query_row(
            "SELECT payload FROM planner_v1_backup WHERE id=1",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(snapshot, raw);
    assert_eq!(loaded(&connection), edited);
}

#[test]
fn migrates_an_empty_legacy_database_without_inventing_a_planner() {
    let connection = Connection::open_in_memory().unwrap();
    connection.execute_batch("CREATE TABLE planner(id INTEGER PRIMARY KEY, payload TEXT NOT NULL); PRAGMA user_version=1;").unwrap();
    initialize(&connection).unwrap();
    assert_eq!(read(&connection).unwrap(), None);
}

#[test]
fn invalid_legacy_data_is_not_migrated_or_replaced() {
    let mut duplicate = planner();
    let block = duplicate["blocks"][0].clone();
    duplicate["blocks"].as_array_mut().unwrap().push(block);
    for raw in [
        "not JSON".to_string(),
        "{\"schemaVersion\":2}".into(),
        duplicate.to_string(),
    ] {
        let connection = Connection::open_in_memory().unwrap();
        legacy(&connection, &raw);
        assert!(initialize(&connection).is_err());
        assert_eq!(database_version(&connection).unwrap(), 1);
        let saved: String = connection
            .query_row("SELECT payload FROM planner WHERE id=1", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(saved, raw);
    }
}

#[test]
fn failed_schema_migration_rolls_back_all_new_tables() {
    let connection = Connection::open_in_memory().unwrap();
    legacy(&connection, &planner().to_string());
    connection
        .execute_batch("CREATE TABLE planner_entities(unexpected TEXT);")
        .unwrap();
    assert!(initialize(&connection).is_err());
    assert_eq!(database_version(&connection).unwrap(), 1);
    let state_exists: bool = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE name='planner_state')",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert!(!state_exists);
    connection
        .execute_batch("DROP TABLE planner_entities;")
        .unwrap();
    initialize(&connection).unwrap();
    assert_eq!(loaded(&connection), planner());
}

#[test]
fn updating_one_entity_does_not_rewrite_unrelated_entities() {
    let connection = Connection::open_in_memory().unwrap();
    initialize(&connection).unwrap();
    let mut data = planner();
    write(&connection, &data.to_string()).unwrap();
    write(&connection, &data.to_string()).unwrap();
    let block_id = data["blocks"][0]["id"].as_str().unwrap().to_string();
    assert_eq!(revision(&connection, "blocks", &block_id), 1);
    data["blocks"][0]["notes"] = json!("New notes");
    write(&connection, &data.to_string()).unwrap();
    assert_eq!(revision(&connection, "blocks", &block_id), 2);
    assert_eq!(
        revision(
            &connection,
            "categories",
            data["categories"][0]["id"].as_str().unwrap()
        ),
        1
    );
    assert_eq!(
        revision(
            &connection,
            "templates",
            data["templates"][0]["id"].as_str().unwrap()
        ),
        1
    );
    assert_eq!(loaded(&connection), data);
}

#[test]
fn deletions_discard_content_but_keep_identity_and_can_be_restored() {
    let connection = Connection::open_in_memory().unwrap();
    initialize(&connection).unwrap();
    let original = planner();
    write(&connection, &original.to_string()).unwrap();
    let mut deleted = original.clone();
    deleted["blocks"] = json!([]);
    write(&connection, &deleted.to_string()).unwrap();
    let tombstone: (Option<String>, Option<i64>, i64, i64) = connection.query_row(
        "SELECT payload, sort_order, revision, deleted FROM planner_entities WHERE kind='blocks'", [],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    ).unwrap();
    assert_eq!(tombstone, (None, None, 2, 1));
    assert_eq!(loaded(&connection), deleted);
    write(&connection, &original.to_string()).unwrap();
    assert_eq!(loaded(&connection), original);
    assert_eq!(
        revision(
            &connection,
            "blocks",
            original["blocks"][0]["id"].as_str().unwrap()
        ),
        3
    );
}

#[test]
fn preserves_array_order_when_categories_are_reordered() {
    let connection = Connection::open_in_memory().unwrap();
    initialize(&connection).unwrap();
    let mut data = planner();
    write(&connection, &data.to_string()).unwrap();
    data["categories"].as_array_mut().unwrap().reverse();
    write(&connection, &data.to_string()).unwrap();
    assert_eq!(loaded(&connection), data);
}

#[test]
fn failed_multi_entity_save_rolls_back_updates_and_deletions() {
    let connection = Connection::open_in_memory().unwrap();
    initialize(&connection).unwrap();
    let original = planner();
    write(&connection, &original.to_string()).unwrap();
    connection
        .execute_batch(
            "CREATE TRIGGER reject_template BEFORE UPDATE ON planner_entities
         WHEN NEW.kind='templates' BEGIN SELECT RAISE(ABORT, 'simulated failure'); END;",
        )
        .unwrap();
    let mut changed = original.clone();
    changed["categories"][0]["name"] = json!("Updated category");
    changed["blocks"] = json!([]);
    changed["templates"][0]["name"] = json!("Updated template");
    assert!(write(&connection, &changed.to_string()).is_err());
    assert_eq!(loaded(&connection), original);
    assert_eq!(
        revision(
            &connection,
            "categories",
            original["categories"][0]["id"].as_str().unwrap()
        ),
        1
    );
}

#[test]
fn rejects_invalid_replacements_without_losing_saved_data() {
    let connection = Connection::open_in_memory().unwrap();
    initialize(&connection).unwrap();
    write(&connection, &planner().to_string()).unwrap();
    let mut missing_category = planner();
    missing_category["categories"]
        .as_array_mut()
        .unwrap()
        .remove(0);
    for invalid in [
        "bad JSON".into(),
        " ".repeat(MAX_BYTES + 1),
        missing_category.to_string(),
    ] {
        assert!(write(&connection, &invalid).is_err());
        assert_eq!(loaded(&connection), planner());
    }
}

#[test]
fn refuses_newer_database_on_initialize_read_and_write() {
    let connection = Connection::open_in_memory().unwrap();
    connection.execute_batch("PRAGMA user_version=3;").unwrap();
    assert!(initialize(&connection).is_err());
    assert!(read(&connection).is_err());
    assert!(write(&connection, &planner().to_string()).is_err());
    assert_eq!(database_version(&connection).unwrap(), 3);
}

#[test]
fn missing_metadata_is_an_error_not_an_empty_planner() {
    let connection = Connection::open_in_memory().unwrap();
    initialize(&connection).unwrap();
    write(&connection, &planner().to_string()).unwrap();
    connection.execute("DELETE FROM planner_state", []).unwrap();
    assert!(read(&connection).is_err());
    assert!(initialize(&connection).is_err());
}

#[test]
fn detects_corrupt_entity_identity_without_modifying_it() {
    let connection = Connection::open_in_memory().unwrap();
    initialize(&connection).unwrap();
    write(&connection, &planner().to_string()).unwrap();
    connection
        .execute(
            "UPDATE planner_entities SET payload='{}' WHERE kind='blocks'",
            [],
        )
        .unwrap();
    assert!(read(&connection).is_err());
    assert!(initialize(&connection).is_err());
}

#[test]
fn migrated_and_edited_data_survives_a_real_database_reopen() {
    let file = std::env::temp_dir().join(format!(
        "dayframe-migration-{}-{}.db",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    let mut expected = planner();
    {
        let connection = Connection::open(&file).unwrap();
        legacy(&connection, &expected.to_string());
        initialize(&connection).unwrap();
        expected["blocks"][0]["title"] = json!("Persisted after upgrade");
        write(&connection, &expected.to_string()).unwrap();
    }
    {
        let connection = Connection::open(&file).unwrap();
        initialize(&connection).unwrap();
        assert_eq!(loaded(&connection), expected);
    }
    std::fs::remove_file(file).unwrap();
}
