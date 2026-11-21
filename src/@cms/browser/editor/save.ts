/** Saving the page being edited. */

import type { EditorState } from "@cms/browser/editor/state";
import { confirmUsage } from "@cms/browser/utils/confirm-usage";
import { confirmDialog } from "@cms/browser/utils/dialog";
import { json, request } from "@cms/browser/utils/http";
import type { StoredPage, Usage } from "@cms/content/pages";

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

  /** The path as saved: changing it breaks links of other pages to the page. */
  let savedSlug = state.page.slug;

  /** Asks before saving a new path while other pages link to the saved one. */
  async function confirmPathChange() {
    if (!state.page.id || state.page.slug === savedSlug) {
      return true;
    }
    const res = await request<Usage[]>("GET", `api/pages?id=${state.page.id}&usage`);
    if (!res.ok || !res.data.length) {
      return true; // a server that can't be reached is reported by the save itself
    }
    return confirmUsage({
      title: "Page is linked",
      intro: `${savedSlug} is linked from these pages. Their links will break when the path changes to ${state.page.slug}:`,
      usage: res.data,
      confirmLabel: "Change path anyway",
    });
  }

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
    savedSlug = stored.slug;
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
    // nothing to save (Ctrl/⌘ + S on an unchanged page); publishing changes the status
    const unchanged = !state.dirty && state.page.id && status === state.page.status;
    if (state.busy || (unchanged && !overwrite)) {
      return;
    }
    state.busy = true;
    render();
    if (!overwrite && !(await confirmPathChange())) {
      state.busy = false;
      render();
      return;
    }
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
