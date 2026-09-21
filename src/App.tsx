import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
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

  return (
    <div className="note" data-theme={theme}>
      <div className="note__handle" data-tauri-drag-region />
      <div className="note__canvas">
        <Excalidraw theme={theme} UIOptions={UI_OPTIONS} autoFocus>
          <MainMenu>
            <MainMenu.DefaultItems.SaveAsImage />
          </MainMenu>
        </Excalidraw>
      </div>
    </div>
  );
}

export default App;
