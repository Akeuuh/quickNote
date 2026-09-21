import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useEffect, useRef, useState } from "react";
import { NoteSession } from "./note/NoteSession";
import { escapeAction } from "./note/escape";
import { applyScene, applyView, currentView, parseScene, serializeScene } from "./note/scene";
import { tauriBridge } from "./note/tauriBridge";
import { useSystemTheme } from "./systemTheme";

const UI_OPTIONS = {
  canvasActions: {
    loadScene: false,
    saveToActiveFile: false,
    export: false,
    clearCanvas: false,
    toggleTheme: false,
    saveAsImage: true,
    changeViewBackgroundColor: false,
  },
} as const;

function App() {
  const theme = useSystemTheme();
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<NoteSession | null>(null);

  useEffect(() => {
    if (!api) return;
    let active = true;
    let stop: (() => void) | undefined;
    const showScene = (content: string) =>
      parseScene(content)
        .then((scene) => {
          applyScene(api, scene);
          return true;
        })
        .catch((e) => {
          setError(`Fichier de Note illisible, sauvegarde suspendue : ${String(e)}`);
          return false;
        });
    const session = new NoteSession(tauriBridge, {
      onReload: showScene,
      onView: (view) => applyView(api, view),
      currentView: () => currentView(api),
      onError: setError,
    });
    session.load().then(async (content) => {
      if (!active) return;
      if (content !== null && !(await showScene(content))) return;
      if (!active) return;
      stop = session.start();
      sessionRef.current = session;
    });
    return () => {
      active = false;
      sessionRef.current = null;
      stop?.();
    };
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      switch (escapeAction(api.getAppState())) {
        case "deselect":
          api.updateScene({ appState: { selectedElementIds: {} } });
          break;
        case "hide":
          event.preventDefault();
          tauriBridge.hideNote().catch((e) => setError(String(e)));
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [api]);

  return (
    <div className="note" data-theme={theme}>
      <div className="note__handle" data-tauri-drag-region />
      {error && (
        <div className="note__error" role="alert">
          {error}
          <button onClick={() => setError(null)}>OK</button>
        </div>
      )}
      <div className="note__canvas">
        <Excalidraw
          theme={theme}
          UIOptions={UI_OPTIONS}
          autoFocus
          excalidrawAPI={setApi}
          onChange={() => {
            if (api) sessionRef.current?.onChange(() => serializeScene(api));
          }}
        >
          <MainMenu>
            <MainMenu.DefaultItems.SaveAsImage />
          </MainMenu>
        </Excalidraw>
      </div>
    </div>
  );
}

export default App;
