import type { NoteBridge } from "./bridge";
import type { View } from "./view";

export interface NoteSessionHandlers {
  onReload(content: string | null): void;
  onView(view: View): void;
  currentView(): View;
  onError(message: string): void;
}

export const AUTO_SAVE_DELAY_MS = 500;

export class NoteSession {
  private knownMtime = 0;
  private lastWritten: string | null = null;
  private pending: (() => string) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly bridge: NoteBridge,
    private readonly handlers: NoteSessionHandlers,
  ) {}

  async load(): Promise<string | null> {
    try {
      const { content, mtime } = await this.bridge.readNote();
      this.knownMtime = mtime;
      this.lastWritten = content;
      return content;
    } catch (error) {
      this.handlers.onError(String(error));
      return null;
    }
  }

  start(): () => void {
    void this.restoreView();
    const stopPathRequests = this.bridge.onNotePathRequested((path) => void this.switchFile(path));
    const stopVisibility = this.bridge.onVisibility((state) => {
      if (state === "hidden") {
        void this.saveView();
        void this.flush();
      } else {
        void this.enqueue(async () => {
          await this.reloadIfChangedOnDisk();
          await this.restoreView();
        });
      }
    });
    return () => {
      stopPathRequests();
      stopVisibility();
    };
  }

  switchFile(path: string): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    return this.enqueue(async () => {
      await this.write();
      if (this.pending) return;
      try {
        await this.bridge.setNotePath(path);
        const { content, mtime } = await this.bridge.readNote();
        this.knownMtime = mtime;
        this.lastWritten = content;
        this.handlers.onReload(content);
      } catch (error) {
        this.handlers.onError(String(error));
      }
    });
  }

  private async saveView(): Promise<void> {
    try {
      await this.bridge.writeView(this.handlers.currentView());
    } catch (error) {
      this.handlers.onError(String(error));
    }
  }

  private async restoreView(): Promise<void> {
    try {
      const view = await this.bridge.readView();
      if (view) this.handlers.onView(view);
    } catch (error) {
      this.handlers.onError(String(error));
    }
  }

  onChange(serialize: () => string): void {
    this.pending = serialize;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), AUTO_SAVE_DELAY_MS);
  }

  flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    return this.enqueue(() => this.write());
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    this.queue = this.queue.then(task, task);
    return this.queue;
  }

  private async write(): Promise<void> {
    const serialize = this.pending;
    if (!serialize) return;
    const content = serialize();
    this.pending = null;
    if (content === this.lastWritten) return;
    try {
      this.knownMtime = await this.bridge.writeNote(content);
      this.lastWritten = content;
    } catch (error) {
      this.pending ??= serialize;
      this.handlers.onError(String(error));
    }
  }

  private async reloadIfChangedOnDisk(): Promise<void> {
    if (this.pending) return;
    try {
      const mtime = await this.bridge.noteMtime();
      if (mtime <= this.knownMtime) return;
      const file = await this.bridge.readNote();
      if (file.content === null || this.pending) return;
      this.knownMtime = file.mtime;
      this.lastWritten = file.content;
      this.handlers.onReload(file.content);
    } catch (error) {
      this.handlers.onError(String(error));
    }
  }
}
