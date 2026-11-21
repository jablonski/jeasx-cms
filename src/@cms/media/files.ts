/** File storage (server only, table "files"): files on disk, metadata in SQLite. */
import type { Usage } from "@cms/content/pages";
import { execute, insert, queryAll, queryOne } from "@cms/core/db";
import { type Result, resultOf } from "@cms/core/result";
import { SITE } from "@cms/core/site";
import { filesDir } from "@cms/core/storage";
import {
  cleanName,
  type Folder,
  folderExists,
  type FolderSummary,
  getFolder,
  listFolders,
  parseFolderId,
} from "@cms/media/folders";
import { detectType } from "@cms/media/mime";
import { fileSlug, fileUrl, MAX_FILE_NAME } from "@cms/universal/file-url";
import { truncate } from "@cms/universal/text";
import { createHash } from "node:crypto";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface StoredFile {
  id: number;
  url: string;
  downloadName: string;
  filename: string;
  name: string;
  mime: string;
  size: number;
  folderId: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Contents of a folder (null = root) plus its breadcrumb path. */
export interface Listing {
  folder: Folder | null;
  path: Folder[];
  folders: FolderSummary[];
  files: StoredFile[];
}

/** An upload as answered by the API; a file stored already says where it is. */
export type UploadedFile = StoredFile & { duplicate?: boolean; folderName?: string | null };

const FILENAME = /^[a-f0-9]{16}\.[a-z0-9]{1,16}$/;

/** A row of the table "files". */
interface FileRow {
  id: number;
  filename: string;
  name: string;
  mime: string;
  size: number;
  folder_id: number | null;
  created_at: string;
  updated_at: string;
}

const toFile = (row: FileRow): StoredFile => ({
  id: row.id,
  url: fileUrl(SITE.files, row.filename, row.name),
  downloadName: fileSlug(row.name, row.filename.split(".")[1]),
  filename: row.filename,
  name: row.name,
  mime: row.mime,
  size: row.size,
  folderId: row.folder_id ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** The row of a file by the content hash in its name ("/" sorts right after "."; uses the index). */
const rowByHash = (hash: string) =>
  queryOne<FileRow>(
    "SELECT * FROM files WHERE filename >= ? AND filename < ?",
    `${hash}.`,
    `${hash}/`,
  );

/** The stored file with this content hash. */
function fileByHash(hash: string): StoredFile | undefined {
  const row = rowByHash(hash);
  return row && toFile(row);
}

export function getFile(id: number | null): StoredFile | undefined {
  const row = queryOne<FileRow>("SELECT * FROM files WHERE id = ?", id);
  return row && toFile(row);
}

/** The folders leading to `folder`, starting at the top level. */
function breadcrumb(folder: Folder | null | undefined, all: Folder[]): Folder[] {
  const path: Folder[] = [];
  for (let at = folder; at; at = all.find((f) => f.id === at?.parentId)) {
    path.unshift(at);
  }
  return path;
}

/** Contents of a folder (null = root) plus its breadcrumb path. */
export function browse(id: unknown): Listing | undefined {
  const folderId = parseFolderId(id);
  if (!folderExists(folderId)) {
    return undefined;
  }
  const folder = folderId === null ? null : getFolder(folderId);
  const all = listFolders();
  const rows = queryAll<FileRow>(
    "SELECT * FROM files WHERE folder_id IS ? ORDER BY created_at DESC, id DESC",
    folderId,
  );
  return {
    folder: folder ?? null,
    path: breadcrumb(folder, all),
    folders: all.filter((f) => f.parentId === folderId),
    files: rows.map(toFile),
  };
}

/**
 * Changes the display name and/or folder of a file: everything is applied, or nothing.
 * The URL changes to the new name, but old URLs keep working: files are found by their
 * hash, the name part isn't checked.
 */
export function updateFile(
  id: number | null,
  changes: { name?: unknown; folder?: unknown },
): Result<"file", StoredFile> {
  const file = getFile(id);
  if (!file) {
    return { error: "File not found" };
  }
  const name = "name" in changes ? cleanName(changes.name) : file.name;
  if (!name) {
    return { error: "Please enter a name" };
  }
  if (name.length > MAX_FILE_NAME) {
    return { error: `Name is too long (max. ${MAX_FILE_NAME} characters)` };
  }
  const folder = "folder" in changes ? parseFolderId(changes.folder) : file.folderId;
  if (!folderExists(folder)) {
    return { error: "Folder not found" };
  }
  execute("UPDATE files SET name = ?, folder_id = ? WHERE id = ?", name, folder, file.id);
  return resultOf("file", getFile(file.id), "File not found");
}

/** The stored file behind a public URL (<files>/<hash>/<name>), e.g. to show its size. */
export function getFileByUrl(url: string): StoredFile | undefined {
  const hash = /^(?:\/[^/]+)+\/([a-f0-9]{16})\/[^/]+$/.exec(String(url ?? ""))?.[1];
  return hash ? fileByHash(hash) : undefined;
}

/**
 * Stores an uploaded file. Identical files are stored once (content hash as filename):
 * uploading one again returns the stored file where it is, with `duplicate: true`.
 * @param name original file name (for display only)
 * @param folder target folder (null = root)
 */
export async function saveFile(
  buffer: Buffer,
  name: string,
  folder: unknown = null,
): Promise<Result<"file", StoredFile> & { duplicate?: boolean }> {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { error: "Empty upload" };
  }
  const { ext, mime } = detectType(buffer, String(name ?? ""));
  const folderId = parseFolderId(folder);
  if (!folderExists(folderId)) {
    return { error: "Folder not found" };
  }

  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const existing = fileByHash(hash);
  if (existing) {
    return { file: existing, duplicate: true };
  }
  const filename = `${hash}.${ext}`;

  await mkdir(filesDir(), { recursive: true });
  await writeFile(join(filesDir(), filename), buffer);
  // The same content may have been stored while this upload was being written.
  const stored = fileByHash(hash);
  if (stored) {
    if (stored.filename !== filename) {
      await rm(join(filesDir(), filename), { force: true });
    }
    return { file: stored, duplicate: true };
  }
  // The same rules as for renaming; a name of only spaces falls back to the stored one.
  const displayName = truncate(cleanName(name) || filename, MAX_FILE_NAME);
  const id = insert(
    "INSERT INTO files (filename, name, mime, size, folder_id) VALUES (?, ?, ?, ?, ?)",
    filename,
    displayName,
    mime,
    buffer.length,
    folderId,
  );
  return resultOf("file", getFile(id), "File not found");
}

/** A file that was uploaded again, with where it is stored already. */
export function withLocation(file: StoredFile): UploadedFile {
  const folderName = file.folderId === null ? null : getFolder(file.folderId)?.name;
  return { ...file, duplicate: true, folderName };
}

/** Pages that reference the file (its URL contains /<hash>/) in their current content. */
export function fileUsage(filename: string): Usage[] {
  const pattern = `%/${filename.split(".")[0]}/%`;
  return queryAll<Usage>(
    "SELECT id, title, slug FROM pages WHERE content LIKE ? ORDER BY slug",
    pattern,
  );
}

/**
 * Deletes a file unless pages reference it. Returns those pages, which keep the file;
 * empty if it was deleted.
 * @param force deletes the file even if pages reference it
 */
export async function deleteUnusedFile(file: StoredFile, force: boolean): Promise<Usage[]> {
  const usage = fileUsage(file.filename);
  if (usage.length && !force) {
    return usage;
  }
  await deleteFile(file.id);
  return [];
}

export async function deleteFile(id: number | null): Promise<boolean> {
  const row = queryOne<FileRow>("SELECT * FROM files WHERE id = ?", id);
  if (!row) {
    return false;
  }
  execute("DELETE FROM files WHERE id = ?", row.id);
  await rm(join(filesDir(), row.filename), { force: true });
  return true;
}

/**
 * Finds a file by the end of its public URL: "<hash>/<name>", with where it is on
 * disk. The name part is not checked; the hash identifies the file.
 */
export async function findFile(
  path: string,
): Promise<{ file: StoredFile; diskPath: string; size: number } | undefined> {
  const hash = /^([a-f0-9]{16})\/[^/]+$/.exec(path)?.[1];
  if (!hash) {
    return undefined;
  }
  const row = rowByHash(hash);
  if (!row || !FILENAME.test(row.filename)) {
    return undefined;
  }
  const diskPath = join(filesDir(), row.filename);
  try {
    return { file: toFile(row), diskPath, size: (await stat(diskPath)).size };
  } catch {
    return undefined;
  }
}
