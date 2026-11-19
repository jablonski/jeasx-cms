/** Uploading, listing and choosing files (browser). */

import { request } from "@cms/browser/shared/http";
import type { Listing, UploadedFile } from "@cms/media/files";

/** A folder as shown in the admin; `error` says why its contents could not be loaded. */
export type FolderView = Listing & { error?: string };

/** @param folder target folder id (null = root) */
export async function uploadFile(file: File, folder: number | null = null) {
  const res = await request<UploadedFile>("POST", "api/files", {
    body: file,
    headers: {
      // The server detects the real type itself.
      "content-type": "application/octet-stream",
      "x-filename": encodeURIComponent(file.name),
      ...(folder != null ? { "x-folder": String(folder) } : {}),
    },
  });
  // Uploads above MAX_UPLOAD in src/@cms/api/[files].ts are rejected by the server.
  return !res.ok && res.status === 413 ? { ...res, error: "File is too large" } : res;
}

/** Contents of a folder (null = root). */
export async function browseFolder(folder: number | null): Promise<FolderView> {
  const res = await request<Listing>(
    "GET",
    `api/files${folder != null ? `?folder=${folder}` : ""}`,
  );
  if (res.ok) {
    return res.data;
  }
  const error = `This folder could not be loaded (${res.error}).`;
  return { folder: null, path: [], folders: [], files: [], error };
}

/** Contents of a folder; a folder that is gone leads to the top level. */
export async function browseFolderOrTop(folder: number | null): Promise<FolderView> {
  const listing = await browseFolder(folder);
  return folder != null && !listing.folder ? browseFolder(null) : listing;
}

/** The folder a data attribute points to: an id, or empty for the top level. */
export const folderIdOf = (value: string | null) => (value ? Number(value) : null);

/** Can the chosen file be used in an image field? */
export const isImageFile = (file: File) => file.type.startsWith("image/");

/** Opens the native file chooser; `accept` limits the choice, e.g. "image/*". */
export function chooseFiles({ multiple = false, accept = "" } = {}): Promise<File[]> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement("input"), {
      type: "file",
      accept,
      multiple,
    });
    input.addEventListener("change", () => resolve([...(input.files ?? [])]));
    input.addEventListener("cancel", () => resolve([]));
    input.click();
  });
}
