use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde_json::{Map, Value};
use std::{
    collections::HashSet,
    sync::{Mutex, MutexGuard},
};

pub struct Store {
    connection: Mutex<Connection>,
    initialization_error: Option<String>,
}

impl Store {
    pub fn new(connection: Connection) -> Self {
        let initialization_error = initialize(&connection).err();
        Self {
            connection: Mutex::new(connection),
            initialization_error,
        }
    }

    pub fn lock(&self) -> Result<MutexGuard<'_, Connection>, String> {
        if let Some(error) = &self.initialization_error {
            return Err(error.clone());
        }
        self.connection.lock().map_err(|e| e.to_string())
    }
}
pub const MAX_BYTES: usize = 5 * 1024 * 1024;
const DATABASE_VERSION: i64 = 2;
const KINDS: [&str; 3] = ["categories", "blocks", "templates"];

fn database_version(connection: &Connection) -> Result<i64, String> {
    connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|e| e.to_string())
}

fn require_current_version(connection: &Connection) -> Result<(), String> {
    match database_version(connection)? {
        DATABASE_VERSION => Ok(()),
        version if version > DATABASE_VERSION => {
            Err("This database was created by a newer Dayframe version.".into())
        }
        _ => Err("The planner database must be initialized before use.".into()),
    }
}

// The public planner/backup format remains version 1. Only SQLite's internal
// schema changes here; recurrence and local wall-clock semantics are unchanged.
fn parse_document(payload: &str) -> Result<Value, String> {
    if payload.len() > MAX_BYTES {
        return Err("Planner exceeds the 5 MB limit.".into());
    }
    let data: Value = serde_json::from_str(payload).map_err(|e| e.to_string())?;
    if data.get("schemaVersion").and_then(Value::as_u64) != Some(1)
        || !data.get("preferences").is_some_and(Value::is_object)
    {
        return Err("Unsupported planner document.".into());
    }
    for (kind, limit) in [("categories", 30), ("blocks", 10000), ("templates", 100)] {
        let items = data
            .get(kind)
            .and_then(Value::as_array)
            .ok_or_else(|| format!("Invalid planner {kind}."))?;
        if items.len() > limit || (kind == "categories" && items.is_empty()) {
            return Err(format!("Invalid number of {kind}."));
        }
        let mut ids = HashSet::new();
        for item in items {
            let id = item
                .get("id")
                .and_then(Value::as_str)
                .filter(|id| !id.is_empty() && id.len() <= 128)
                .ok_or_else(|| format!("Invalid {kind} ID."))?;
            if !ids.insert(id) {
                return Err(format!("Duplicate {kind} IDs."));
            }
        }
    }
    let categories: HashSet<&str> = data["categories"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| item["id"].as_str().unwrap())
        .collect();
    let check_category = |block: &Value| -> Result<(), String> {
        if !block
            .get("categoryId")
            .and_then(Value::as_str)
            .is_some_and(|id| categories.contains(id))
        {
            return Err("A block refers to an unknown category.".into());
        }
        Ok(())
    };
    for block in data["blocks"].as_array().unwrap() {
        check_category(block)?;
    }
    for template in data["templates"].as_array().unwrap() {
        let blocks = template
            .get("blocks")
            .and_then(Value::as_array)
            .filter(|blocks| !blocks.is_empty() && blocks.len() <= 96)
            .ok_or("Invalid template blocks.")?;
        for block in blocks {
            check_category(block)?;
        }
    }
    Ok(data)
}

pub fn initialize(connection: &Connection) -> Result<(), String> {
    let version = database_version(connection)?;
    if version > DATABASE_VERSION {
        return Err("This database was created by a newer Dayframe version.".into());
    }
    if version == DATABASE_VERSION {
        // Do not recreate missing tables or replace corrupt state with defaults.
        read(connection)?;
        return Ok(());
    }
    let legacy_exists: bool = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='planner')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if version == 1 && !legacy_exists {
        return Err(
            "The existing planner table is missing. Restore a backup before continuing.".into(),
        );
    }
    connection
        .execute_batch("PRAGMA journal_mode=WAL;")
        .map_err(|e| e.to_string())?;
    let transaction = connection
        .unchecked_transaction()
        .map_err(|e| e.to_string())?;
    let legacy: Option<String> = if legacy_exists {
        transaction
            .query_row("SELECT payload FROM planner WHERE id=1", [], |row| {
                row.get(0)
            })
            .optional()
            .map_err(|e| e.to_string())?
    } else {
        None
    };
    // Validate before changing the schema. The original bytes are retained in
    // planner_v1_backup, in the same transaction as migration and version update.
    let data = legacy.as_deref().map(parse_document).transpose()?;
    transaction
        .execute_batch(
            "CREATE TABLE planner_state (
            id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL,
            revision INTEGER NOT NULL CHECK(revision>=1)
         );
         CREATE TABLE planner_entities (
            kind TEXT NOT NULL CHECK(kind IN ('categories','blocks','templates')),
            entity_id TEXT NOT NULL, payload TEXT, sort_order INTEGER,
            revision INTEGER NOT NULL CHECK(revision>=1),
            deleted INTEGER NOT NULL CHECK(deleted IN (0,1)),
            PRIMARY KEY(kind, entity_id),
            CHECK((deleted=0 AND payload IS NOT NULL AND sort_order IS NOT NULL AND sort_order>=0)
               OR (deleted=1 AND payload IS NULL AND sort_order IS NULL))
         );",
        )
        .map_err(|e| e.to_string())?;
    if let Some(data) = data {
        replace_document(&transaction, &data)?;
    }
    if legacy_exists {
        transaction
            .execute_batch("ALTER TABLE planner RENAME TO planner_v1_backup;")
            .map_err(|e| e.to_string())?;
    }
    transaction
        .pragma_update(None, "user_version", DATABASE_VERSION)
        .map_err(|e| e.to_string())?;
    transaction.commit().map_err(|e| e.to_string())
}

