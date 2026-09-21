import { listen } from "@tauri-apps/api/event";

export type Visibility = "shown" | "hidden";

export function onVisibilityChange(handler: (state: Visibility) => void) {
  const unlistenShown = listen("shown", () => handler("shown"));
  const unlistenHidden = listen("hidden", () => handler("hidden"));
  return async () => {
    (await unlistenShown)();
    (await unlistenHidden)();
  };
}
