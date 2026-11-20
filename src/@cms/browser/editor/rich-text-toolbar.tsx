/**
 * Floating formatting toolbar for rich text fields on the canvas: bold, italic, link
 * and list for the selected text. It lives in the canvas document, keeps the field
 * focused (buttons never take focus) and only the link input briefly takes it.
 *
 * Formatting uses document.execCommand: deprecated, but supported everywhere, and it
 * keeps the browser's own undo (Ctrl/⌘ + Z) working. The resulting HTML is turned into
 * the stored markdown by rich-text-markdown.ts.
 */
import { pickPage } from "@cms/browser/editor/page-picker";
import { pickFile } from "@cms/browser/files/file-picker";
import { toHtml } from "@cms/browser/utils/to-html";
import { isSafeUrl } from "@cms/universal/fields";
import {
  BoldIcon,
  FolderIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  PageIcon,
  UnlinkIcon,
} from "@cms/universal/icons";

export interface RichTextToolbar {
  /** Shows the toolbar for the selection in `field` (the rich text being edited), or hides it. */
  update(field: HTMLElement | null): void;
  /** Opens the link input for the selection (Ctrl/⌘ + K). */
  openLink(): void;
  /** Whether `node` belongs to the toolbar (focus moving there doesn't end editing). */
  contains(node: Node | null): boolean;
}

