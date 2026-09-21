import { describe, expect, it } from "vitest";
import { escapeAction, type EscapeState } from "./escape";

const idle: EscapeState = {
  editingTextElement: null,
  editingLinearElement: null,
  editingGroupId: null,
  editingFrame: null,
  multiElement: null,
  selectedElementIds: {},
  activeTool: { type: "selection" } as EscapeState["activeTool"],
  openMenu: null,
  openPopup: null,
  openDialog: null,
  openSidebar: null,
  contextMenu: null,
  errorMessage: null,
};

describe("escapeAction", () => {
  it("hides when nothing is in progress", () => {
    expect(escapeAction(idle)).toBe("hide");
  });

  it("leaves Escape to Excalidraw while editing a text", () => {
    const editing = { ...idle, editingTextElement: {} as EscapeState["editingTextElement"] };
    expect(escapeAction(editing)).toBe("leave-to-excalidraw");
  });

  it("deselects when only a selection remains", () => {
    expect(escapeAction({ ...idle, selectedElementIds: { a: true } })).toBe("deselect");
  });

  it("leaves Escape to Excalidraw with a drawing tool active, even with a selection", () => {
    const rectangle = {
      ...idle,
      selectedElementIds: { a: true as const },
      activeTool: { type: "rectangle" } as EscapeState["activeTool"],
    };
    expect(escapeAction(rectangle)).toBe("leave-to-excalidraw");
  });

  it("leaves Escape to Excalidraw with a dialog open", () => {
    expect(escapeAction({ ...idle, openDialog: { name: "imageExport" } })).toBe(
      "leave-to-excalidraw",
    );
  });

  it("leaves Escape to Excalidraw with an error dialog open", () => {
    expect(escapeAction({ ...idle, errorMessage: "oops" })).toBe("leave-to-excalidraw");
  });
});
