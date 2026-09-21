mod atomic_write;
mod geometry;
mod note_file;
mod note_window;
mod preferences;
mod tray;

use tauri::{ActivationPolicy, Manager, WindowEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            note_file::read_note,
            note_file::write_note,
            note_file::note_mtime,
            preferences::get_view,
            preferences::set_view,
            note_window::hide_note
        ])
        .setup(|app| {
            app.set_activation_policy(ActivationPolicy::Accessory);
            app.manage(note_file::NotePath::default_for(app.handle())?);
            app.manage(preferences::PreferencesStore::load(app.handle())?);
            tray::setup(app.handle())?;
            note_window::join_all_spaces(app.handle())?;

            app.global_shortcut()
                .on_shortcut(note_window::SHORTCUT, |app, _, event| {
                    if event.state == ShortcutState::Pressed {
                        note_window::log_failure(note_window::toggle(app));
                    }
                })?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, WindowEvent::Focused(false)) && note_window::is_note(window) {
                note_window::hide_if_app_deactivated(
                    window.app_handle().clone(),
                    note_window::log_failure,
                );
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
