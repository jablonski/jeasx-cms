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

/** Text offset of the caret position at a point inside `el` (null if outside). */
function offsetAtPoint(doc: Document, el: HTMLElement, x: number, y: number) {
  let node: Node | null = null;
  let offset = 0;
  if ("caretPositionFromPoint" in doc) {
    const pos = (doc as any).caretPositionFromPoint(x, y);
    node = pos?.offsetNode ?? null;
    offset = pos?.offset ?? 0;
  } else {
    const range = (doc as any).caretRangeFromPoint?.(x, y) as Range | null;
    node = range?.startContainer ?? null;
    offset = range?.startOffset ?? 0;
  }
  if (!node || !el.contains(node)) {
    return null;
  }
  const before = doc.createRange();
  before.setStart(el, 0);
  before.setEnd(node, offset);
  return before.toString().length;
}

/**
 * Maps an offset in the rendered text to the markdown source: walks both texts,
 * skipping markup characters and whitespace in the source that the rendered text
 * doesn't have.
 */
function sourceOffset(source: string, rendered: string, offset: number) {
  let s = 0;
  for (let r = 0; r < offset && s < source.length; r++) {
    const ch = rendered[r];
    if (/\s/.test(ch)) {
      continue;
    }
    while (s < source.length && source[s] !== ch) {
      s++;
    }
    s++;
  }
  // Whitespace isn't matched above: a click right after a space belongs after the
  // source's whitespace (at the start of the next word), not before it.
  if (offset > 0 && /\s/.test(rendered[offset - 1] ?? "")) {
    while (s < source.length && /[ \t]/.test(source[s])) {
      s++;
    }
  }
  return Math.min(s, source.length);
}

function placeCaretAt(doc: Document, el: Node, offset: number) {
  const text = el.firstChild;
  if (!text) {
    return placeCaretAtEnd(doc, el);
  }
  const range = doc.createRange();
  range.setStart(text, Math.min(offset, text.textContent!.length));
  range.collapse(true);
  const sel = doc.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export function bindInlineEditing(doc: Document, editor: Editor) {
  let original = "";
  // Pointer state: a click places the caret on mouseup, after focus has switched a
  // rich text field to its source, so the caret is placed again afterwards.
  let pointerDown = false;
  let pointer = { x: 0, y: 0 };
  doc.addEventListener(
    "pointerdown",
    (e) => {
      pointerDown = true;
      pointer = { x: e.clientX, y: e.clientY };
    },
    true,
  );
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
      // Where the click landed in the rendered text, before it is replaced.
      const rendered = el.textContent ?? "";
      const clicked = pointerDown ? offsetAtPoint(doc, el, pointer.x, pointer.y) : null;
      const paragraph = doc.createElement("p");
      paragraph.textContent = original;
      paragraph.setAttribute("data-placeholder", el.getAttribute("data-placeholder") ?? "");
      el.replaceChildren(paragraph);
      // The source doesn't line up with the rendered text, so the clicked position is
      // mapped into the source (caret at the end for keyboard focus). The browser places
      // the caret on mouseup, so it is placed again afterwards.
      const place = () =>
        clicked === null
          ? placeCaretAtEnd(doc, paragraph)
          : placeCaretAt(doc, paragraph, sourceOffset(original, rendered, clicked));
      place();
      if (pointerDown) {
        doc.addEventListener(
          "mouseup",
          () =>
            setTimeout(() => {
              if (editor.inlineEl === el) {
                place();
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
