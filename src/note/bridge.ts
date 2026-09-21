import type { Visibility } from "../visibility";

export interface NoteFile {
  content: string | null;
  mtime: number;
}

export interface NoteBridge {
  readNote(): Promise<NoteFile>;
  writeNote(content: string): Promise<number>;
  noteMtime(): Promise<number>;
  onVisibility(handler: (state: Visibility) => void): () => void;
}
