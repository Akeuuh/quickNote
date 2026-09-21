import { describe, expect, it } from "vitest";
import { formatShortcut, shortcutFromKeyboardEvent } from "./shortcutCapture";

const press = (code: string, mods: Partial<Record<"metaKey" | "altKey" | "ctrlKey" | "shiftKey", boolean>> = {}) => ({
  code,
  metaKey: false,
  altKey: false,
  ctrlKey: false,
  shiftKey: false,
  ...mods,
});

describe("shortcutFromKeyboardEvent", () => {
  it("builds the default Raccourci from Option+Command+N", () => {
    expect(shortcutFromKeyboardEvent(press("KeyN", { altKey: true, metaKey: true }))).toBe("Alt+Cmd+N");
  });

  it("ignores a modifier pressed alone", () => {
    expect(shortcutFromKeyboardEvent(press("MetaLeft", { metaKey: true }))).toBeNull();
  });

  it("rejects a key without Command, Option or Control", () => {
    expect(shortcutFromKeyboardEvent(press("KeyN"))).toBeNull();
    expect(shortcutFromKeyboardEvent(press("KeyN", { shiftKey: true }))).toBeNull();
  });

  it("keeps digits, function keys and orders modifiers", () => {
    expect(shortcutFromKeyboardEvent(press("Digit2", { ctrlKey: true, shiftKey: true }))).toBe("Ctrl+Shift+2");
    expect(shortcutFromKeyboardEvent(press("F6", { metaKey: true }))).toBe("Cmd+F6");
  });
});

describe("formatShortcut", () => {
  it("renders macOS symbols", () => {
    expect(formatShortcut("Alt+Cmd+N")).toBe("⌥⌘N");
    expect(formatShortcut("Ctrl+Shift+Space")).toBe("⌃⇧Space");
  });
});
