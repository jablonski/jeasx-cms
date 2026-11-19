/**
 * File library page (/@cms/files): upload into the current folder (button or drop);
 * create folders; rename, move (drag onto a folder or breadcrumb, or "Move") and delete
 * files and folders. This file holds the page's state; its parts live in this folder.
 */

import { createLibraryActions } from "@cms/browser/file-library/actions";
import { bindLibraryDragDrop } from "@cms/browser/file-library/drag-drop";
import LibraryView from "@cms/browser/file-library/view";
import { browseFolderOrTop, type FolderView, uploadFile } from "@cms/browser/files/file-api";
import { toHtml } from "@cms/browser/utils/to-html";

export default async function initFileLibrary(root: HTMLElement) {
  let listing: FolderView = { folder: null, path: [], folders: [], files: [] };
  let messages: string[] = [];
  let busy = false;

  const current = () => listing.folder?.id ?? null;

  const render = () => {
    root.innerHTML = toHtml(<LibraryView listing={listing} messages={messages} busy={busy} />);
  };

  /** Loads a folder; the URL (?folder=ID) keeps the place on reload and back/forward. */
  const show = async (folder: number | null, { push = true } = {}) => {
    listing = await browseFolderOrTop(folder);
    if (push) {
      // Absolute: relative URLs would resolve against the admin's <base> tag.
      const url = location.pathname + (listing.folder ? `?folder=${listing.folder.id}` : "");
      history.pushState({ folder: current() }, "", url);
    }
    render();
  };
  const reload = () => show(current(), { push: false });

  const upload = async (files: File[]) => {
    if (!files.length) {
      return;
    }
    busy = true;
    messages = [];
    render();
    for (const file of files) {
      const res = await uploadFile(file, current());
      if (!res.ok) {
        messages.push(`${file.name}: ${res.error}`);
      } else if (res.data.duplicate && res.data.folderId !== current()) {
        const where = res.data.folderName ? `in »${res.data.folderName}«` : "at the top level";
        messages.push(`${file.name}: this file already exists ${where} as »${res.data.name}«.`);
      }
    }
    busy = false;
    await reload();
  };

  const { clickActions, moveFile, moveFolder } = createLibraryActions({
    listing: () => listing,
    current,
    setMessages: (next) => {
      messages = next;
    },
    open: (folder) => show(folder),
    reload,
    upload,
  });

  root.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    for (const [attribute, action] of Object.entries(clickActions)) {
      const el = target.closest(`[${attribute}]`);
      if (el) {
        return void action(el.getAttribute(attribute)!);
      }
    }
  });
  bindLibraryDragDrop(root, { current, upload, moveFile, moveFolder });
  window.addEventListener("popstate", (e) => show(e.state?.folder ?? null, { push: false }));

  const initial = new URLSearchParams(location.search).get("folder");
  await show(initial ? Number(initial) : null, { push: false });
  history.replaceState({ folder: current() }, "", location.href);
}
