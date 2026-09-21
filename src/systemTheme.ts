import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function getSystemTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

export function subscribeSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useSystemTheme(): Theme {
  return useSyncExternalStore(subscribeSystemTheme, getSystemTheme);
}
