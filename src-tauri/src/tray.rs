use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle,
};

use crate::{note_window, settings, updater};

const TRAY_ID: &str = "main";
const SHOW_NOTE: &str = "show-note";
const PREFERENCES: &str = "preferences";
const UPDATE: &str = "update";
const QUIT: &str = "quit";

fn build_menu(app: &AppHandle, update_version: Option<&str>) -> tauri::Result<Menu<tauri::Wry>> {
    let menu = Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, SHOW_NOTE, "Afficher la Note", true, None::<&str>)?,
            &MenuItem::with_id(app, PREFERENCES, "Préférences…", true, None::<&str>)?,
        ],
    )?;
    if let Some(version) = update_version {
        menu.append(&PredefinedMenuItem::separator(app)?)?;
        menu.append(&MenuItem::with_id(
            app,
            UPDATE,
            format!("Mise à jour disponible (v{version})"),
            true,
            None::<&str>,
        )?)?;
    }
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    menu.append(&MenuItem::with_id(app, QUIT, "Quitter", true, None::<&str>)?)?;
    Ok(menu)
}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    TrayIconBuilder::with_id(TRAY_ID)
        .icon(app.default_window_icon().cloned().expect("window icon"))
        .icon_as_template(true)
        .menu(&build_menu(app, None)?)
        .on_menu_event(|app, event| match event.id().as_ref() {
            SHOW_NOTE => note_window::log_failure(note_window::show(app)),
            PREFERENCES => note_window::log_failure(settings::open_window(app)),
            UPDATE => updater::install_and_restart(app.clone()),
            QUIT => note_window::hide_then_quit(app.clone()),
            _ => {}
        })
        .build(app)?;
    Ok(())
}

pub fn show_update(app: &AppHandle, version: &str) -> tauri::Result<()> {
    let tray = app.tray_by_id(TRAY_ID).ok_or(tauri::Error::WindowNotFound)?;
    tray.set_menu(Some(build_menu(app, Some(version))?))
}
