/** Saving the page being edited. */

import type { EditorState } from "@cms/browser/editor/state";
import { confirmDialog } from "@cms/browser/utils/dialog";
import { json } from "@cms/browser/utils/http";
import type { StoredPage } from "@cms/content/pages";

export function createSave({
  state,
  render,
  keepSlug,
  saved,
}: {
  state: EditorState;
  render: () => void;
  keepSlug: () => void;
  /** @param clean false if the page was edited while saving */
  saved: (clean: boolean) => void;
}) {
  const confirmOverwrite = () =>
    confirmDialog({
      title: "Page was changed by someone else",
      message:
        "Another version was saved while you were editing. Overwriting replaces it; it stays available in the history.",
      confirmLabel: "Overwrite",
      cancelLabel: "Keep editing",
      danger: true,
    });

  /** Takes over the stored page. @param sent the page as it was when saving started */
  function applySaved(stored: StoredPage, sent: string) {
    const isNew = !state.page.id;
    const clean = JSON.stringify(state.page) === sent;
    if (clean) {
      state.page = stored;
      state.dirty = false;
      state.message = `Saved ${new Date().toLocaleTimeString()}`;
    } else {
      // Edited while saving: keep those changes, they are still unsaved.
      const { id, status, version, updatedAt } = stored;
      Object.assign(state.page, { id, status, version, updatedAt });
      state.page.slug ||= stored.slug;
    }
    saved(clean);
    state.errors = [];
    keepSlug();
    if (isNew) {
      window.history.replaceState(null, "", `edit?id=${stored.id}`);
      // "Pages" in the header now leads back to this page's row
      const pages = document.querySelector<HTMLAnchorElement>("[data-pages-link]");
      if (pages) {
        pages.hash = `page-${stored.id}`;
      }
    }
  }

  /** @param overwrite replaces a version someone else saved since this one was loaded */
  async function save(status = state.page.status, overwrite = false) {
    if (state.busy) {
      return;
    }
    state.busy = true;
    render();
    const sent = JSON.stringify(state.page);
    const res = await json<StoredPage>("POST", "api/pages", {
      ...state.page,
      status,
      baseVersion: overwrite ? undefined : state.page.version,
    });
    state.busy = false;
    if (!res.ok && res.status === 409) {
      render();
      if (await confirmOverwrite()) {
        await save(status, true);
      }
      return;
    }
    if (res.ok) {
      applySaved(res.data, sent);
    } else {
      state.errors = res.errors ?? [{ message: res.error }];
    }
    render();
  }

  return save;
}
