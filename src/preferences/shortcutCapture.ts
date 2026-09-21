const MODIFIER_CODES = new Set([
  "MetaLeft",
  "MetaRight",
  "AltLeft",
  "AltRight",
  "ControlLeft",
  "ControlRight",
  "ShiftLeft",
  "ShiftRight",
]);

type KeyEventLike = Pick<KeyboardEvent, "code" | "metaKey" | "altKey" | "ctrlKey" | "shiftKey">;

export function shortcutFromKeyboardEvent(event: KeyEventLike): string | null {
  if (MODIFIER_CODES.has(event.code) || event.code === "") return null;
  if (!event.metaKey && !event.altKey && !event.ctrlKey) return null;
  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.metaKey) parts.push("Cmd");
  parts.push(keyName(event.code));
  return parts.join("+");
}

function keyName(code: string): string {
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1];
  const digit = /^Digit([0-9])$/.exec(code);
  if (digit) return digit[1];
  return code;
}

const SYMBOLS: Record<string, string> = { Ctrl: "⌃", Alt: "⌥", Shift: "⇧", Cmd: "⌘" };

export function formatShortcut(shortcut: string): string {
  return shortcut
    .split("+")
    .map((part) => SYMBOLS[part] ?? part)
    .join("");
}
