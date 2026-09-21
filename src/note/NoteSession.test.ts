import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { NoteBridge, NoteFile } from "./bridge";
import type { Visibility } from "../visibility";
import type { View } from "./view";
import { AUTO_SAVE_DELAY_MS, NoteSession } from "./NoteSession";

class FakeBridge implements NoteBridge {
  content: string | null = null;
  mtime = 0;
  writes: string[] = [];
  readError: Error | null = null;
  writeError: Error | null = null;
  writeGate: Promise<void> | null = null;
  readGate: (() => void) | null = null;
  view: View | null = null;
  private handlers = new Set<(state: Visibility) => void>();

  async readNote(): Promise<NoteFile> {
    if (this.readError) throw this.readError;
    this.readGate?.();
    this.readGate = null;
    return { content: this.content, mtime: this.mtime };
  }

  async writeNote(content: string): Promise<number> {
    if (this.writeError) throw this.writeError;
    if (this.writeGate) {
      await this.writeGate;
      this.writeGate = null;
    }
    this.content = content;
    this.mtime += 1;
    this.writes.push(content);
    return this.mtime;
  }

  async noteMtime(): Promise<number> {
    return this.mtime;
  }

  async readView(): Promise<View | null> {
    return this.view;
  }

  async writeView(view: View): Promise<void> {
    this.view = view;
  }

  async hideNote(): Promise<void> {}