pub fn read(connection: &Connection) -> Result<Option<String>, String> {
    require_current_version(connection)?;
    // One read transaction prevents a mixed snapshot if another connection writes.
    let transaction = connection
        .unchecked_transaction()
        .map_err(|e| e.to_string())?;
    let metadata: Option<String> = transaction
        .query_row("SELECT payload FROM planner_state WHERE id=1", [], |row| {
            row.get(0)
        })
        .optional()
        .map_err(|e| e.to_string())?;
    let Some(metadata) = metadata else {
        let count: i64 = transaction
            .query_row("SELECT COUNT(*) FROM planner_entities", [], |row| {
                row.get(0)
            })
            .map_err(|e| e.to_string())?;
        if count != 0 {
            return Err("Planner metadata is missing; saved records have not been changed.".into());
        }
        return Ok(None);
    };
    let mut document: Map<String, Value> =
        serde_json::from_str(&metadata).map_err(|e| e.to_string())?;
    for kind in KINDS {
        let mut statement = transaction
            .prepare(
                "SELECT entity_id, payload, sort_order FROM planner_entities
             WHERE kind=?1 AND deleted=0 ORDER BY sort_order, entity_id",
            )
            .map_err(|e| e.to_string())?;
        let rows = statement
            .query_map([kind], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)?,
                ))
            })
            .map_err(|e| e.to_string())?;
        let mut items = Vec::new();
        for (index, row) in rows.enumerate() {
            let (id, payload, position) = row.map_err(|e| e.to_string())?;
            let item: Value = serde_json::from_str(&payload).map_err(|e| e.to_string())?;
            if item.get("id").and_then(Value::as_str) != Some(id.as_str())
                || position != index as i64
            {
                return Err(format!(
                    "Invalid saved {kind} record. Your data has not been changed."
                ));
            }
            items.push(item);
        }
        document.insert(kind.to_string(), Value::Array(items));
    }
    let payload = serde_json::to_string(&document).map_err(|e| e.to_string())?;
    parse_document(&payload)?;
    transaction.commit().map_err(|e| e.to_string())?;
    Ok(Some(payload))
}

fn replace_document(transaction: &Transaction<'_>, data: &Value) -> Result<(), String> {
    for kind in KINDS {
        let items = data[kind].as_array().unwrap();
        let ids: HashSet<&str> = items
            .iter()
            .map(|item| item["id"].as_str().unwrap())
            .collect();
        let mut statement = transaction
            .prepare("SELECT entity_id FROM planner_entities WHERE kind=?1 AND deleted=0")
            .map_err(|e| e.to_string())?;
        let existing: Vec<String> = statement
            .query_map([kind], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<_, _>>()
            .map_err(|e| e.to_string())?;
        for id in existing {
            if !ids.contains(id.as_str()) {
                // Keep identity/revision only, not deleted titles or notes.
                transaction
                    .execute(
                        "UPDATE planner_entities SET payload=NULL, sort_order=NULL,
                     deleted=1, revision=revision+1 WHERE kind=?1 AND entity_id=?2",
                        params![kind, id],
                    )
                    .map_err(|e| e.to_string())?;
            }
        }
        for (position, item) in items.iter().enumerate() {
            let payload = serde_json::to_string(item).map_err(|e| e.to_string())?;
            transaction.execute(
                "INSERT INTO planner_entities(kind, entity_id, payload, sort_order, revision, deleted)
                 VALUES(?1, ?2, ?3, ?4, 1, 0)
                 ON CONFLICT(kind, entity_id) DO UPDATE SET
                    payload=excluded.payload, sort_order=excluded.sort_order, deleted=0,
                    revision=planner_entities.revision+1
                 WHERE planner_entities.payload IS NOT excluded.payload
                    OR planner_entities.sort_order IS NOT excluded.sort_order
                    OR planner_entities.deleted=1",
                params![kind, item["id"].as_str().unwrap(), payload, position as i64],
            ).map_err(|e| e.to_string())?;
        }
    }
    let mut metadata = data.as_object().unwrap().clone();
    for kind in KINDS {
        metadata.remove(kind);
    }
    transaction
        .execute(
            "INSERT INTO planner_state(id, payload, revision) VALUES(1, ?1, 1)
         ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, revision=planner_state.revision+1
         WHERE planner_state.payload IS NOT excluded.payload",
            [serde_json::to_string(&metadata).map_err(|e| e.to_string())?],
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn write(connection: &Connection, payload: &str) -> Result<(), String> {
    require_current_version(connection)?;
    let data = parse_document(payload)?;
    let transaction = connection
        .unchecked_transaction()
        .map_err(|e| e.to_string())?;
    replace_document(&transaction, &data)?;
    transaction.commit().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests;
