import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { NOTE_PATH_REQUESTED } from "../events";

export interface Settings {
  shortcut: string;
  notePath: string;
  autostart: boolean;
}

const EXCALIDRAW_FILTER = [{ name: "Excalidraw", extensions: ["excalidraw"] }];

export const preferencesBridge = {
  getSettings: () => invoke<Settings>("get_settings"),
  setShortcut: (shortcut: string) => invoke<void>("set_shortcut", { shortcut }),
  setAutostart: (enabled: boolean) => invoke<void>("set_autostart", { enabled }),
  pickExistingNoteFile: (defaultPath: string) =>
    open({ defaultPath, multiple: false, directory: false, filters: EXCALIDRAW_FILTER }),
  pickNewNoteFile: (defaultPath: string) => save({ defaultPath, filters: EXCALIDRAW_FILTER }),
  requestNotePath: (path: string) => emit(NOTE_PATH_REQUESTED, path),
};
