/**
 * Drag & drop of blocks on the canvas, by their grip. Which drops are allowed is
 * decided by checkDrop() in ./block-moves.ts (block types, nesting depth, not into itself).
 */

import { applyMove, checkDrop, type Drag } from "@cms/browser/editor/block-moves";
import type { Editor } from "@cms/browser/editor/state";
import { BLOCKS } from "@cms/content/blocks";

export function bindCanvasDrag(doc: Document, editor: Editor) {
  let drag: Drag | null = null;

  const clear = () =>
    doc.querySelectorAll(".cms-drop-before, .cms-drop-after, .cms-drop-into").forEach((el) => {
      el.classList.remove("cms-drop-before", "cms-drop-after", "cms-drop-into");
    });

  /**
   * Drop position under the pointer: before/after the innermost block whose list
   * accepts the dragged block (walking up to containers), or into an empty list.
   */
  function target(e: DragEvent) {
    const page = editor.state.page;
    const start = e.target as HTMLElement;
    const empty = start.closest?.(".cms-empty");
    if (empty) {
      const check = checkDrop(page, drag, empty.getAttribute("data-path")!, 0);
      return check && { ...check, el: empty, position: "into" };
    }
    let el: Element | null | undefined = start.closest?.(".cms-block");
    while (el) {
      const rect = el.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      const index = Number(el.getAttribute("data-index")) + (before ? 0 : 1);
      const check = checkDrop(page, drag, el.getAttribute("data-path")!, index);
      if (check) {
        return { ...check, el, position: before ? "before" : "after" };
      }
      el = el.parentElement?.closest(".cms-block");
    }
    return null;
  }

  doc.addEventListener("dragstart", (e) => {
    const grip = (e.target as HTMLElement).closest?.(".cms-grip");
    if (!grip) {
      return;
    }
    const path = grip.getAttribute("data-path")!;
    const index = Number(grip.getAttribute("data-index"));
    const block = editor.blocksAt(path)[index];
    drag = { path, index, block };
    const blockEl = grip.closest(".cms-block")!;
    e.dataTransfer!.effectAllowed = "move";
    e.dataTransfer!.setData("text/plain", BLOCKS[block.type]?.label ?? "");
    e.dataTransfer!.setDragImage(blockEl, 24, 24);
    requestAnimationFrame(() => {
      blockEl.classList.add("cms-dragging");
      doc.body.classList.add("cms-is-dragging");
    });
  });

  doc.addEventListener("dragover", (e) => {
    if (!drag) {
      return;
    }
    const drop = target(e);
    clear();
    if (!drop) {
      return;
    }
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
    if (!drop.noop) {
      drop.el.classList.add(`cms-drop-${drop.position}`);
    }
  });

  doc.addEventListener("drop", (e) => {
    if (!drag) {
      return;
    }
    const drop = target(e);
    if (!drop) {
      return;
    }
    e.preventDefault();
    if (!drop.noop) {
      applyMove(editor.state.page, drag, drop.path, drop.index);
      editor.state.selected = drag.block.id;
      editor.markDirty();
    }
    drag = null;
    clear();
    editor.render();
  });

  doc.addEventListener("dragend", () => {
    drag = null;
    clear();
    doc.body.classList.remove("cms-is-dragging");
    doc.querySelectorAll(".cms-dragging").forEach((el) => el.classList.remove("cms-dragging"));
  });
}
