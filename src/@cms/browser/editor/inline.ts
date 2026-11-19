/**
 * Inline editing on the canvas: text, textarea and rich text fields are edited in
 * place (contenteditable). Rich text is edited as its source (**bold**, lists, …).
 */

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

/** Text of a contenteditable element; single-line fields drop line breaks. */
function inlineValue(el: HTMLElement) {
  const text = el.innerText.replace(/\u00A0/g, " ");
  return el.getAttribute("data-cms-kind") === "text"
    ? text.replace(/\s*\n\s*/g, " ").trim()
    : text.replace(/\n$/, "");
}

function placeCaretAtEnd(doc: Document, el: Node) {
  const range = doc.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = doc.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export function bindInlineEditing(doc: Document, editor: Editor) {
  let original = "";
  // Pointer state: a click places the caret on mouseup, after focus has switched a
  // rich text field to its source, so the caret is placed again afterwards.
  let pointerDown = false;
  doc.addEventListener("pointerdown", () => (pointerDown = true), true);
  doc.addEventListener("pointerup", () => (pointerDown = false), true);

  doc.addEventListener("focusin", (e) => {
    const el = (e.target as HTMLElement).closest?.<HTMLElement>("[data-cms-field]");
    if (!el) {
      return;
    }
    editor.inlineEl = el as HTMLElement;
    original = editor.textAt(inlinePath(el));
    el.classList.add("cms-editing");
    if (el.getAttribute("data-cms-kind") === "richtext") {
      // Edit the source in a single paragraph, so the site's paragraph styles
      // (size, color, spacing) still apply while editing.
      const paragraph = doc.createElement("p");
      paragraph.textContent = original;
      paragraph.setAttribute("data-placeholder", el.getAttribute("data-placeholder") ?? "");
      el.replaceChildren(paragraph);
      // The source doesn't line up with the rendered text, so the clicked position is
      // meaningless: put the caret at the end (after the click, if there is one).
      placeCaretAtEnd(doc, paragraph);
      if (pointerDown) {
        doc.addEventListener(
          "mouseup",
          () =>
            setTimeout(() => {
              if (editor.inlineEl === el) {
                placeCaretAtEnd(doc, paragraph);
              }
            }),
          { once: true },
        );
      }
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
    el.classList.remove("cms-editing");
    // Left empty: drop the editing paragraph, so the field shows its placeholder again.
    if (el.getAttribute("data-cms-kind") === "richtext" && !inlineValue(el).trim()) {
      el.replaceChildren();
    }
    editor.inlineEl = null;
    editor.updatePreview();
  });

  doc.addEventListener(
    "keydown",
    (e) => {
      const el = editor.inlineEl;
      if (!el) {
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
      } else if (e.key === "Enter" && editor.editable === "true") {
        // Fallback editors would insert <div>/<br> markup: insert a plain line break instead.
        e.preventDefault();
        doc.execCommand("insertText", false, "\n");
      }
    },
    true,
  );

  // Paste plain text only (fallback for browsers without plaintext-only).
  doc.addEventListener("paste", (e) => {
    if (!editor.inlineEl || editor.editable === "plaintext-only") {
      return;
    }
    e.preventDefault();
    doc.execCommand("insertText", false, e.clipboardData?.getData("text/plain") ?? "");
  });

  // No formatting shortcuts (bold/italic would add markup in fallback mode).
  doc.addEventListener("beforeinput", (e) => {
    if (editor.inlineEl && e.inputType.startsWith("format")) {
      e.preventDefault();
    }
  });
}
