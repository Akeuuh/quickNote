import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { onVisibilityChange } from "./visibility";
import "@excalidraw/excalidraw/index.css";
import "./index.css";

if (import.meta.env.DEV) {
  onVisibilityChange((state) => console.log(`[note] ${state}`));
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
