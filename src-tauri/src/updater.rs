use std::{sync::Mutex, time::Duration};

use tauri::{AppHandle, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::{note_window, tray};

const CHECK_INTERVAL: Duration = Duration::from_secs(24 * 60 * 60);
const RESTART_FLUSH_GRACE: Duration = Duration::from_millis(500);

#[derive(Default)]
pub struct AvailableUpdate(Mutex<Option<Update>>);

pub fn start_periodic_checks(app: AppHandle) {
    app.manage(AvailableUpdate::default());
    std::thread::spawn(move || loop {
        tauri::async_runtime::block_on(check(&app));
        std::thread::sleep(CHECK_INTERVAL);
    });
}

async fn check(app: &AppHandle) {
    let update = match app.updater() {
        Ok(updater) => updater.check().await,
        Err(e) => Err(e),
    };
    match update {
        Ok(Some(update)) => {
            let version = update.version.clone();
            *app.state::<AvailableUpdate>().0.lock().expect("update lock") = Some(update);
            note_window::log_failure(tray::show_update(app, &version));
        }
        Ok(None) => {}
        Err(e) => eprintln!("updater: check failed: {e}"),
    }
}

pub fn install_and_restart(app: AppHandle) {
    let update = app.state::<AvailableUpdate>().0.lock().expect("update lock").take();
    let Some(update) = update else { return };
    tauri::async_runtime::spawn(async move {
        if let Err(e) = update.download_and_install(|_, _| {}, || {}).await {
            eprintln!("updater: install failed: {e}");
            *app.state::<AvailableUpdate>().0.lock().expect("update lock") = Some(update);
            return;
        }
        note_window::log_failure(note_window::hide(&app));
        std::thread::sleep(RESTART_FLUSH_GRACE);
        app.restart();
    });
}
