/** Wires form inputs, [data-action] buttons and file drops of the toolbar and dialogs. */

import type { Editor } from "@cms/browser/editor/state";
import { normalizeSlug } from "@cms/content/slug";

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
  function clearError(input: HTMLInputElement) {
    const before = state.errors.length;
    state.errors = state.errors.filter((err) => err.path !== input.name);
    if (state.errors.length === before) {
      return;
    }
    input.closest(".field")?.classList.remove("invalid");
    renderToolbar();
  }

  function handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.name) {
      return;
    }
    setAt(input.name, inputValue(input));

    if (input.name === "slug") {
      slugTouched = input.value !== "";
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
    clearError(input);
    markDirty();
    updatePreview(120);
  }

  function bindEditing(container: HTMLElement) {
    container.addEventListener("input", handleInput);
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
