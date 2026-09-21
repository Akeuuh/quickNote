import { loadFromBlob, serializeAsJSON } from "@excalidraw/excalidraw";
import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { View } from "./view";

export type Scene = Awaited<ReturnType<typeof loadFromBlob>>;

export function parseScene(content: string): Promise<Scene> {
  return loadFromBlob(new Blob([content], { type: "application/json" }), null, null);
}

export function serializeScene(api: ExcalidrawImperativeAPI): string {
  return serializeAsJSON(api.getSceneElements(), api.getAppState(), api.getFiles(), "local");
}

export function applyScene(api: ExcalidrawImperativeAPI, scene: Scene): void {
  api.updateScene({ elements: scene.elements });
  api.addFiles(Object.values(scene.files));
}

export function currentView(api: ExcalidrawImperativeAPI): View {
  const { scrollX, scrollY, zoom } = api.getAppState();
  return { scrollX, scrollY, zoom: zoom.value };
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 30;

export function applyView(api: ExcalidrawImperativeAPI, view: View): void {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom));
  api.updateScene({
    appState: {
      scrollX: view.scrollX,
      scrollY: view.scrollY,
      zoom: { value: zoom as AppState["zoom"]["value"] },
    },
  });
}
