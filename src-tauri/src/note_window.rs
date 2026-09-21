use std::time::Duration;

use objc2::MainThreadMarker;
use objc2_app_kit::{NSApplication, NSWindow, NSWindowCollectionBehavior};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

pub const SHORTCUT: &str = "Alt+Cmd+N";
pub const SHOWN: &str = "shown";
pub const HIDDEN: &str = "hidden";

const LABEL: &str = "main";
const BLUR_SETTLE: Duration = Duration::from_millis(50);

pub fn is_note(window: &tauri::Window) -> bool {
    window.label() == LABEL
}

fn window(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    app.get_webview_window(LABEL)
        .ok_or(tauri::Error::WindowNotFound)
}

fn ns_window(window: &WebviewWindow) -> tauri::Result<&NSWindow> {
    let ptr = window.ns_window()?;
    Ok(unsafe { &*(ptr as *const NSWindow) })
}

pub fn show(app: &AppHandle) -> tauri::Result<()> {
    let window = window(app)?;
    if window.is_visible()? {
        return window.set_focus();
    }
    app.show()?;
    window.show()?;
    window.set_focus()?;
    ns_window(&window)?.invalidateShadow();
    app.emit(SHOWN, ())
}

pub fn hide(app: &AppHandle) -> tauri::Result<()> {
    let window = window(app)?;
    if !window.is_visible()? {
        return Ok(());
    }
    window.hide()?;
    app.hide()?;
    app.emit(HIDDEN, ())
}

pub fn toggle(app: &AppHandle) -> tauri::Result<()> {
    if window(app)?.is_visible()? {
        hide(app)
    } else {
        show(app)
    }
}

pub fn hide_if_app_deactivated(app: AppHandle, on_failure: fn(tauri::Result<()>)) {
    std::thread::spawn(move || {
        std::thread::sleep(BLUR_SETTLE);
        let _ = app.clone().run_on_main_thread(move || {
            let mtm = MainThreadMarker::new().expect("main thread");
            if !NSApplication::sharedApplication(mtm).isActive() {
                on_failure(hide(&app));
            }
        });
    });
}

pub fn join_all_spaces(app: &AppHandle) -> tauri::Result<()> {
    let window = window(app)?;
    let ns_window = ns_window(&window)?;
    let behavior = ns_window.collectionBehavior()
        | NSWindowCollectionBehavior::CanJoinAllSpaces
        | NSWindowCollectionBehavior::FullScreenAuxiliary;
    ns_window.setCollectionBehavior(behavior);
    Ok(())
}
