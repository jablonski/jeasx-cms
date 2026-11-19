/** Folders of the file library (server only, table "folders"). */
import { execute, insert, queryAll, queryOne, transaction } from "@cms/core/db";
import { parseId } from "@cms/core/id";
import { type Result, resultOf } from "@cms/core/result";

export interface Folder {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
}

/** A folder with the number of files and subfolders it contains directly. */
export interface FolderSummary extends Folder {
  fileCount: number;
  folderCount: number;
}

// Folders are virtual (database only): files keep their content-hash names on disk,
// so moving a file never changes its URL.

/** A row of the table "folders". */
interface FolderRow {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

const toFolder = (row: FolderRow): Folder => ({
  id: row.id,
  name: row.name,
  parentId: row.parent_id ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** A folder reference from user input: its id, null for the root, undefined if invalid. */
export function parseFolderId(value: unknown): number | null | undefined {
  if (value == null || value === "" || value === "root") {
    return null;
  }
  return parseId(value) ?? undefined;
}

/** Does the parsed reference lead to a place files can be in? */
export const folderExists = (id: number | null | undefined): id is number | null =>
  id === null || (id !== undefined && getFolder(id) !== undefined);

export function getFolder(id: number | null): Folder | undefined {
  const row = queryOne<FolderRow>("SELECT * FROM folders WHERE id = ?", id);
  return row && toFolder(row);
}

/** All folders with the number of files and subfolders they contain directly. */
export function listFolders(): FolderSummary[] {
  const rows = queryAll<FolderRow & { fileCount: number; folderCount: number }>(
    `SELECT f.*,
       (SELECT COUNT(*) FROM files WHERE folder_id = f.id) AS fileCount,
       (SELECT COUNT(*) FROM folders c WHERE c.parent_id = f.id) AS folderCount
     FROM folders f ORDER BY f.name COLLATE NOCASE`,
  );
  return rows.map((r) => ({ ...toFolder(r), fileCount: r.fileCount, folderCount: r.folderCount }));
}

const MAX_FOLDER_NAME = 80;

function checkName(
  name: string,
  parentId: number | null,
  exceptId: number | null = null,
): { error: string } | null {
  if (!name) {
    return { error: "Please enter a name" };
  }
  if (name.length > MAX_FOLDER_NAME) {
    return { error: `Name is too long (max. ${MAX_FOLDER_NAME} characters)` };
  }
  const clash = queryOne(
    "SELECT id FROM folders WHERE parent_id IS ? AND name = ? COLLATE NOCASE AND id IS NOT ?",
    parentId,
    name,
    exceptId,
  );
  return clash ? { error: `A folder named »${name}« already exists here` } : null;
}

export const cleanName = (name: unknown) =>
  String(name ?? "")
    .replace(/[\p{Cc}/\\]/gu, "")
    .trim();

export function createFolder(name: unknown, parent: unknown): Result<"folder", Folder> {
  const parentId = parseFolderId(parent);
  if (!folderExists(parentId)) {
    return { error: "Parent folder not found" };
  }
  const newName = cleanName(name);
  const problem = checkName(newName, parentId);
  if (problem) {
    return problem;
  }
  const id = insert("INSERT INTO folders (name, parent_id) VALUES (?, ?)", newName, parentId);
  return resultOf("folder", getFolder(id), "Folder not found");
}

/**
 * Renames and/or moves a folder. A folder can't be moved into itself or its subfolders.
 */
export function updateFolder(
  id: number | null,
  { name, parent }: { name?: unknown; parent?: unknown } = {},
): Result<"folder", Folder> {
  const folder = getFolder(id);
  if (!folder) {
    return { error: "Folder not found" };
  }
  const parentId = parent === undefined ? folder.parentId : parseFolderId(parent);
  if (!folderExists(parentId)) {
    return { error: "Target folder not found" };
  }
  for (let p = parentId; p != null; p = getFolder(p)?.parentId ?? null) {
    if (p === folder.id) {
      return { error: "A folder can't be moved into itself" };
    }
  }
  const newName = name === undefined ? folder.name : cleanName(name);
  const problem = checkName(newName, parentId, folder.id);
  if (problem) {
    return problem;
  }
  moveFolder(folder.id, newName, parentId);
  return resultOf("folder", getFolder(folder.id), "Folder not found");
}

/** Deletes a folder; its files and subfolders move up to the parent folder (nothing is lost). */
export function deleteFolder(id: number | null): boolean {
  const folder = getFolder(id);
  if (!folder) {
    return false;
  }
  transaction(() => {
    // Frees its name: a subfolder of the same name can take its place.
    execute("UPDATE folders SET name = '' WHERE id = ?", folder.id);
    execute("UPDATE files SET folder_id = ? WHERE folder_id = ?", folder.parentId, folder.id);
    const children = queryAll<FolderRow>("SELECT * FROM folders WHERE parent_id = ?", folder.id);
    for (const child of children) {
      moveFolder(child.id, freeName(child, folder.parentId), folder.parentId);
    }
    execute("DELETE FROM folders WHERE id = ?", folder.id);
  });
  return true;
}

function moveFolder(id: number, name: string, parentId: number | null) {
  execute("UPDATE folders SET name = ?, parent_id = ? WHERE id = ?", name, parentId, id);
}

/** The folder's name, with a suffix if it clashes in `parentId`; long names are shortened to fit. */
function freeName({ id, name }: FolderRow, parentId: number | null): string {
  let free = name;
  for (let i = 2; checkName(free, parentId, id); i++) {
    const suffix = ` (${i})`;
    free = `${name.slice(0, MAX_FOLDER_NAME - suffix.length).trimEnd()}${suffix}`;
  }
  return free;
}
