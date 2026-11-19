/** Events of the admin page around the editor: the save shortcut and leaving with changes. */

import type { EditorState } from "@cms/browser/editor/state";
import { confirmDialog } from "@cms/browser/utils/dialog";

/** Ctrl/⌘ + S saves; bound to the admin page and to the canvas, which is its own document. */
export function bindSaveShortcut(doc: Document, save: () => void) {
  doc.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      save();
    }
  });
}

export function bindLeaveGuard(state: EditorState) {
  // Links inside the admin (header nav, "View") ask via modal when there are unsaved changes.
  document.addEventListener("click", async (e) => {
    const link = (e.target as HTMLElement).closest?.("a[href]");
    if (!link || !state.dirty || link.getAttribute("target") === "_blank") {
      return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    const leave = await confirmDialog({
      title: "Discard unsaved changes?",
      message: "You have changes that haven't been saved yet.",
      confirmLabel: "Discard changes",
      cancelLabel: "Keep editing",
      danger: true,
    });
    if (leave) {
      state.dirty = false;
      location.href = (link as HTMLAnchorElement).href;
    }
  });

  // Reload / closing the tab can only use the browser's own prompt.
  window.addEventListener("beforeunload", (e) => {
    if (state.dirty) {
      e.preventDefault();
    }
  });
}
