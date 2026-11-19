/** The editor's version history: browsing earlier versions of the page on the canvas. */

import type { DrawerController } from "@cms/browser/editor/drawer";
import HistoryDialog from "@cms/browser/editor/history-dialog";
import type { Editor } from "@cms/browser/editor/state";
import { alertDialog } from "@cms/browser/utils/dialog";
import { request } from "@cms/browser/utils/http";
import type { Page, StoredPage } from "@cms/content/pages";
import type { Revision } from "@cms/content/revisions";

export function createHistory({ state, select }: Editor, drawer: DrawerController) {
  /** Dialog state, null while it's closed. */
  let revisions: {
    list: Revision[];
    /** id of the loaded revision, null for the current version */
    selected: number | null;
    loading: boolean;
    /** the editor's content when the dialog opened */
    current: Pick<Page, "title" | "slug" | "meta" | "blocks">;
    wasDirty: boolean;
  } | null = null;

  /**
   * Versions of the page: choosing one loads its content into the editor (live on the
   * canvas). Restore keeps it as unsaved changes, Cancel brings back the current state.
   */
  async function show() {
    const res = await request<Revision[]>("GET", `api/pages?id=${state.page.id}&revisions`);
    if (!res.ok) {
      return alertDialog({ title: "Could not load history", message: res.error });
    }
    const content = () =>
      structuredClone({
        title: state.page.title,
        slug: state.page.slug,
        meta: state.page.meta,
        blocks: state.page.blocks,
      });
    const current = content();
    revisions = { list: res.data, selected: null, loading: false, current, wasDirty: state.dirty };
    select(null);
    drawer.open({
      modal: false, // the page stays scrollable to compare versions
      snapshot: content,
      // What was saved is the current version from now on.
      onSaved: (saved) => {
        if (revisions) {
          Object.assign(revisions, { current: saved, selected: null, wasDirty: false });
        }
      },
      view: () =>
        revisions && (
          <HistoryDialog
            revisions={revisions.list}
            selected={revisions.selected}
            updatedAt={state.page.updatedAt}
            loading={revisions.loading}
          />
        ),
      restore: (copy) => {
        Object.assign(state.page, structuredClone(copy));
        revisions = null;
      },
    });
  }

  /** Loads a version into the editor: a revision id, or "" for the current version. */
  async function load(id: string | undefined) {
    if (!revisions || revisions.loading) {
      return;
    }
    if (!id) {
      Object.assign(state.page, structuredClone(revisions.current));
      revisions.selected = null;
      state.dirty = revisions.wasDirty;
      return;
    }
    revisions.loading = true;
    drawer.current?.render();
    const res = await request<StoredPage>("GET", `api/pages?id=${state.page.id}&revision=${id}`);
    if (!revisions) {
      return; // closed meanwhile
    }
    revisions.loading = false;
    if (!res.ok) {
      return alertDialog({ title: "Could not load version", message: res.error });
    }
    const { title, slug, meta, blocks } = res.data;
    Object.assign(state.page, { title, slug, meta, blocks });
    revisions.selected = Number(id);
    state.errors = [];
    state.dirty = true;
    state.message = "";
  }

  return {
    show,
    load,
    /** The dialog was closed and keeps the loaded version. */
    close() {
      revisions = null;
    },
  };
}
