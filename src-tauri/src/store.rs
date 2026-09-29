use rusqlite::{Connection, OptionalExtension};
use std::sync::Mutex;

pub struct Store(pub Mutex<Connection>);
pub const MAX_BYTES: usize = 5 * 1024 * 1024;

pub fn initialize(connection: &Connection) -> Result<(), String> {
    let version: i64 = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    if version > 1 {
        return Err("This database was created by a newer Dayframe version.".into());
    }
    connection.execute_batch(
        "PRAGMA journal_mode=WAL;
         CREATE TABLE IF NOT EXISTS planner (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL);
         PRAGMA user_version=1;",
    ).map_err(|e| e.to_string())
}

pub fn read(connection: &Connection) -> Result<Option<String>, String> {
    connection.query_row("SELECT payload FROM planner WHERE id = 1", [], |row| row.get(0))
        .optional().map_err(|e| e.to_string())
}

pub fn write(connection: &Connection, payload: &str) -> Result<(), String> {
    if payload.len() > MAX_BYTES { return Err("Planner exceeds the 5 MB limit.".into()); }
    let data: serde_json::Value = serde_json::from_str(payload).map_err(|e| e.to_string())?;
    if data.get("schemaVersion").and_then(|v| v.as_u64()) != Some(1)
        || !data.get("blocks").is_some_and(|v| v.is_array())
        || !data.get("templates").is_some_and(|v| v.is_array())
        || !data.get("categories").is_some_and(|v| v.is_array())
        || !data.get("preferences").is_some_and(|v| v.is_object()) {
        return Err("Unsupported planner document.".into());
    }
    // A single SQLite statement is atomic, including a complete backup restore.
    connection.execute(
        "INSERT INTO planner(id, payload) VALUES(1, ?1) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
        [payload],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn saves_and_rejects_invalid_replacement_without_losing_data() {
        let connection = Connection::open_in_memory().unwrap();
        initialize(&connection).unwrap();
        assert_eq!(read(&connection).unwrap(), None);
        let valid = r#"{"schemaVersion":1,"blocks":[],"templates":[],"categories":[],"preferences":{}}"#;
        write(&connection, valid).unwrap();
        assert!(write(&connection, "not json").is_err());
        assert!(write(&connection, r#"{"schemaVersion":2}"#).is_err());
        assert_eq!(read(&connection).unwrap().as_deref(), Some(valid));
        initialize(&connection).unwrap();
        assert_eq!(read(&connection).unwrap().as_deref(), Some(valid));
    }
    #[test]
    fn refuses_newer_database() {
        let connection = Connection::open_in_memory().unwrap();
        connection.execute_batch("PRAGMA user_version=2").unwrap();
        assert!(initialize(&connection).is_err());
    }
}
