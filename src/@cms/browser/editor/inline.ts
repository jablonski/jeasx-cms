/**
 * Inline editing on the canvas: text, textarea and rich text fields are edited in
 * place (contenteditable). Rich text is edited as rendered HTML with a formatting
 * toolbar; every change is stored as its markdown (see rich-text-markdown.ts).
 */

import { htmlToMarkdown } from "@cms/browser/editor/rich-text-markdown";
import { createRichTextToolbar } from "@cms/browser/editor/rich-text-toolbar";
import type { Editor } from "@cms/browser/editor/state";

/** Inline editing uses plain-text contenteditable where supported (pasting can't insert markup). */
export function editableMode() {
  try {
    const el = document.createElement("div");
    el.contentEditable = "plaintext-only";
    return el.contentEditable === "plaintext-only" ? "plaintext-only" : "true";
  } catch {
    return "true";
  }
}

/** Path of an inline-editable element: block path + field name. */
function inlinePath(el: Element) {
  const block = el.closest(".cms-block")!;
  return `${block.getAttribute("data-path")}.${block.getAttribute("data-index")}.data.${el.getAttribute("data-cms-field")}`;
}

const isRichText = (el: Element) => el.getAttribute("data-cms-kind") === "richtext";

/** Value of a contenteditable element; single-line fields drop line breaks. */
function inlineValue(el: HTMLElement) {
  if (isRichText(el)) {
    return htmlToMarkdown(el);
  }
  const text = el.innerText.replace(/ /g, " ");
  return el.getAttribute("data-cms-kind") === "text"
    ? text.replace(/\s*\n\s*/g, " ").trim()
    : text.replace(/\n$/, "");
}

function placeCaretIn(doc: Document, el: Node) {
  const range = doc.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = doc.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/** The paragraph (or list item) holding the caret inside `field`. */
function blockAtCaret(doc: Document, field: HTMLElement) {
  const node = doc.getSelection()?.anchorNode;
  const el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element | null);
  const block = el?.closest?.("p, li, div");
  return block && field.contains(block) && block !== field ? block : null;
}

/** Pastes plain text into rich text: blank lines start paragraphs, line breaks stay. */
function pasteText(doc: Document, text: string) {
  text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .forEach((chunk, i) => {
      if (i) {
        doc.execCommand("insertParagraph");
      }
      chunk.split("\n").forEach((line, j) => {
        if (j) {
          doc.execCommand("insertLineBreak");
        }
        if (line) {
          doc.execCommand("insertText", false, line);
        }
      });
    });
}

