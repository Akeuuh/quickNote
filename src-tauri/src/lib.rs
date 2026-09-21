mod note_window;
mod tray;

use tauri::{ActivationPolicy, Manager, WindowEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

fn log_failure(result: tauri::Result<()>) {
    if let Err(error) = result {
        eprintln!("note window: {error}");
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            app.set_activation_policy(ActivationPolicy::Accessory);
            tray::setup(app.handle())?;
            note_window::join_all_spaces(app.handle())?;

            app.global_shortcut()
                .on_shortcut(note_window::SHORTCUT, |app, _, event| {
                    if event.state == ShortcutState::Pressed {
                        log_failure(note_window::toggle(app));
                    }
                })?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, WindowEvent::Focused(false)) && note_window::is_note(window) {
                note_window::hide_if_app_deactivated(window.app_handle().clone(), log_failure);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    #[test]
    fn toolchain_runs_tests() {
        assert_eq!(1 + 1, 2);
    }
}
