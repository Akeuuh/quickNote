use std::{fs, io, path::PathBuf, sync::Mutex};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::{atomic_write::atomic_write, geometry::Rect};

const FILE_NAME: &str = "preferences.json";

#[derive(Default, Serialize, Deserialize)]
#[serde(default)]
pub struct Preferences {
    pub window: Option<Rect>,
}

pub struct PreferencesStore {
    path: PathBuf,
    prefs: Mutex<Preferences>,
}

impl PreferencesStore {
    pub fn load(app: &AppHandle) -> tauri::Result<Self> {
        let path = app.path().app_config_dir()?.join(FILE_NAME);
        let prefs = match fs::read_to_string(&path) {
            Ok(json) => serde_json::from_str(&json).unwrap_or_else(|e| {
                eprintln!("preferences: {} illisible, valeurs par défaut: {e}", path.display());
                Preferences::default()
            }),
            Err(_) => Preferences::default(),
        };
        Ok(Self {
            path,
            prefs: Mutex::new(prefs),
        })
    }

    pub fn read<T>(&self, f: impl FnOnce(&Preferences) -> T) -> T {
        f(&self.prefs.lock().expect("preferences lock"))
    }

    pub fn update(&self, f: impl FnOnce(&mut Preferences)) -> io::Result<()> {
        let mut prefs = self.prefs.lock().expect("preferences lock");
        f(&mut prefs);
        let json = serde_json::to_string_pretty(&*prefs)?;
        atomic_write(&self.path, &json)
    }
}
