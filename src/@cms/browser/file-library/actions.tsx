/** What the buttons of the file library do. */

import type { Library } from "@cms/browser/file-library/library";
import { chooseFiles, folderIdOf } from "@cms/browser/files/file-api";
import { chooseFolder } from "@cms/browser/files/folder-dialog";
import { deleteWithUsageCheck } from "@cms/browser/utils/confirm-usage";
import { alertDialog, confirmDialog, promptDialog } from "@cms/browser/utils/dialog";
import { type ApiResponse, json, request } from "@cms/browser/utils/http";
import { MAX_FILE_NAME } from "@cms/universal/file-url";
import { plural } from "@cms/universal/text";

export function createLibraryActions({
  listing,
  current,
  setMessages,
  open,
  reload,
  upload,
}: Library) {
  /** Awaits a sent change; problems are shown in a dialog. The folder is reloaded either way. */
  const change = async (sent: Promise<ApiResponse<unknown>>, failure: string) => {
    const res = await sent;
    if (!res.ok) {
      await alertDialog({ title: failure, message: res.error });
    }
    await reload();
  };

  const moveFile = (id: number | string, folder: number | null) =>
    change(json("PATCH", `api/files?id=${id}`, { folder }), "Could not move file");

  const moveFolder = (id: number | string, parent: number | null) =>
    change(json("PATCH", `api/folders?id=${id}`, { parent }), "Could not move folder");

  const folderById = (id: string | null) =>
    listing().folders.find((f) => String(f.id) === String(id));
  const fileById = (id: string | null) =>
    listing().files.find((file) => String(file.id) === String(id));

  const createFolder = async () => {
    const name = await promptDialog({ title: "New folder", label: "Name", confirmLabel: "Create" });
    if (name) {
      const created = json("POST", "api/folders", { name, parent: current() });
      await change(created, "Could not create folder");
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
    const renamed = json("PATCH", `api/folders?id=${folder.id}`, { name });
    await change(renamed, "Could not rename folder");
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
    await change(request("DELETE", `api/folders?id=${folder.id}`), "Could not delete folder");
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
    await change(json("PATCH", `api/files?id=${file.id}`, { name }), "Could not rename file");
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
    const res = await deleteWithUsageCheck(`api/files?id=${id}`, {
      title: "File is in use",
      intro: `»${name}« is used on these pages. Their images and links will break:`,
    });
    if (!res) {
      return;
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
