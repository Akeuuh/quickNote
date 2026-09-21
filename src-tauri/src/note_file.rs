use std::{
    fs, io,
    path::{Path, PathBuf},
    sync::Mutex,
    time::UNIX_EPOCH,
};

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::atomic_write::atomic_write;

pub const DEFAULT_FILE_NAME: &str = "note.excalidraw";

pub struct NotePath(pub Mutex<PathBuf>);

impl NotePath {
    pub fn default_for(app: &AppHandle) -> tauri::Result<Self> {
        let dir = app.path().app_data_dir()?;
        Ok(Self(Mutex::new(dir.join(DEFAULT_FILE_NAME))))
    }

    fn get(&self) -> PathBuf {
        self.0.lock().expect("note path lock").clone()
    }
}

#[derive(Serialize)]
pub struct NoteFile {
    content: Option<String>,
    mtime: u64,
}

fn mtime_ms(path: &Path) -> io::Result<u64> {
    let modified = fs::metadata(path)?.modified()?;
    Ok(modified
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0))
}

fn mtime_ms_or_absent(path: &Path) -> io::Result<u64> {
    match mtime_ms(path) {
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(0),
        other => other,
    }
}

fn read(path: &Path) -> io::Result<NoteFile> {
    match fs::read_to_string(path) {
        Ok(content) => Ok(NoteFile {
            content: Some(content),
            mtime: mtime_ms(path)?,
        }),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(NoteFile {
            content: None,
            mtime: 0,
        }),
        Err(e) => Err(e),
    }
}

fn write(path: &Path, content: &str) -> io::Result<u64> {
    atomic_write(path, content)?;
    mtime_ms(path)
}

#[tauri::command]
pub fn read_note(note_path: State<NotePath>) -> Result<NoteFile, String> {
    read(&note_path.get()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_note(note_path: State<NotePath>, content: String) -> Result<u64, String> {
    write(&note_path.get(), &content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn note_mtime(note_path: State<NotePath>) -> Result<u64, String> {
    mtime_ms_or_absent(&note_path.get()).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_path(test: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("quicknote-{}-{test}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        dir.join("nested").join(DEFAULT_FILE_NAME)
    }

    #[test]
    fn absent_file_reads_as_empty_without_creating_it() {
        let path = temp_path("absent");
        let file = read(&path).unwrap();
        assert_eq!(file.content, None);
        assert_eq!(file.mtime, 0);
        assert!(!path.exists());
    }

    #[test]
    fn write_creates_parent_dirs_and_round_trips() {
        let path = temp_path("write");
        let mtime = write(&path, "{}").unwrap();
        let file = read(&path).unwrap();
        assert_eq!(file.content.as_deref(), Some("{}"));
        assert_eq!(file.mtime, mtime);
        assert!(mtime > 0);
        assert_eq!(fs::read_dir(path.parent().unwrap()).unwrap().count(), 1);
        let _ = fs::remove_dir_all(path.parent().unwrap().parent().unwrap());
    }
}
