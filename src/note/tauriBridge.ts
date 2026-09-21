import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { NOTE_PATH_REQUESTED } from "../events";
import { onVisibilityChange } from "../visibility";
import type { NoteBridge, NoteFile } from "./bridge";
import type { View } from "./view";

export const tauriBridge: NoteBridge = {
  readNote: () => invoke<NoteFile>("read_note"),
  writeNote: (content) => invoke<number>("write_note", { content }),
  noteMtime: () => invoke<number>("note_mtime"),
  readView: () => invoke<View | null>("get_view"),
  writeView: (view) => invoke("set_view", { view }),
  hideNote: () => invoke("hide_note"),
  setNotePath: (path) => invoke("set_note_path", { path }),
  onNotePathRequested: (handler) => {
    const unlisten = listen<string>(NOTE_PATH_REQUESTED, (event) => handler(event.payload));
    return () => void unlisten.then((fn) => fn());
  },
  onVisibility: (handler) => {
    const unlisten = onVisibilityChange(handler);
    return () => void unlisten();
  },
};
