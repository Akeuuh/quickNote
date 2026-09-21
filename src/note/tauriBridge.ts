import { invoke } from "@tauri-apps/api/core";
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
  onVisibility: (handler) => {
    const unlisten = onVisibilityChange(handler);
    return () => void unlisten();
  },
};
