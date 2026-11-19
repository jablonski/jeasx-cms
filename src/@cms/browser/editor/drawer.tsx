/** The editor's side dialog ("drawer") for block fields, page settings and the history. */
import { toHtml } from "@cms/browser/shared/to-html";

/** What the drawer needs from the editor. */
export interface DrawerHost {
  state: { dirty: boolean };
  /** re-renders the editor (after Cancel) */
  render: () => void;
  /** marks invalid fields (after each render) */
  markErrors: () => void;
  /** wires inputs and actions */
  bindEditing: (el: HTMLElement) => void;
}

/** The side dialog being shown. */
export interface OpenDrawer {
  el: HTMLDialogElement;
  /** Covers the page: the canvas catches up when it closes. */
  modal: boolean;
  render: () => void;
  cancel: () => void;
  /** The page was saved; `clean`: without changes made while saving. */
  saved: (clean: boolean) => void;
}

/**
 * One side dialog at a time. Changes go to the page's data right away, but the canvas
 * is only rendered again on closing. Cancel restores the snapshot taken when opening,
 * Done, Esc or a click on the backdrop close and keep the changes.
 *
 * A non-modal drawer (history) leaves the page usable: the canvas makes room for it
 * (body.drawer-docked) and stays scrollable. Esc cancels it, as there is no backdrop
 * to signal "keep".
 */
export function createDrawer(host: DrawerHost) {
  let current: OpenDrawer | null = null;

  function close() {
    if (!current) {
      return;
    }
    current.el.close();
    current.el.remove();
    current = null;
    document.body.classList.remove("drawer-docked");
  }

  /**
   * @param options `view` returns the dialog's JSX, or null to close it (e.g. its block is gone);
   * `snapshot` copies what Cancel restores, taken on opening and again after each save
   */
  function open<Snapshot>({
    view,
    snapshot,
    restore,
    onSaved,
    modal = true,
  }: {
    view: () => unknown;
    snapshot: () => Snapshot;
    restore: (snapshot: Snapshot) => void;
    onSaved?: (snapshot: Snapshot) => void;
    modal?: boolean;
  }) {
    close();
    const el = document.createElement("dialog");
    el.className = "drawer";
    el.setAttribute("aria-labelledby", "drawer-title");
    document.body.append(el);
    let baseline = snapshot();
    let wasDirty = host.state.dirty;
    /** Closes and keeps the changes, which the canvas hasn't shown yet. */
    const keepAndClose = () => {
      close();
      host.render();
    };
    const self: OpenDrawer = {
      el,
      modal,
      render() {
        const scroll = el.querySelector(".drawer-body")?.scrollTop ?? 0;
        const content = view();
        if (!content) {
          return close();
        }
        el.innerHTML = toHtml(content);
        const body = el.querySelector(".drawer-body");
        if (body) {
          body.scrollTop = scroll;
        }
        host.markErrors();
      },
      cancel() {
        restore(baseline);
        host.state.dirty = wasDirty;
        close();
        host.render();
      },
      saved(clean) {
        wasDirty = !clean;
        if (!clean) {
          return;
        }
        baseline = snapshot();
        onSaved?.(structuredClone(baseline));
      },
    };
    host.bindEditing(el);
    el.addEventListener("cancel", (e) => {
      e.preventDefault();
      keepAndClose();
    });
    el.addEventListener("click", (e) => {
      if (e.target === el) {
        keepAndClose();
      }
    });
    if (!modal) {
      el.classList.add("docked");
      el.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          self.cancel();
        }
      });
    }
    current = self;
    self.render();
    if (modal) {
      el.showModal();
    } else {
      el.show();
      document.body.classList.add("drawer-docked");
    }
    (el.querySelector(".drawer-body :is(input, textarea, select)") as HTMLElement)?.focus();
  }

  return {
    open,
    close,
    /** The open drawer, if any. */
    get current() {
      return current;
    },
  };
}

export type DrawerController = ReturnType<typeof createDrawer>;
