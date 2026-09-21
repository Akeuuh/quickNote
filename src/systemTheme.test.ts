import { afterEach, describe, expect, it, vi } from "vitest";
import { getSystemTheme, subscribeSystemTheme } from "./systemTheme";

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", () => ({
    matches,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }));
  return listeners;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("systemTheme", () => {
  it("resolves dark when the system prefers dark", () => {
    stubMatchMedia(true);
    expect(getSystemTheme()).toBe("dark");
  });

  it("resolves light otherwise", () => {
    stubMatchMedia(false);
    expect(getSystemTheme()).toBe("light");
  });

  it("notifies on change and stops after unsubscribe", () => {
    const listeners = stubMatchMedia(false);
    const onChange = vi.fn();
    const unsubscribe = subscribeSystemTheme(onChange);

    listeners.forEach((cb) => cb());
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    listeners.forEach((cb) => cb());
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
