import { invoke } from "@tauri-apps/api/core";
import { onVisibilityChange } from "../visibility";
import type { NoteBridge, NoteFile } from "./bridge";

export const tauriBridge: NoteBridge = {
  readNote: () => invoke<NoteFile>("read_note"),
  writeNote: (content) => invoke<number>("write_note", { content }),
  noteMtime: () => invoke<number>("note_mtime"),
  onVisibility: (handler) => {
    const unlisten = onVisibilityChange(handler);
    return () => void unlisten();
  },
};
