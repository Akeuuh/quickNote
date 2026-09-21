import { loadFromBlob, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

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
