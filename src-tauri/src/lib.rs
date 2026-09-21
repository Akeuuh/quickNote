mod atomic_write;
mod geometry;
mod note_file;
mod note_window;
mod preferences;
mod settings;
mod tray;

use tauri::{ActivationPolicy, Manager, WindowEvent};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            note_file::read_note,
            note_file::write_note,
            note_file::note_mtime,
            preferences::get_view,
            preferences::set_view,
            note_window::hide_note,
            note_file::set_note_path,
            settings::get_settings,
            settings::set_shortcut,
            settings::set_autostart
        ])
        .setup(|app| {
            app.set_activation_policy(ActivationPolicy::Accessory);
            app.manage(preferences::PreferencesStore::load(app.handle())?);
            app.manage(note_file::NotePath::from_preferences(app.handle())?);
            tray::setup(app.handle())?;
            note_window::join_all_spaces(app.handle())?;
            settings::enable_autostart_on_first_launch(app.handle());
            settings::register_shortcut(app.handle(), &settings::current_shortcut(app.handle()))?;
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
