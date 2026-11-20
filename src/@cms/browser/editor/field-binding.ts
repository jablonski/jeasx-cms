/** Wires form inputs, [data-action] buttons and file drops of the toolbar and dialogs. */

import { bindRichTextEditing, htmlToMarkdown } from "@cms/browser/editor/rich-text-editing";
import type { Editor } from "@cms/browser/editor/state";
import { normalizeSlug } from "@cms/universal/slug";

/** The value of an input in the type its field stores. */
function inputValue(input: HTMLInputElement) {
  if (input.dataset.kind === "boolean") {
    return input.checked;
  }
  return input.dataset.kind === "number" ? Number(input.value) : input.value;
}

/** Shows the image of an image field next to its URL. */
function updateThumbnail(input: HTMLInputElement) {
  const img = input.closest(".image-input")?.querySelector("img");
  if (!img) {
    return;
  }
  img.hidden = !input.value;
  img.src = input.value;
}

/**
 * The path as the server stores it ("/Mäuse Polizei" → "/mause-polizei"), so the editor
 * shows it while typing. Empty stays empty (the path then comes from the title); text
 * without usable characters stays as typed, so saving reports it instead of making it "/".
 */
function editedSlug(value: string) {
  if (!value.trim()) {
    return "";
  }
  const slug = normalizeSlug(value);
  return slug === "/" && !/^[\s/]+$/.test(value) ? value : slug;
}

export function createFieldBinding(
  { state, setAt, renderToolbar, markDirty, updatePreview, runAction }: Editor,
  upload: (path: string, file: File) => void,
) {
  /** New pages take their path from the title until the path is edited. */
  let slugTouched = Boolean(state.page.slug);

  /** A title without usable characters suggests no path (never the homepage's "/"). */
  function suggestSlug(titleInput: HTMLInputElement) {
    const suggested = normalizeSlug(titleInput.value);
    state.page.slug = suggested === "/" ? "" : suggested;
    const slugInput = titleInput
      .closest("dialog")
      ?.querySelector<HTMLInputElement>('[name="slug"]');
    if (slugInput) {
      slugInput.value = state.page.slug;
    }
  }

  /** Editing a field clears its error (the server checks again on save). */
  function clearError(path: string, input: HTMLElement) {
    const before = state.errors.length;
    state.errors = state.errors.filter((err) => err.path !== path);
    if (state.errors.length === before) {
      return;
    }
    input.closest(".field")?.classList.remove("invalid");
    renderToolbar();
  }

  /** Rich text fields of the dialogs: formatted text, stored as markdown (like on the canvas). */
  const richTextAt = (node: EventTarget | Node | null) =>
    (node as HTMLElement | null)?.closest?.<HTMLElement>("[data-richtext]") ?? null;
  const richText = bindRichTextEditing(document, () => richTextAt(document.activeElement));
  document.addEventListener("focusin", (e) => {
    const el = richTextAt(e.target);
    if (el) {
      richText.focus(el);
    }
  });
  document.addEventListener("focusout", (e) => {
    const el = richTextAt(e.target);
    if (el && !richText.inToolbar(e.relatedTarget as Node | null)) {
      richText.hide();
      // left empty: drop leftover markup (<p><br></p>), so it shows its placeholder
      if (!htmlToMarkdown(el)) {
        el.replaceChildren();
      }
    }
  });

  function handleRichTextInput(el: HTMLElement) {
    const path = el.dataset.richtext!;
    setAt(path, htmlToMarkdown(el));
    clearError(path, el);
    markDirty();
    updatePreview(120);
  }

  function handleInput(e: Event) {
    const rich = richTextAt(e.target);
    if (rich) {
      return handleRichTextInput(rich);
    }
    const input = e.target as HTMLInputElement;
    // the formatting toolbar's link input isn't a field of the page
    if (!input.name || richText.inToolbar(input)) {
      return;
    }
    setAt(input.name, inputValue(input));

    if (input.name === "slug") {
      slugTouched = input.value !== "";
      state.page.slug = editedSlug(input.value);
    }
    if (input.name === "title" && !slugTouched && !state.page.id) {
      suggestSlug(input);
    }
    if (input.name === "title" || input.name === "slug") {
      state.dirty = true;
      renderToolbar();
    }
    if (input.dataset.kind === "image") {
      updateThumbnail(input);
    }
    clearError(input.name, input);
    markDirty();
    updatePreview(120);
  }

  function bindEditing(container: HTMLElement) {
    container.addEventListener("input", handleInput);
    // the path field shows the normalized path once it's left (normalizing while typing
    // would e.g. drop a "-" just typed)
    container.addEventListener("change", (e) => {
      const input = e.target as HTMLInputElement;
      if (input.name === "slug") {
        input.value = state.page.slug;
      }
    });
    container.addEventListener("click", (e: MouseEvent) => {
      const button = (e.target as HTMLElement).closest?.<HTMLElement>("[data-action]");
      if (!button) {
        return;
      }
      e.preventDefault();
      runAction(button);
    });
    container.addEventListener("dragover", (e: DragEvent) => {
      const box = (e.target as HTMLElement).closest?.("[data-drop-path]");
      if (box && e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
        box.classList.add("dragover");
      }
    });
    container.addEventListener("dragleave", (e: DragEvent) => {
      (e.target as HTMLElement).closest?.("[data-drop-path]")?.classList.remove("dragover");
    });
    container.addEventListener("drop", (e: DragEvent) => {
      const box = (e.target as HTMLElement).closest?.("[data-drop-path]");
      const file = e.dataTransfer?.files[0];
      if (!box || !file) {
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      box.classList.remove("dragover");
      upload(box.getAttribute("data-drop-path")!, file);
    });
  }

  return {
    bindEditing,
    /** A saved page keeps its path when the title changes. */
    keepSlug() {
      slugTouched = true;
    },
  };
}
