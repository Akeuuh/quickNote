import type { Visibility } from "../visibility";
import type { View } from "./view";

export interface NoteFile {
  content: string | null;
  mtime: number;
}

export interface NoteBridge {
  readNote(): Promise<NoteFile>;
  writeNote(content: string): Promise<number>;
  noteMtime(): Promise<number>;
  readView(): Promise<View | null>;
  writeView(view: View): Promise<void>;
  hideNote(): Promise<void>;
  setNotePath(path: string): Promise<void>;
  onNotePathRequested(handler: (path: string) => void): () => void;
  onVisibility(handler: (state: Visibility) => void): () => void;
}
