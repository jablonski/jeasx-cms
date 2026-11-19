/** What the toolbar, dialogs and canvas can do, by the name in their [data-action]. */

import { pickBlockType } from "@cms/browser/editor/block-picker";
import type { DrawerController } from "@cms/browser/editor/drawer";
import type { createHistory } from "@cms/browser/editor/history";
import * as paths from "@cms/browser/editor/paths";
import type { Editor } from "@cms/browser/editor/state";
import type { createUploads } from "@cms/browser/editor/uploads";
import { chooseFiles } from "@cms/browser/files/file-api";
import { pickFile } from "@cms/browser/files/file-picker";
import { alertDialog, confirmDialog } from "@cms/browser/utils/dialog";
import { request } from "@cms/browser/utils/http";
import { createBlock } from "@cms/shared/block-data";
import { innerLevels, isContainer } from "@cms/shared/block-tree";
import { BLOCKS } from "@cms/shared/blocks";
import { defaults } from "@cms/shared/fields";

/** The clicked element's data attributes (data-path, data-index, …). */
export type ActionData = Record<string, string>;

/**
 * What an action did, which decides what happens next:
 * - "handled": it rendered itself or nothing changed, so nothing more is done
 * - "ui": only the UI changed, so the editor is rendered again
 * - "page-changed": the page changed, so it is marked unsaved and rendered again
 */
export type ActionResult = "handled" | "ui" | "page-changed";

export type Actions = Record<string, (data: ActionData) => ActionResult | Promise<ActionResult>>;

/** Runs the action of a [data-action] element. Resolves true if it was handled. */
export function createActionRunner(
  actions: Actions,
  { markDirty, render }: Pick<Editor, "markDirty" | "render">,
) {
  return async (button: HTMLElement): Promise<boolean> => {
    if (button.hasAttribute("disabled")) {
      return true;
    }
    const action = actions[button.getAttribute("data-action") ?? ""];
    if (!action) {
      return false;
    }
    const result = await action({ ...button.dataset } as ActionData);
    if (result === "handled") {
      return true;
    }
    if (result === "page-changed") {
      markDirty();
    }
    render();
    return true;
  };
}

export function createActions({
  editor,
  drawer,
  history,
  uploads,
}: {
  editor: Editor;
  drawer: DrawerController;
  history: ReturnType<typeof createHistory>;
  uploads: ReturnType<typeof createUploads>;
}): Actions {
  const {
    state,
    blocksAt,
    itemsAt,
    fieldAt,
    allowedBlocksAt,
    locate,
    select,
    editBlock,
    editSettings,
    gotoError,
    markDirty,
    render,
    save,
  } = editor;

  const moveEntry = ({ path, index, dir }: ActionData): ActionResult => {
    paths.move(itemsAt(path), Number(index), Number(index) + Number(dir));
    return "page-changed";
  };

  return {
    async "insert-block"({ path, index }): Promise<ActionResult> {
      const allowed = allowedBlocksAt(path);
      const type = allowed.length === 1 ? allowed[0] : await pickBlockType(allowed);
      if (!type) {
        return "handled";
      }
      const block = createBlock(type);
      blocksAt(path).splice(Number(index), 0, block);
      state.selected = block.id;
      markDirty();
      render();
      // Containers are filled on the page; other blocks open their fields right away.
      requestAnimationFrame(() =>
        isContainer(type) ? select(block.id, true) : editBlock(block.id),
      );
      return "handled";
    },
    "edit-block"({ path, index }) {
      editBlock(blocksAt(path)[Number(index)].id);
      return "handled";
    },
    async "remove-block"({ path, index }): Promise<ActionResult> {
      const block = blocksAt(path)[Number(index)];
      const label = BLOCKS[block.type]?.label ?? "block";
      const ok = await confirmDialog({
        title: `Delete ${label}?`,
        message:
          innerLevels(block) > 0
            ? "This block contains other blocks. They will be deleted as well."
            : "The block will be removed from this page when you save.",
        confirmLabel: "Delete",
        danger: true,
      });
      if (!ok) {
        return "handled";
      }
      // Looked up again: saving while the dialog is open replaces the page's lists.
      blocksAt(path).splice(Number(index), 1);
      if (state.selected === block.id) {
        state.selected = null;
      }
      if (drawer.current && !locate(block.id)) {
        drawer.close();
      }
      return "page-changed";
    },
    "move-block": moveEntry,
    "duplicate-block"({ path, index }) {
      const copy = paths.renewIds(structuredClone(blocksAt(path)[Number(index)]));
      blocksAt(path).splice(Number(index) + 1, 0, copy);
      state.selected = copy.id;
      return "page-changed";
    },
    "add-item"({ path }) {
      const field = fieldAt(path);
      if (field?.type === "list") {
        itemsAt(path).push(defaults(field.fields));
      }
      return "page-changed";
    },
    async "remove-item"({ path, index }): Promise<ActionResult> {
      const ok = await confirmDialog({
        title: "Remove item?",
        message: `${fieldAt(path)?.label ?? "Item"} #${Number(index) + 1} will be removed.`,
        confirmLabel: "Remove",
        danger: true,
      });
      if (!ok) {
        return "handled";
      }
      // Looked up again: saving while the dialog is open replaces the page's lists.
      itemsAt(path).splice(Number(index), 1);
      return "page-changed";
    },
    "move-item": moveEntry,
    "upload-image"({ path }) {
      chooseFiles({ accept: "image/*" }).then(([file]) => file && uploads.upload(path, file));
      return "handled";
    },
    "upload-file"({ path }) {
      chooseFiles().then(([file]) => file && uploads.upload(path, file));
      return "handled";
    },
    "pick-file"({ path }) {
      pickFile({ imagesOnly: false }).then((url) => url && uploads.setFileUrl(path, url));
      return "handled";
    },
    "pick-image"({ path }) {
      pickFile().then((url) => url && uploads.setFileUrl(path, url));
      return "handled";
    },
    "goto-error"({ path }) {
      gotoError(path);
      return "handled";
    },
    "page-settings"() {
      editSettings();
      return "handled";
    },
    history() {
      history.show();
      return "handled";
    },
    async "load-revision"({ revision }): Promise<ActionResult> {
      await history.load(revision);
      return "ui"; // dirty state is set when the version loads
    },
    "drawer-done"() {
      drawer.close();
      history.close();
      return "ui";
    },
    "drawer-cancel"() {
      drawer.current?.cancel();
      return "handled";
    },
    save() {
      save();
      return "handled";
    },
    publish() {
      save("published");
      return "handled";
    },
    unpublish() {
      save("draft");
      return "handled";
    },
    async delete(): Promise<ActionResult> {
      const confirmed = await confirmDialog({
        title: "Delete page?",
        message: `»${state.page.title}« (${state.page.slug}) and all its revisions will be deleted permanently. This cannot be undone.`,
        confirmLabel: "Delete page",
        danger: true,
      });
      if (!confirmed) {
        return "handled";
      }
      const res = await request("DELETE", `api/pages?id=${state.page.id}`);
      if (res.ok) {
        state.dirty = false;
        location.href = new URL(document.baseURI).pathname.slice(0, -1);
      } else {
        await alertDialog({
          title: "Could not delete page",
          message: res.error,
        });
      }
      return "handled";
    },
  };
}