/** @param leave called when focus leaves the link input for somewhere outside the field */
export function createRichTextToolbar(doc: Document, leave: () => void): RichTextToolbar {
  const bar = doc.createElement("div");
  bar.className = "cms-text-toolbar";
  bar.hidden = true;
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Text formatting");
  doc.body.append(bar);

  let field: HTMLElement | null = null;
  /** selection saved while the link input has focus */
  let saved: Range | null = null;
  /** a page or file picker (modal in the admin) is open: focus leaving isn't the end of editing */
  let picking = false;

  const selection = () => doc.getSelection();
  const range = () => {
    const sel = selection();
    return sel?.rangeCount && field?.contains(sel.anchorNode) ? sel.getRangeAt(0) : null;
  };
  /** Element holding the start of `r`. */
  const elementAt = (r: Range | null) => {
    const node = r?.startContainer;
    return node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element | undefined);
  };
  const linkAt = (r: Range | null) => {
    const a = elementAt(r)?.closest("a");
    return a && field?.contains(a) ? a : null;
  };
  /** focus returning to the field from the link input on purpose (applying, Escape) */
  let restoring = false;
  const restore = () => {
    if (!field || !saved) {
      return;
    }
    const r = saved;
    restoring = true;
    try {
      field.focus({ preventScroll: true });
    } finally {
      restoring = false;
    }
    const sel = selection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  };

  function renderButtons() {
    const r = range();
    const state = (command: string) => {
      try {
        return doc.queryCommandState(command);
      } catch {
        return false;
      }
    };
    // only lists inside the field: the field itself may sit in a list (e.g. a card grid)
    const list = elementAt(r)?.closest("ul, ol");
    const inList = !!(list && field?.contains(list));
    const button = (command: string, label: string, icon: JSX.Element, active: boolean) => (
      <button
        type="button"
        data-command={command}
        title={label}
        aria-label={label}
        aria-pressed={active ? "true" : "false"}
        tabindex="-1"
      >
        {icon}
      </button>
    );
    bar.innerHTML = toHtml(
      <>
        {button("bold", "Bold (Ctrl/⌘ + B)", <BoldIcon />, state("bold"))}
        {button("italic", "Italic (Ctrl/⌘ + I)", <ItalicIcon />, state("italic"))}
        {button("link", "Link (Ctrl/⌘ + K)", <LinkIcon />, !!linkAt(r))}
        {button("list", "Bulleted list", <ListIcon />, inList)}
      </>,
    );
  }

  function renderLinkForm(url: string, existing: boolean) {
    bar.innerHTML = toHtml(
      <form class="cms-link-form">
        <input
          type="text"
          value={url}
          placeholder="/page or https://… ⏎"
          aria-label="Link URL"
          autocomplete="off"
          spellcheck="false"
        />
        <button
          type="button"
          data-command="pick-page"
          title="Link to a page"
          aria-label="Link to a page"
        >
          <PageIcon />
        </button>
        <button
          type="button"
          data-command="pick-file"
          title="Link to a file"
          aria-label="Link to a file"
        >
          <FolderIcon />
        </button>
        {existing && (
          <button type="button" data-command="unlink" title="Remove link" aria-label="Remove link">
            <UnlinkIcon />
          </button>
        )}
      </form>,
    );
    bar.classList.add("editing-link");
    const input = bar.querySelector("input")!;
    input.focus();
    input.select();
  }

  /** Above the selection (or the link holding the caret); below it without room above. */
  function position() {
    const r = saved ?? range();
    if (!r) {
      return;
    }
    const link = r.collapsed ? linkAt(r) : null;
    const rect = (link ?? r).getBoundingClientRect();
    bar.hidden = false;
    // fixed, in view coordinates: also right inside a scrolling drawer
    const top = rect.top - bar.offsetHeight - 10;
    const maxLeft = doc.documentElement.clientWidth - bar.offsetWidth - 8;
    const left = Math.min(Math.max(rect.left, 8), maxLeft);
    bar.style.top = `${top < 8 ? rect.bottom + 10 : top}px`;
    bar.style.left = `${left}px`;
  }

  // follows the text while the page or a drawer scrolls
  doc.addEventListener("scroll", () => !bar.hidden && position(), {
    capture: true,
    passive: true,
  });
  doc.defaultView?.addEventListener("resize", () => !bar.hidden && position());

  function hide() {
    field?.classList.remove("cms-formatting");
    bar.hidden = true;
    bar.classList.remove("editing-link");
    saved = null;
  }

  function openLink() {
    const r = range();
    if (!field || !r) {
      return;
    }
    const link = linkAt(r);
    if (r.collapsed && !link) {
      return; // nothing selected to link
    }
    if (link && r.collapsed) {
      r.selectNodeContents(link); // edit the whole link
    }
    saved = r.cloneRange();
    renderLinkForm(link?.getAttribute("href") ?? "", !!link);
    position();
  }

  function applyLink(url: string) {
    const input = bar.querySelector("input");
    if (url && !isSafeUrl(url)) {
      input?.setCustomValidity("Use a path like /about, an http(s) or a mailto: URL.");
      input?.reportValidity();
      return;
    }
    restore();
    doc.execCommand(url ? "createLink" : "unlink", false, url);
    finishLink();
  }

  /** Opens a picker; the chosen page or file becomes the link, cancelling returns to the input. */
  async function pickLink(picker: () => Promise<string | null>) {
    picking = true;
    try {
      const url = await picker();
      if (url) {
        return applyLink(url);
      }
      bar.querySelector("input")?.focus();
    } finally {
      picking = false;
    }
  }

  function finishLink() {
    bar.classList.remove("editing-link");
    saved = null;
    renderButtons();
    position();
  }

  // Buttons must not take focus from the field (that would end editing).
  bar.addEventListener("mousedown", (e) => {
    if (!(e.target as Element).closest("input")) {
      e.preventDefault();
    }
  });
  // Clicks stay here: the canvas would otherwise treat them as a click beside the block.
  bar.addEventListener("click", (e) => {
    e.stopPropagation();
    const button = (e.target as Element).closest<HTMLElement>("[data-command]");
    if (!button) {
      return;
    }
    const command = button.dataset.command!;
    if (command === "link") {
      return openLink();
    }
    if (command === "pick-page") {
      return void pickLink(pickPage);
    }
    if (command === "pick-file") {
      return void pickLink(() => pickFile({ imagesOnly: false }));
    }
    if (command === "unlink") {
      return applyLink("");
    }
    doc.execCommand(command === "list" ? "insertUnorderedList" : command);
    renderButtons();
    position();
  });
  bar.addEventListener("submit", (e) => {
    e.preventDefault();
    applyLink(bar.querySelector("input")!.value.trim());
  });
  bar.addEventListener("input", () => bar.querySelector("input")?.setCustomValidity(""));
  bar.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter" && (e.target as Element).matches?.("input")) {
        // Applied here, not by the form's submit: that runs after focus is back in the
        // field, where the same Enter would then replace the selected text by a paragraph.
        e.preventDefault();
        e.stopPropagation();
        applyLink((e.target as HTMLInputElement).value.trim());
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        restore();
        finishLink();
      }
    },
    true,
  );
  bar.addEventListener("focusout", (e) => {
    const to = e.relatedTarget as Node | null;
    if (picking || restoring) {
      return;
    }
    if (!bar.classList.contains("editing-link") || bar.contains(to)) {
      return;
    }
    if (field?.contains(to)) {
      // back into the text (e.g. a click on it): the link input closes, the buttons follow
      // the new selection
      bar.classList.remove("editing-link");
      saved = null;
      const r = range();
      return r && (!r.collapsed || linkAt(r)) ? finishLink() : hide();
    }
    hide();
    leave();
  });

  return {
    update(next) {
      if (bar.classList.contains("editing-link")) {
        // the link input has focus: keep the field (the drawer finds it by focus, which
        // is now in the input) and its saved selection
        return;
      }
      if (field !== next) {
        field?.classList.remove("cms-formatting");
      }
      field = next;
      // inside a modal dialog (the drawer), only the dialog's content is visible on top
      const host = field?.closest("dialog") ?? doc.body;
      if (field && bar.parentElement !== host) {
        host.append(bar);
      }
      if (bar.classList.contains("editing-link")) {
        return; // the link input has focus
      }
      const r = range();
      if (!field || !r || (r.collapsed && !linkAt(r))) {
        return hide();
      }
      field.classList.add("cms-formatting"); // hides the field's "Select text to format" hint
      renderButtons();
      position();
    },
    openLink,
    contains: (node) => !!node && bar.contains(node),
  };
}
