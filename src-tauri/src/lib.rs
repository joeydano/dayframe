mod reminders;
mod store;

use reminders::{Queue, Reminder, Reminders};
use std::{sync::Mutex, time::{Duration, SystemTime, UNIX_EPOCH}};
use store::Store;
use tauri::Manager;
use tauri_plugin_notification::NotificationExt;

#[tauri::command]
fn load_planner(store: tauri::State<Store>) -> Result<Option<String>, String> {
    let connection = store.0.lock().map_err(|e| e.to_string())?;
    store::read(&connection)
}
#[tauri::command]
fn save_planner(payload: String, store: tauri::State<Store>) -> Result<(), String> {
    let connection = store.0.lock().map_err(|e| e.to_string())?;
    store::write(&connection, &payload)
}
#[tauri::command]
fn replace_reminders(jobs: Vec<Reminder>, reminders: tauri::State<Reminders>) -> Result<(), String> {
    if jobs.len() > 20000 || jobs.iter().any(|j| j.title.len() > 1000 || j.body.len() > 1000 || j.id.len() > 200) {
        return Err("Reminder queue exceeds its limits.".into());
    }
    reminders.0.lock().map_err(|e| e.to_string())?.jobs = jobs;
    Ok(())
}
#[tauri::command]
fn reminder_status(reminders: tauri::State<Reminders>) -> Result<serde_json::Value, String> {
    let queue = reminders.0.lock().map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "queued": queue.jobs.len(), "delivered": queue.sent.len(), "lastError": queue.last_error }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _, _| {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    }));
    builder
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let directory = app.path().app_data_dir()?;
            std::fs::create_dir_all(&directory)?;
            let connection = rusqlite::Connection::open(directory.join("dayframe.db"))?;
            store::initialize(&connection).map_err(std::io::Error::other)?;
            app.manage(Store(Mutex::new(connection)));
            app.manage(Reminders(Mutex::new(Queue::default())));
            let handle = app.handle().clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_secs(15));
                let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
                let state = handle.state::<Reminders>();
                if let Ok(mut queue) = state.0.lock() {
                    for job in queue.due(now) {
                        match handle.notification().builder().title(&job.title).body(&job.body).show() {
                            Ok(_) => { queue.sent.insert(job.id, job.at); queue.last_error = None; }
                            Err(error) => { queue.last_error = Some(error.to_string()); }
                        }
                    }
                };
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![load_planner, save_planner, replace_reminders, reminder_status])
        .run(tauri::generate_context!())
        .expect("could not start Dayframe");
}
