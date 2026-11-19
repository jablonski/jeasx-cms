/**
 * Inline editing on the canvas: text, textarea and rich text fields are edited in
 * place (contenteditable). Rich text is edited as rendered HTML with a formatting
 * toolbar; every change is stored as its markdown (see rich-text-markdown.ts).
 */

import { bindRichTextEditing, htmlToMarkdown } from "@cms/browser/editor/rich-text-editing";
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
  const text = el.innerText.replace(/\u00A0/g, " ");
  return el.getAttribute("data-cms-kind") === "text"
    ? text.replace(/\s*\n\s*/g, " ").trim()
    : text.replace(/\n$/, "");
}

export function bindInlineEditing(doc: Document, editor: Editor) {
  let original = "";
  // Pointer state: re-rendering after a blur waits for the click that caused it.
  let pointerDown = false;
  doc.addEventListener("pointerdown", () => (pointerDown = true), true);
  doc.addEventListener("pointerup", () => (pointerDown = false), true);

  /** Ends editing of `el`: stores nothing new (input did), re-renders the canvas. */
  function finish(el: HTMLElement) {
    richText.hide();
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
      // Only the first of the two renders runs.
      let done = false;
      const render = () => {
        if (!done) {
          done = true;
          clearTimeout(fallback);
          editor.updatePreview();
        }
      };
      const fallback = setTimeout(render, 1000);
      doc.addEventListener("pointerup", () => setTimeout(render), { once: true });
    } else {
      editor.updatePreview();
    }
  }

  // toolbar, paste, shortcuts and allowed formats of rich text (shared with the drawer)
  const richText = bindRichTextEditing(
    doc,
    () => (editor.inlineEl && isRichText(editor.inlineEl) ? editor.inlineEl : null),
    () => editor.inlineEl && finish(editor.inlineEl),
  );

  doc.addEventListener("focusin", (e) => {
    const el = (e.target as HTMLElement).closest?.<HTMLElement>("[data-cms-field]");
    if (!el || el === editor.inlineEl) {
      return; // also: back from the toolbar's link input
    }
    editor.inlineEl = el as HTMLElement;
    original = editor.textAt(inlinePath(el));
    el.classList.add("cms-editing");
    if (isRichText(el)) {
      richText.focus(el);
    }
    editor.select(el.closest(".cms-block")?.getAttribute("data-block-id") ?? null);
  });

  doc.addEventListener("input", (e) => {
    const el = (e.target as HTMLElement).closest?.<HTMLElement>("[data-cms-field]");
    if (!el || el !== editor.inlineEl) {
      return;
    }
    editor.setAt(inlinePath(el), inlineValue(el));
    editor.markDirty();
  });

  doc.addEventListener("focusout", (e) => {
    const el = (e.target as HTMLElement).closest?.<HTMLElement>("[data-cms-field]");
    if (!el || el !== editor.inlineEl) {
      return;
    }
    if (richText.inToolbar(e.relatedTarget as Node | null)) {
      return; // into the link input: still editing this field
    }
    finish(el);
  });

  doc.addEventListener(
    "keydown",
    (e) => {
      const el = editor.inlineEl;
      if (!el || richText.inToolbar(e.target as Node)) {
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
      }
    },
    true,
  );

  // Plain text fields in browsers without plaintext-only: paste plain text only
  // (rich text pastes via bindRichTextEditing).
  doc.addEventListener("paste", (e) => {
    const el = editor.inlineEl;
    if (!el || isRichText(el) || editor.editable === "plaintext-only") {
      return;
    }
    e.preventDefault();
    doc.execCommand("insertText", false, e.clipboardData?.getData("text/plain") ?? "");
  });

  // No formatting in plain text fields (fallback mode would add markup).
  doc.addEventListener("beforeinput", (e) => {
    const el = editor.inlineEl;
    if (el && !isRichText(el) && e.inputType.startsWith("format")) {
      e.preventDefault();
    }
  });
}
