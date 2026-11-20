/**
 * Event wiring of the visual canvas (the iframe showing the page): hover, selection,
 * actions in the blocks' icon bars, keyboard, inline editing and drag & drop.
 */
import { bindCanvasDrag } from "@cms/browser/editor/drag";
import { bindInlineEditing } from "@cms/browser/editor/inline";
import { bindSaveShortcut } from "@cms/browser/editor/page-events";
import type { Editor } from "@cms/browser/editor/state";

/** Moving outward (from a block into its container) switches the hover after this delay. */
const HOVER_OUT_DELAY = 350;

export function bindCanvas(doc: Document, editor: Editor) {
  // Hover: the innermost block under the pointer shows its toolbar. Moving outward
  // switches only after a short delay, so the pointer can travel to the toolbar,
  // which sits just above the block, without the container's toolbar taking over.
  let hovered: Element | null = null;
  let pending = 0;
  const setHover = (block: Element | null) => {
    clearTimeout(pending);
    if (block === hovered) {
      return;
    }
    hovered?.classList.remove("cms-hover");
    hovered = block;
    hovered?.classList.add("cms-hover");
  };
  doc.addEventListener("mouseover", (e) => {
    const block = (e.target as HTMLElement).closest?.("[data-block-id]") ?? null;
    if (block === hovered) {
      return clearTimeout(pending);
    }
    const outward = hovered?.isConnected && (!block || block.contains(hovered));
    if (outward) {
      clearTimeout(pending);
      pending = window.setTimeout(() => setHover(block), HOVER_OUT_DELAY);
    } else {
      setHover(block);
    }
  });
  doc.addEventListener("mouseleave", () => setHover(null));

  doc.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;
    // Links on the page must not navigate away while editing.
    if (target.closest?.("a")) {
      e.preventDefault();
    }
    const button = target.closest?.("[data-action]") as HTMLElement;
    if (button) {
      e.preventDefault();
      await editor.runAction(button);
      return;
    }
    const block = target.closest?.("[data-block-id]");
    editor.select(block?.getAttribute("data-block-id") ?? null);
  });

  doc.addEventListener("dblclick", (e) => {
    const target = e.target as HTMLElement;
    const block = target.closest?.("[data-block-id]");
    if (!block || target.closest("[data-action], [data-cms-field]")) {
      return;
    }
    doc.getSelection()?.removeAllRanges();
    editor.editBlock(block.getAttribute("data-block-id")!);
  });

  // Keyboard: Tab onto a block selects it (its bar becomes reachable).
  doc.addEventListener("focusin", (e) => {
    const target = e.target as HTMLElement;
    if (target.hasAttribute?.("data-block-id")) {
      editor.select(target.getAttribute("data-block-id"));
    }
  });

  doc.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      editor.select(null);
    }
    // Enter on a button or link of the canvas triggers that control instead.
    const control = (e.target as HTMLElement).closest?.("button, a, [data-action]");
    if (e.key === "Enter" && editor.state.selected && !editor.inlineEl && !control) {
      editor.editBlock(editor.state.selected);
    }
  });

  bindSaveShortcut(doc, () => editor.save());
  bindInlineEditing(doc, editor);
  bindCanvasDrag(doc, editor);
}