export function bindInlineEditing(doc: Document, editor: Editor) {
  let original = "";
  // Pointer state: re-rendering after a blur waits for the click that caused it.
  let pointerDown = false;
  doc.addEventListener("pointerdown", () => (pointerDown = true), true);
  doc.addEventListener("pointerup", () => (pointerDown = false), true);

  /** Ends editing of `el`: stores nothing new (input did), re-renders the canvas. */
  function finish(el: HTMLElement) {
    toolbar.update(null);
    el.classList.remove("cms-editing", "cms-formatting");
    // Left empty: drop leftover markup (<p><br></p>), so the field shows its placeholder.
    if (isRichText(el) && !inlineValue(el).trim()) {
      el.replaceChildren();
    }
    editor.inlineEl = null;
    if (pointerDown) {
      // Blurred by a press on another control (e.g. the block's "edit" button):
      // re-rendering now would replace that button before its click fires.
      // Wait until the click is through (fallback, if released outside the canvas).
      const render = () => editor.updatePreview();
      doc.addEventListener("pointerup", () => setTimeout(render), { once: true });
      setTimeout(render, 1000);
    } else {
      editor.updatePreview();
    }
  }

  const toolbar = createRichTextToolbar(doc, () => {
    if (editor.inlineEl) {
      finish(editor.inlineEl);
    }
  });

  doc.addEventListener("selectionchange", () => {
    const el = editor.inlineEl;
    toolbar.update(el && isRichText(el) ? el : null);
  });

  doc.addEventListener("focusin", (e) => {
    const el = (e.target as HTMLElement).closest?.<HTMLElement>("[data-cms-field]");
    if (!el || el === editor.inlineEl) {
      return; // also: back from the toolbar's link input
    }
    editor.inlineEl = el as HTMLElement;
    original = editor.textAt(inlinePath(el));
    el.classList.add("cms-editing");
    if (isRichText(el)) {
      // Enter starts a <p> (not a <div>); formatting adds <b>/<i>, not inline styles.
      doc.execCommand("defaultParagraphSeparator", false, "p");
      doc.execCommand("styleWithCSS", false, "false");
      if (!el.firstElementChild) {
        // Empty: type into a paragraph, so the site's paragraph styles apply.
        const paragraph = doc.createElement("p");
        paragraph.setAttribute("data-placeholder", el.getAttribute("data-placeholder") ?? "");
        el.replaceChildren(paragraph);
        placeCaretIn(doc, paragraph);
      }
    }
    editor.select(el.closest(".cms-block")?.getAttribute("data-block-id") ?? null);
  });

  doc.addEventListener("input", (e) => {
    const el = (e.target as HTMLElement).closest?.<HTMLElement>("[data-cms-field]");
    if (!el || el !== editor.inlineEl) {
      return;
    }
    // "- " at the start of a paragraph starts a list, as in the stored format.
    const ie = e as InputEvent;
    if (isRichText(el) && ie.inputType === "insertText" && ie.data === " ") {
      const block = blockAtCaret(doc, el);
      if (block?.tagName === "P" && /^-[\s ]$/.test(block.textContent ?? "")) {
        const range = doc.createRange();
        range.selectNodeContents(block);
        doc.getSelection()?.removeAllRanges();
        doc.getSelection()?.addRange(range);
        doc.execCommand("delete");
        doc.execCommand("insertUnorderedList");
      }
    }
    editor.setAt(inlinePath(el), inlineValue(el));
    editor.markDirty();
  });

  doc.addEventListener("focusout", (e) => {
    const el = (e.target as HTMLElement).closest?.<HTMLElement>("[data-cms-field]");
    if (!el || el !== editor.inlineEl) {
      return;
    }
    if (toolbar.contains(e.relatedTarget as Node | null)) {
      return; // into the link input: still editing this field
    }
    finish(el);
  });

  doc.addEventListener(
    "keydown",
    (e) => {
      const el = editor.inlineEl;
      if (!el || toolbar.contains(e.target as Node)) {
        return;
      }
      const kind = el.getAttribute("data-cms-kind");
      if (e.key === "Escape") {
        // Revert this field and stop editing.
        e.preventDefault();
        e.stopPropagation();
        editor.setAt(inlinePath(el), original);
        el.blur();
      } else if (e.key === "Enter" && kind === "text") {
        // Finish editing; stop here so Enter doesn't also open the block's dialog.
        e.preventDefault();
        e.stopPropagation();
        el.blur();
      } else if (e.key === "Enter" && kind === "textarea" && editor.editable === "true") {
        // Fallback editors would insert <div>/<br> markup: insert a plain line break instead.
        e.preventDefault();
        doc.execCommand("insertText", false, "\n");
      } else if (kind === "richtext" && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toolbar.openLink();
      }
    },
    true,
  );

  // Paste plain text only: no foreign markup in the page (rich text keeps paragraphs).
  doc.addEventListener("paste", (e) => {
    const el = editor.inlineEl;
    if (!el || toolbar.contains(e.target as Node)) {
      return;
    }
    const text = e.clipboardData?.getData("text/plain") ?? "";
    if (isRichText(el)) {
      e.preventDefault();
      pasteText(doc, text);
    } else if (editor.editable !== "plaintext-only") {
      e.preventDefault();
      doc.execCommand("insertText", false, text);
    }
  });

  // Formatting: only bold and italic in rich text (the others can't be stored);
  // dropped content could bring foreign markup.
  doc.addEventListener("beforeinput", (e) => {
    const el = editor.inlineEl;
    if (!el || toolbar.contains(e.target as Node)) {
      return;
    }
    const allowed = isRichText(el) && ["formatBold", "formatItalic"].includes(e.inputType);
    if ((e.inputType.startsWith("format") && !allowed) || e.inputType === "insertFromDrop") {
      e.preventDefault();
    }
  });
}
