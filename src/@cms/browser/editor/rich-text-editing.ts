/**
 * Editing behaviour of rich text fields, shared by the canvas (inline editing) and the
 * block drawer: the formatting toolbar, Ctrl/⌘ + K for links, "- " to start a list,
 * plain-text paste and only the formats the stored markdown can hold.
 * The edited HTML is turned into markdown by rich-text-markdown.ts.
 */
import { htmlToMarkdown } from "@cms/browser/editor/rich-text-markdown";
import { createRichTextToolbar } from "@cms/browser/editor/rich-text-toolbar";

export { htmlToMarkdown };

export interface RichTextEditing {
  /** Prepares `el` when it gets focus (paragraphs on Enter, an empty first paragraph). */
  focus(el: HTMLElement): void;
  /** Whether `node` belongs to the toolbar (focus moving there doesn't end editing). */
  inToolbar(node: Node | null): boolean;
  /** Hides the toolbar (editing ended). */
  hide(): void;
}

/**
 * @param current the rich text element being edited in `doc`, or null
 * @param leave called when focus leaves the toolbar's link input for somewhere else
 */
export function bindRichTextEditing(
  doc: Document,
  current: () => HTMLElement | null,
  leave: () => void = () => {},
): RichTextEditing {
  const toolbar = createRichTextToolbar(doc, leave);
  const active = (e: Event) => {
    const el = current();
    return el && !toolbar.contains(e.target as Node) ? el : null;
  };

  doc.addEventListener("selectionchange", () => toolbar.update(current()));

  /** The list item the "- " shortcut just made: Backspace there turns it back into "- ". */
  let madeList: Element | null = null;

  // "- " at the start of a paragraph starts a list, as in the stored format.
  doc.addEventListener(
    "input",
    (e) => {
      const el = active(e);
      const ie = e as InputEvent;
      if (!el || ie.inputType !== "insertText" || ie.data !== " ") {
        return;
      }
      const block = blockAtCaret(doc, el);
      if (block?.tagName === "P" && /^-[\s\u00A0]$/.test(block.textContent ?? "")) {
        const range = doc.createRange();
        range.selectNodeContents(block);
        doc.getSelection()?.removeAllRanges();
        doc.getSelection()?.addRange(range);
        doc.execCommand("delete");
        doc.execCommand("insertUnorderedList");
        madeList = blockAtCaret(doc, el);
      }
    },
    true, // before the field's own input handler, which then stores the list
  );

  doc.addEventListener(
    "keydown",
    (e) => {
      const el = active(e);
      if (!el) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toolbar.openLink();
      }
      // Backspace right after the "- " shortcut: the dash was meant as text.
      const item = madeList;
      if (["Shift", "Alt", "Control", "Meta"].includes(e.key)) {
        return; // keeps the chance to undo the shortcut
      }
      madeList = null;
      const caretIn = blockAtCaret(doc, el);
      if (e.key === "Backspace" && item?.isConnected && caretIn === item && !item.textContent?.trim()) {
        e.preventDefault();
        doc.execCommand("insertUnorderedList"); // back to a paragraph
        doc.execCommand("insertText", false, "- ");
      }
    },
    true,
  );

  // Plain text only: no foreign markup in the page; blank lines start paragraphs.
  doc.addEventListener("paste", (e) => {
    if (!active(e)) {
      return;
    }
    e.preventDefault();
    pasteText(doc, e.clipboardData?.getData("text/plain") ?? "");
  });

  // Only bold and italic (the other formats can't be stored); dropped content could
  // bring foreign markup.
  doc.addEventListener("beforeinput", (e) => {
    if (!active(e)) {
      return;
    }
    const allowed = ["formatBold", "formatItalic"].includes(e.inputType);
    if ((e.inputType.startsWith("format") && !allowed) || e.inputType === "insertFromDrop") {
      e.preventDefault();
    }
  });

  return {
    focus(el) {
      // Enter starts a <p> (not a <div>); formatting adds <b>/<i>, not inline styles.
      doc.execCommand("defaultParagraphSeparator", false, "p");
      doc.execCommand("styleWithCSS", false, "false");
      if (!el.firstElementChild) {
        // Empty: type into a paragraph (site styles apply; it shows the placeholder).
        const paragraph = doc.createElement("p");
        paragraph.setAttribute("data-placeholder", el.getAttribute("data-placeholder") ?? "");
        el.replaceChildren(paragraph);
        const range = doc.createRange();
        range.selectNodeContents(paragraph);
        doc.getSelection()?.removeAllRanges();
        doc.getSelection()?.addRange(range);
      }
    },
    inToolbar: (node) => toolbar.contains(node),
    hide: () => toolbar.update(null),
  };
}

/** The paragraph (or list item) holding the caret inside `field`. */
function blockAtCaret(doc: Document, field: HTMLElement) {
  const node = doc.getSelection()?.anchorNode;
  const el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element | null);
  const block = el?.closest?.("p, li, div");
  return block && field.contains(block) && block !== field ? block : null;
}

/** Pastes plain text: blank lines start paragraphs, line breaks stay. */
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
