import type { AppState } from "@excalidraw/excalidraw/types";

export type EscapeState = Pick<
  AppState,
  | "editingTextElement"
  | "editingLinearElement"
  | "editingGroupId"
  | "editingFrame"
  | "multiElement"
  | "selectedElementIds"
  | "activeTool"
  | "openMenu"
  | "openPopup"
  | "openDialog"
  | "openSidebar"
  | "contextMenu"
  | "errorMessage"
>;

export type EscapeAction = "leave-to-excalidraw" | "deselect" | "hide";

export function escapeAction(state: EscapeState): EscapeAction {
  const excalidrawCancels =
    state.editingTextElement !== null ||
    state.editingLinearElement !== null ||
    state.editingGroupId !== null ||
    state.editingFrame !== null ||
    state.multiElement !== null ||
    state.activeTool.type !== "selection" ||
    state.openMenu !== null ||
    state.openPopup !== null ||
    state.openDialog !== null ||
    state.openSidebar !== null ||
    state.contextMenu !== null ||
    state.errorMessage !== null;
  if (excalidrawCancels) return "leave-to-excalidraw";
  if (Object.keys(state.selectedElementIds).length > 0) return "deselect";
  return "hide";
}