  onVisibility(handler: (state: Visibility) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  editOnDisk(content: string): void {
    this.content = content;
    this.mtime += 1;
  }

  async emit(state: Visibility): Promise<void> {
    this.handlers.forEach((h) => h(state));
    await vi.advanceTimersByTimeAsync(0);
  }
}

const VIEW: View = { scrollX: 10, scrollY: -20, zoom: 1.5 };

let bridge: FakeBridge;
let onReload: Mock<(content: string) => void>;
let onView: Mock<(view: View) => void>;
let currentView: View;
let onError: Mock<(message: string) => void>;
let session: NoteSession;

beforeEach(() => {
  vi.useFakeTimers();
  bridge = new FakeBridge();
  onReload = vi.fn();
  onView = vi.fn();
  onError = vi.fn();
  currentView = VIEW;
  session = new NoteSession(bridge, {
    onReload,
    onView,
    currentView: () => currentView,
    onError,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("load", () => {
  it("returns null when the Fichier de Note is absent", async () => {
    expect(await session.load()).toBeNull();
    expect(bridge.writes).toEqual([]);
  });

  it("returns the disk content when present", async () => {
    bridge.editOnDisk("disk");
    expect(await session.load()).toBe("disk");
  });

  it("reports an unreadable file without throwing", async () => {
    bridge.readError = new Error("corrompu");
    expect(await session.load()).toBeNull();
    expect(onError).toHaveBeenCalledWith("Error: corrompu");
  });
});

describe("auto-save", () => {
  it("writes once after a burst of changes settles", async () => {
    await session.load();
    session.onChange(() => "a");
    await vi.advanceTimersByTimeAsync(AUTO_SAVE_DELAY_MS - 1);
    session.onChange(() => "ab");
    await vi.advanceTimersByTimeAsync(AUTO_SAVE_DELAY_MS - 1);
    expect(bridge.writes).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(bridge.writes).toEqual(["ab"]);
  });

  it("skips the write when the content did not change", async () => {
    bridge.editOnDisk("same");
    await session.load();
    session.onChange(() => "same");
    await vi.advanceTimersByTimeAsync(AUTO_SAVE_DELAY_MS);
    expect(bridge.writes).toEqual([]);
  });

  it("keeps the change pending and reports when the write fails", async () => {
    await session.load();
    bridge.writeError = new Error("disque plein");
    session.onChange(() => "a");
    await vi.advanceTimersByTimeAsync(AUTO_SAVE_DELAY_MS);
    expect(onError).toHaveBeenCalledWith("Error: disque plein");

    bridge.writeError = null;
    await session.flush();
    expect(bridge.writes).toEqual(["a"]);
  });
});

describe("hidden", () => {
  it("flushes pending changes immediately", async () => {
    await session.load();
    session.start();
    session.onChange(() => "a");
    await bridge.emit("hidden");
    expect(bridge.writes).toEqual(["a"]);
  });
});

describe("shown", () => {
  it("reloads when the disk is newer and nothing is pending", async () => {
    bridge.editOnDisk("v1");
    await session.load();
    session.start();
    bridge.editOnDisk("v2");
    await bridge.emit("shown");
    expect(onReload).toHaveBeenCalledWith("v2");
  });

  it("does not reload when the disk did not change", async () => {
    bridge.editOnDisk("v1");
    await session.load();
    session.start();
    await bridge.emit("shown");
    expect(onReload).not.toHaveBeenCalled();
  });

  it("keeps local changes over a newer disk when a change is pending", async () => {
    bridge.editOnDisk("v1");
    await session.load();
    session.start();
    bridge.writeError = new Error("hors ligne");
    session.onChange(() => "local");
    await bridge.emit("hidden");
    bridge.writeError = null;
    bridge.editOnDisk("v2");
    await bridge.emit("shown");
    expect(onReload).not.toHaveBeenCalled();

    await bridge.emit("hidden");
    expect(bridge.content).toBe("local");
  });

  it("waits for an in-flight write instead of reloading it", async () => {
    await session.load();
    session.start();
    let release!: () => void;
    bridge.writeGate = new Promise<void>((resolve) => (release = resolve));
    session.onChange(() => "mine");
    const hidden = bridge.emit("hidden");
    await bridge.emit("shown");
    release();
    await hidden;
    await vi.advanceTimersByTimeAsync(0);
    expect(onReload).not.toHaveBeenCalled();
    expect(bridge.writes).toEqual(["mine"]);
  });

  it("coalesces overlapping flushes into one write of the latest change", async () => {
    await session.load();
    session.start();
    let release!: () => void;
    bridge.writeGate = new Promise<void>((resolve) => (release = resolve));
    session.onChange(() => "first");
    const first = session.flush();
    session.onChange(() => "second");
    const second = session.flush();
    release();
    await Promise.all([first, second]);
    expect(bridge.writes).toEqual(["second"]);
  });

  it("keeps a change made while the reload was reading the disk", async () => {
    bridge.editOnDisk("v1");
    await session.load();
    session.start();
    bridge.editOnDisk("v2");
    bridge.readGate = () => session.onChange(() => "typed");
    await bridge.emit("shown");
    expect(onReload).not.toHaveBeenCalled();
  });

  it("does not reload its own write", async () => {
    await session.load();
    session.start();
    session.onChange(() => "mine");
    await bridge.emit("hidden");
    await bridge.emit("shown");
    expect(onReload).not.toHaveBeenCalled();
  });
});

describe("Vue", () => {
  it("writes the current Vue through the Bridge at hidden", async () => {
    await session.load();
    session.start();
    expect(bridge.view).toBeNull();
    await bridge.emit("hidden");
    expect(bridge.view).toEqual(VIEW);
  });

  it("reads the Vue back at start and at shown", async () => {
    bridge.view = VIEW;
    await session.load();
    currentView = { scrollX: 0, scrollY: 0, zoom: 1 };
    session.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onView).toHaveBeenNthCalledWith(1, VIEW);
    await bridge.emit("shown");
    expect(onView).toHaveBeenCalledTimes(2);
    expect(onView).toHaveBeenNthCalledWith(2, VIEW);
  });

  it("restores the Vue only after the disk reload at shown", async () => {
    bridge.editOnDisk("v1");
    bridge.view = VIEW;
    await session.load();
    session.start();
    await vi.advanceTimersByTimeAsync(0);
    onView.mockImplementation(() => session.onChange(() => "v1"));
    bridge.editOnDisk("v2");
    await bridge.emit("shown");
    expect(onReload).toHaveBeenCalledWith("v2");
    expect(onView).toHaveBeenCalledTimes(2);
  });

  it("does nothing at start without a stored Vue", async () => {
    await session.load();
    session.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onView).not.toHaveBeenCalled();
  });
});
