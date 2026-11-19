/** What the buttons of the file library do. */

import type { Library } from "@cms/browser/file-library/library";
import { chooseFiles, folderIdOf } from "@cms/browser/files/file-api";
import { chooseFolder } from "@cms/browser/files/folder-dialog";
import { alertDialog, confirmDialog, promptDialog } from "@cms/browser/utils/dialog";
import { json, request } from "@cms/browser/utils/http";
import { plural } from "@cms/core/text";
import { MAX_FILE_NAME } from "@cms/media/file-url";

export function createLibraryActions({
  listing,
  current,
  setMessages,
  open,
  reload,
  upload,
}: Library) {
  /** Sends a change; problems are shown in a dialog. The folder is reloaded either way. */
  const change = async (method: string, url: string, body: unknown, failure: string) => {
    const res = await json(method, url, body);
    if (!res.ok) {
      await alertDialog({ title: failure, message: res.error });
    }
    await reload();
  };

  const moveFile = (id: number | string, folder: number | null) =>
    change("PATCH", `api/files?id=${id}`, { folder }, "Could not move file");

  const moveFolder = (id: number | string, parent: number | null) =>
    change("PATCH", `api/folders?id=${id}`, { parent }, "Could not move folder");

  const folderById = (id: string | null) =>
    listing().folders.find((f) => String(f.id) === String(id));
  const fileById = (id: string | null) =>
    listing().files.find((file) => String(file.id) === String(id));

  const createFolder = async () => {
    const name = await promptDialog({ title: "New folder", label: "Name", confirmLabel: "Create" });
    if (name) {
      await change("POST", "api/folders", { name, parent: current() }, "Could not create folder");
    }
  };

  const renameFolder = async (id: string) => {
    const folder = folderById(id)!;
    const name = await promptDialog({
      title: "Rename folder",
      label: "Name",
      value: folder.name,
      confirmLabel: "Rename",
    });
    if (!name || name === folder.name) {
      return;
    }
    await change("PATCH", `api/folders?id=${folder.id}`, { name }, "Could not rename folder");
  };

  const deleteFolder = async (id: string) => {
    const folder = folderById(id)!;
    const parent = listing().folder;
    const where = parent ? `»${parent.name}«` : "the top level";
    const empty = !folder.fileCount && !folder.folderCount;
    const ok = await confirmDialog({
      title: `Delete folder »${folder.name}«?`,
      message: empty
        ? "The folder is empty."
        : `Its contents (${plural(folder.fileCount, "file")}, ${plural(folder.folderCount, "folder")}) will be moved to ${where}. No files are deleted.`,
      confirmLabel: "Delete folder",
      danger: true,
    });
    if (!ok) {
      return;
    }
    const res = await request("DELETE", `api/folders?id=${folder.id}`);
    if (!res.ok) {
      await alertDialog({ title: "Could not delete folder", message: res.error });
    }
    await reload();
  };

  const renameFile = async (id: string) => {
    const file = fileById(id)!;
    const name = await promptDialog({
      title: "Rename file",
      label: "Name",
      value: file.name,
      confirmLabel: "Rename",
      maxLength: MAX_FILE_NAME,
    });
    if (!name || name === file.name) {
      return;
    }
    await change("PATCH", `api/files?id=${file.id}`, { name }, "Could not rename file");
  };

  const chooseFileTarget = async (id: string) => {
    const file = fileById(id)!;
    const folder = await chooseFolder({ title: `Move »${file.name}« to…`, current: current() });
    if (folder !== undefined) {
      await moveFile(file.id, folder);
    }
  };

  const chooseFolderTarget = async (id: string) => {
    const folder = folderById(id)!;
    const parent = await chooseFolder({
      title: `Move »${folder.name}« to…`,
      current: current(),
      exclude: folder.id,
    });
    if (parent !== undefined) {
      await moveFolder(folder.id, parent);
    }
  };

  const deleteFile = async (id: string) => {
    const name = fileById(id)?.name ?? "this file";
    const ok = await confirmDialog({
      title: "Delete file?",
      message: `»${name}« will be deleted permanently.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) {
      return;
    }
    let res = await request("DELETE", `api/files?id=${id}`);
    if (!res.ok && res.status === 409) {
      const usage = res.usage ?? [];
      const force = await confirmDialog({
        title: "File is in use",
        message: (
          <>
            <p>»{name}« is used on these pages. Their images and links will break:</p>
            <ul>
              {usage.map((p) => (
                <li>
                  <a href={`edit?id=${p.id}`}>{p.title}</a> <code>{p.slug}</code>
                  {p.historyOnly && <small> (earlier versions only)</small>}
                </li>
              ))}
            </ul>
          </>
        ),
        confirmLabel: "Delete anyway",
        danger: true,
      });
      if (!force) {
        return;
      }
      res = await request("DELETE", `api/files?id=${id}&force=1`);
    }
    setMessages(res.ok ? [] : [res.error]);
    await reload();
  };

  /** What a click does, by the data attribute of the clicked element (its value is passed on). */
  const clickActions: Record<string, (value: string) => unknown> = {
    "data-open-folder": (id) => open(folderIdOf(id)),
    "data-upload": async () => upload(await chooseFiles({ multiple: true })),
    "data-new-folder": createFolder,
    "data-rename-folder": renameFolder,
    "data-delete-folder": deleteFolder,
    "data-rename-file": renameFile,
    "data-move": chooseFileTarget,
    "data-move-folder": chooseFolderTarget,
    "data-delete": deleteFile,
  };

  return { clickActions, moveFile, moveFolder };
}
