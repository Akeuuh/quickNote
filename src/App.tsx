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
    <Excalidraw theme={theme} UIOptions={UI_OPTIONS}>
      <MainMenu>
        <MainMenu.DefaultItems.SaveAsImage />
      </MainMenu>
    </Excalidraw>
  );
}

export default App;
