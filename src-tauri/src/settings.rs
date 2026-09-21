use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::{note_file::NotePath, note_window, preferences::PreferencesStore};

pub const DEFAULT_SHORTCUT: &str = "Alt+Cmd+N";
const WINDOW_LABEL: &str = "preferences";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    shortcut: String,
    note_path: PathBuf,
    autostart: bool,
}

pub fn current_shortcut(app: &AppHandle) -> String {
    app.state::<PreferencesStore>()
        .read(|p| p.shortcut.clone())
        .unwrap_or_else(|| DEFAULT_SHORTCUT.to_string())
}

pub fn register_shortcut(app: &AppHandle, shortcut: &str) -> Result<(), tauri_plugin_global_shortcut::Error> {
    app.global_shortcut().on_shortcut(shortcut, |app, _, event| {
        if event.state == ShortcutState::Pressed {
            note_window::log_failure(note_window::toggle(app));
        }
    })
}

pub fn enable_autostart_on_first_launch(app: &AppHandle) {
    let store = app.state::<PreferencesStore>();
    if store.read(|p| p.autostart).is_some() {
        return;
    }
    let enabled = app.autolaunch().enable().is_ok();
    if let Err(e) = store.update(|p| p.autostart = Some(enabled)) {
        eprintln!("preferences: {e}");
    }
}

#[tauri::command]
pub fn get_settings(app: AppHandle, note_path: State<NotePath>) -> Settings {
    Settings {
        shortcut: current_shortcut(&app),
        note_path: note_path.get(),
        autostart: app.autolaunch().is_enabled().unwrap_or(false),
    }
}

#[tauri::command]
pub fn set_shortcut(app: AppHandle, store: State<PreferencesStore>, shortcut: String) -> Result<(), String> {
    let previous = current_shortcut(&app);
    if shortcut == previous {
        return Ok(());
    }
    app.global_shortcut()
        .unregister(previous.as_str())
        .map_err(|e| e.to_string())?;
    if let Err(e) = register_shortcut(&app, &shortcut) {
        if let Err(rollback) = register_shortcut(&app, &previous) {
            eprintln!("shortcut: rollback to {previous} failed: {rollback}");
        }
        return Err(e.to_string());
    }
    store
        .update(|p| p.shortcut = Some(shortcut))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, store: State<PreferencesStore>, enabled: bool) -> Result<(), String> {
    let launcher = app.autolaunch();
    let result = if enabled { launcher.enable() } else { launcher.disable() };
    result.map_err(|e| e.to_string())?;
    store
        .update(|p| p.autostart = Some(enabled))
        .map_err(|e| e.to_string())
}

pub fn open_window(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(WINDOW_LABEL) {
        return window.set_focus();
    }
    let window = WebviewWindowBuilder::new(app, WINDOW_LABEL, WebviewUrl::App("preferences.html".into()))
        .title("Préférences")
        .inner_size(480.0, 320.0)
        .resizable(false)
        .build()?;
    window.set_focus()
}
