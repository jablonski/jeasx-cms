/** The editor's canvas: an iframe showing the page, rendered on the server. */
import { bindCanvas } from "@cms/browser/editor/canvas-events";
import type { Editor } from "@cms/browser/editor/state";
import { type ApiFailure, json } from "@cms/browser/utils/http";

/** Shown on the canvas instead of the page. */
function previewError({ status, error }: ApiFailure) {
  const reason = status ? `(${status})` : `: ${error.replaceAll("<", "&lt;")}`;
  return `<p class="cms-preview-error">Preview failed ${reason}.</p>`;
}

export function createPreview({
  frame: preview,
  stylesheets,
  editor,
  markErrors,
}: {
  frame: HTMLIFrameElement;
  stylesheets: string[];
  editor: Editor;
  markErrors: () => void;
}) {
  const { state } = editor;
  let previewTimer = 0;
  let previewSeq = 0;
  /** Block to scroll to once it's rendered (selected before the canvas caught up). */
  let pendingScroll: string | null = null;

  /** The rendered block on the canvas. */
  const blockEl = (blockId: string) =>
    preview.contentDocument?.querySelector(`.cms-block[data-block-id="${CSS.escape(blockId)}"]`);

  const scrollToBlock = (el: Element) => el.scrollIntoView({ behavior: "smooth", block: "center" });

  function select(blockId: string | null, scroll = false) {
    state.selected = blockId;
    const doc = preview.contentDocument;
    doc?.querySelectorAll(".cms-selected").forEach((el) => el.classList.remove("cms-selected"));
    if (!blockId) {
      return;
    }
    const el = blockEl(blockId);
    el?.classList.add("cms-selected");
    if (scroll && el) {
      scrollToBlock(el);
    } else if (scroll) {
      pendingScroll = blockId; // not rendered yet: scroll after the next render
    }
  }

  // The canvas shows the page with the site's stylesheets plus the editor overlay.
  const attr = (s: string) => s.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  const links = [
    ...stylesheets,
    new URL(`browser/canvas/index.css?v=${Date.now()}`, document.baseURI).href,
  ]
    .map((href) => `<link rel="stylesheet" href="${attr(href)}">`)
    .join("");
  preview.srcdoc = `<!DOCTYPE html><html><head>
    ${links}
    <base target="_blank">
    </head><body class="preview cms-visual"><main><article id="root"></article></main></body></html>`;
  // The canvas document exists (and may already be rendered) before "load" fires,
  // which waits for its stylesheets. Rendering again here would replace the blocks'
  // DOM and drop focus or a caret the user placed in the meantime.
  preview.addEventListener("load", () => {
    const doc = preview.contentDocument!;
    bindCanvas(doc, editor);
    if (!doc.getElementById("root")?.firstChild) {
      updatePreview();
    }
  });

  // The canvas is rendered on the server: block components never run in the browser.

  /** Re-renders the canvas; `delay` debounces fast changes like typing in a dialog. */
  function updatePreview(delay = 0) {
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(refreshPreview, delay);
  }

  async function refreshPreview() {
    if (editor.inlineEl) {
      return; // re-rendered on blur, so the caret isn't lost while typing
    }
    const target = preview.contentDocument?.getElementById("root");
    if (!target) {
      return;
    }
    const seq = ++previewSeq;
    const res = await json<string>(
      "POST",
      "api/preview",
      { page: { type: state.page.type, blocks: state.page.blocks }, editable: editor.editable },
      { as: "text" },
    );
    const html = res.ok ? res.data : previewError(res);
    // A newer render was requested meanwhile, or inline editing started: skip this one.
    if (seq !== previewSeq || editor.inlineEl) {
      return;
    }
    target.innerHTML = html;
    if (state.selected) {
      const el = blockEl(state.selected);
      el?.classList.add("cms-selected");
      if (el && pendingScroll === state.selected) {
        scrollToBlock(el);
      }
    }
    pendingScroll = null;
    markErrors();
  }

  return { blockEl, select, updatePreview };
}
