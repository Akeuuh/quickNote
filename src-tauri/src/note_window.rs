use std::time::Duration;

use objc2::MainThreadMarker;
use objc2_app_kit::{NSApplication, NSWindow, NSWindowCollectionBehavior};
use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, PhysicalPosition, PhysicalSize,
    WebviewWindow,
};

use crate::{
    geometry::{self, Rect, Screen},
    preferences::PreferencesStore,
};

pub const SHORTCUT: &str = "Alt+Cmd+N";
pub const SHOWN: &str = "shown";
pub const HIDDEN: &str = "hidden";

const LABEL: &str = "main";
const BLUR_SETTLE: Duration = Duration::from_millis(50);
const QUIT_FLUSH_GRACE: Duration = Duration::from_millis(300);

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
    log_failure(restore_geometry(app, &window));
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
    log_failure(remember_geometry(app, &window));
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

pub fn hide_then_quit(app: AppHandle) {
    let _ = hide(&app);
    std::thread::spawn(move || {
        std::thread::sleep(QUIT_FLUSH_GRACE);
        app.exit(0);
    });
}

pub fn log_failure(result: tauri::Result<()>) {
    if let Err(error) = result {
        eprintln!("note window: {error}");
    }
}

fn logical_rect(position: PhysicalPosition<i32>, size: PhysicalSize<u32>, scale: f64) -> Rect {
    let position: LogicalPosition<f64> = position.to_logical(scale);
    let size: LogicalSize<f64> = size.to_logical(scale);
    Rect::new(
        position.x.round() as i32,
        position.y.round() as i32,
        size.width.round() as u32,
        size.height.round() as u32,
    )
}

fn restore_geometry(app: &AppHandle, window: &WebviewWindow) -> tauri::Result<()> {
    let screens: Vec<Screen> = app
        .available_monitors()?
        .iter()
        .map(|m| {
            let area = m.work_area();
            Screen {
                bounds: logical_rect(*m.position(), *m.size(), m.scale_factor()),
                work_area: logical_rect(area.position, area.size, m.scale_factor()),
            }
        })
        .collect();
    let primary_scale = app.primary_monitor()?.map(|m| m.scale_factor()).unwrap_or(1.0);
    let cursor: LogicalPosition<f64> = app.cursor_position()?.to_logical(primary_scale);
    let remembered = app.state::<PreferencesStore>().read(|p| p.window);
    let Some(rect) = geometry::place(remembered, &screens, (cursor.x as i32, cursor.y as i32))
    else {
        return Ok(());
    };
    window.set_position(LogicalPosition::new(rect.x, rect.y))?;
    window.set_size(LogicalSize::new(rect.width, rect.height))
}

fn remember_geometry(app: &AppHandle, window: &WebviewWindow) -> tauri::Result<()> {
    let rect = logical_rect(
        window.outer_position()?,
        window.outer_size()?,
        window.scale_factor()?,
    );
    app.state::<PreferencesStore>()
        .update(|p| p.window = Some(rect))
        .map_err(Into::into)
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
