import "./setup";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanName,
  createFolder,
  deleteFolder,
  getFolder,
  listFolders,
  parseFolderId,
  updateFolder,
} from "@cms/media/folders";

const make = (name: string, parent: unknown = null) => {
  const result = createFolder(name, parent);
  assert.equal(result.error, undefined);
  return result.folder!;
};

test("parseFolderId accepts ids and the root, nothing else", () => {
  for (const root of [null, undefined, "", "root"]) {
    assert.equal(parseFolderId(root), null);
  }
  assert.equal(parseFolderId("7"), 7);
  assert.equal(parseFolderId(7), 7);
  for (const bad of ["abc", "-1", "1.5", {}, []]) {
    assert.equal(parseFolderId(bad), undefined, String(bad));
  }
});

test("cleanName strips slashes and control characters", () => {
  assert.equal(cleanName("  a/b\\c\u0000\n "), "abc");
  assert.equal(cleanName(undefined), "");
});

test("createFolder validates names and parents", () => {
  assert.match(createFolder("   ", null).error!, /enter a name/);
  assert.match(createFolder("x".repeat(81), null).error!, /too long/);
  assert.match(createFolder("Orphan", 999999).error!, /Parent folder not found/);
  assert.match(createFolder("Orphan", "nonsense").error!, /Parent folder not found/);
  const parent = make("Create Parent");
  assert.match(createFolder("create parent", null).error!, /already exists/);
  // The same name is fine in another folder.
  assert.equal(make("Create Parent", parent.id).parentId, parent.id);
});

test("updateFolder renames, moves, and refuses cycles", () => {
  const a = make("Cycle A");
  const b = make("Cycle B", a.id);
  const c = make("Cycle C", b.id);
  assert.match(updateFolder(a.id, { parent: a.id }).error!, /into itself/);
  assert.match(updateFolder(a.id, { parent: c.id }).error!, /into itself/);
  assert.match(updateFolder(a.id, { parent: 999999 }).error!, /Target folder not found/);
  assert.match(updateFolder(999999, { name: "x" }).error!, /Folder not found/);

  // Renaming to its own name in another case is not a clash with itself.
  assert.equal(updateFolder(a.id, { name: "cycle a" }).folder!.name, "cycle a");
  const moved = updateFolder(c.id, { parent: "root" }).folder!;
  assert.equal(moved.parentId, null);
  assert.equal(moved.name, "Cycle C");
});

test("updateFolder refuses a move that would clash in the target", () => {
  const target = make("Clash Target");
  make("Dup", target.id);
  const other = make("Dup");
  assert.match(updateFolder(other.id, { parent: target.id }).error!, /already exists/);
  assert.equal(getFolder(other.id)!.parentId, null);
});

test("listFolders counts direct subfolders", () => {
  const top = make("Counted");
  const mid = make("Mid", top.id);
  make("Leaf", mid.id);
  const summary = listFolders().find((f) => f.id === top.id)!;
  assert.equal(summary.folderCount, 1);
  assert.equal(summary.fileCount, 0);
});

test("deleteFolder moves subfolders up and reports unknown folders", () => {
  const top = make("Delete Top");
  const child = make("Delete Child", top.id);
  assert.equal(deleteFolder(top.id), true);
  assert.equal(getFolder(top.id), undefined);
  assert.equal(getFolder(child.id)!.parentId, null);
  assert.equal(deleteFolder(top.id), false);
  assert.equal(deleteFolder(null), false);
});
