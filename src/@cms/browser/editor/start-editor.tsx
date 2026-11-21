/**
 * Admin page editor (visual), rendered in the browser with jsx-async-runtime.
 *
 * The page is rendered with the real block components in an iframe. Every block
 * gets an icon bar; text is edited in place, all other fields in a side dialog,
 * and the page updates when that dialog closes.
 *
 * The editor gets everything as JSON from the page (see src/@cms/[edit].tsx): the
 * page, the blocks' schemas (fields, labels, icons) and the site's stylesheets. The
 * canvas is rendered on the server (/@cms/api/preview), so no site code runs here.
 *
 * This file only connects the editor's parts, which live in this folder.
 */

import { createActionRunner, createActions } from "@cms/browser/editor/actions";
import { createDrawer } from "@cms/browser/editor/drawer";
import { createErrorMarks } from "@cms/browser/editor/error-marks";
import { createFieldBinding } from "@cms/browser/editor/field-binding";
import { createHistory } from "@cms/browser/editor/history";
import { editableMode } from "@cms/browser/editor/inline";
import { bindLeaveGuard, bindSaveShortcut } from "@cms/browser/editor/page-events";
import * as paths from "@cms/browser/editor/paths";
import { createPreview } from "@cms/browser/editor/preview";
import { createSave } from "@cms/browser/editor/save";
import { createSideDialogs } from "@cms/browser/editor/side-dialogs";
import type { Editor, EditorState } from "@cms/browser/editor/state";
import Toolbar from "@cms/browser/editor/toolbar";
import { createUploads } from "@cms/browser/editor/uploads";
import { toHtml } from "@cms/browser/utils/to-html";
import type { Page } from "@cms/content/pages";
import { registerBlocks, type Schema } from "@cms/universal/blocks";

/** rendered into the page by src/@cms/[edit].tsx */
export interface EditorData {
  page: Page;
  schema: Schema;
  /** the site's stylesheets (for the canvas) */
  stylesheets: string[];
}

/** Starts the visual editor in `root`. */
export function startEditor(root: HTMLElement, { page, schema, stylesheets }: EditorData) {
  registerBlocks(schema);
  const state: EditorState = {
    page,
    dirty: false,
    busy: false,
    errors: [],
    message: "",
    selected: null,
  };

  root.innerHTML = toHtml(
    <>
      <div class="editor-top" id="editor-top" />
      <div class="editor-body">
        <iframe id="preview" title="Page" />
      </div>
    </>,
  );
  const top = document.getElementById("editor-top") as HTMLElement;
  const frame = document.getElementById("preview") as HTMLIFrameElement;

  /**
   * What the editor's parts use of each other (see Editor in ./state.ts). The parts
   * depend on each other, so functions created further down are called through arrows.
   */
  const editor: Editor = {
    state,
    editable: editableMode(),
    inlineEl: null,
    // Paths always resolve against the current page (it's replaced after saving).
    blocksAt: (path) => paths.blocksAt(state.page, path),
    itemsAt: (path) => paths.itemsAt(state.page, path),
    textAt: (path) => paths.textAt(state.page, path),
    setAt: (path, value) => paths.setAt(state.page, path, value),
    fieldAt: (path) => paths.fieldAt(state.page, path),
    allowedBlocksAt: (path) => paths.allowedBlocksAt(state.page, path),
    locate: (blockId) => paths.locate(state.page, blockId),
    select: (blockId, scroll) => preview.select(blockId, scroll),
    editBlock: (blockId) => dialogs.editBlock(blockId),
    editSettings: () => dialogs.editSettings(),
    gotoError: (path) => errorMarks.gotoError(path),
    markDirty,
    render,
    renderToolbar,
    updatePreview,
    runAction: (el) => runAction(el),
    save: (status) => save(status),
  };

  /** A modal drawer hides the canvas: it's rendered once, when the drawer closes. */
  function updatePreview(delay?: number) {
    if (!drawer.current?.modal) {
      preview.updatePreview(delay);
    }
  }

  function renderToolbar() {
    top.innerHTML = toHtml(<Toolbar state={state} />);
  }

  function render() {
    renderToolbar();
    drawer.current?.render();
    document.title = `${state.page.title || "New page"} | JeasxCMS - Admin`;
    updatePreview();
  }

  function markDirty() {
    const changed = !state.dirty || state.message;
    state.dirty = true;
    state.message = "";
    if (changed) {
      renderToolbar();
    }
  }

  const drawer = createDrawer({
    state,
    render,
    markErrors: () => errorMarks.markErrors(),
    bindEditing: (el) => binding.bindEditing(el),
  });
  const history = createHistory(editor, drawer);
  const uploads = createUploads(editor);
  const binding = createFieldBinding(editor, uploads.upload);
  const runAction = createActionRunner(createActions({ editor, drawer, history, uploads }), editor);
  const preview = createPreview({
    frame,
    stylesheets,
    editor,
    markErrors: () => errorMarks.markErrors(),
  });
  const dialogs = createSideDialogs(editor, drawer);
  const errorMarks = createErrorMarks({ editor, drawer, frame, blockEl: preview.blockEl });
  const save = createSave({
    state,
    render,
    keepSlug: binding.keepSlug,
    saved: (clean) => {
      drawer.current?.saved(clean);
      // A save shows the saved state on the canvas, even behind a modal drawer.
      preview.updatePreview();
    },
  });

  binding.bindEditing(top);
  bindSaveShortcut(document, () => save());
  bindLeaveGuard(state);

  render();
  // New pages start with their settings (title, path).
  if (!state.page.id) {
    dialogs.editSettings();
  }
}
