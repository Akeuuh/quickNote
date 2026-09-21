use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle,
};

use crate::note_window;

const SHOW_NOTE: &str = "show-note";
const QUIT: &str = "quit";

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let menu = Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, SHOW_NOTE, "Afficher la Note", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, QUIT, "Quitter", true, None::<&str>)?,
        ],
    )?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().cloned().expect("window icon"))
        .icon_as_template(true)
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            SHOW_NOTE => {
                if let Err(error) = note_window::show(app) {
                    eprintln!("note window: {error}");
                }
            }
            QUIT => note_window::hide_then_quit(app.clone()),
            _ => {}
        })
        .build(app)?;
    Ok(())
}
