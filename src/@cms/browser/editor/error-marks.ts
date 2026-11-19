/** Shows validation errors on the canvas and in the open side dialog. */
import type { DrawerController } from "@cms/browser/editor/drawer";
import * as paths from "@cms/browser/editor/paths";
import type { Editor } from "@cms/browser/editor/state";

export function createErrorMarks({
  editor: { state, blocksAt, editBlock, editSettings },
  drawer,
  frame,
  blockEl,
}: {
  editor: Editor;
  drawer: DrawerController;
  frame: HTMLIFrameElement;
  blockEl: (blockId: string) => Element | null | undefined;
}) {
  /** Red outline for blocks with errors, and invalid fields in an open dialog. */
  function markErrors() {
    frame.contentDocument
      ?.querySelectorAll(".cms-error")
      .forEach((el) => el.classList.remove("cms-error"));
    for (const error of state.errors) {
      const at = paths.blockOfPath(error.path);
      const id = at && blocksAt(at.path)[at.index]?.id;
      if (id) {
        blockEl(id)?.classList.add("cms-error");
      }
    }
    const el = drawer.current?.el;
    if (!el) {
      return;
    }
    el.querySelectorAll(".invalid").forEach((f) => f.classList.remove("invalid"));
    for (const error of state.errors) {
      if (!error.path) {
        continue;
      }
      const path = CSS.escape(error.path);
      el.querySelector(`[name="${path}"]`)?.closest(".field")?.classList.add("invalid");
      el.querySelector(`[data-drop-path="${path}"]`)?.closest(".field")?.classList.add("invalid");
    }
  }

  /** Opens the place of an error: block dialog or page settings, and focuses the field. */
  function gotoError(path: string) {
    const at = paths.blockOfPath(path);
    const block = at && blocksAt(at.path)[at.index];
    if (block) {
      editBlock(block.id);
    } else {
      editSettings();
    }
    requestAnimationFrame(() => {
      const el = drawer.current?.el;
      const input =
        el?.querySelector(`[name="${CSS.escape(path)}"]`) ??
        el?.querySelector(`[data-drop-path="${CSS.escape(path)}"] input`) ??
        el?.querySelector(".invalid :is(input, textarea, select, button)");
      (input as HTMLElement)?.focus();
      input?.scrollIntoView({ block: "center" });
    });
  }

  return { markErrors, gotoError };
}
