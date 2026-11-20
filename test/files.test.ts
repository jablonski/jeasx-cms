import { savePage } from "@cms/content/pages";
import {
  browse,
  deleteFile,
  deleteUnusedFile,
  fileUsage,
  getFile,
  saveFile,
  updateFile,
} from "@cms/media/files";
import { createFolder, deleteFolder, getFolder } from "@cms/media/folders";
import { fileSlug } from "@cms/universal/file-url";
import { truncate } from "@cms/universal/text";
import assert from "node:assert/strict";
import { test } from "node:test";
import "./setup";

test("uploading a stored file again reports it and leaves it where it is", async () => {
  const content = Buffer.from("same content");
  const target = createFolder("Upload target", null).folder!;
  const first = await saveFile(content, "first.txt");
  assert.equal(first.duplicate, undefined);

  const second = await saveFile(content, "second.txt", target.id);
  assert.equal(second.duplicate, true);
  assert.equal(second.file?.id, first.file?.id);
  assert.equal(second.file?.name, "first.txt");
  assert.equal(second.file?.folderId, null);
});

test("deleting a folder renames subfolders that clash in the parent", () => {
  const parent = createFolder("Clash parent", null).folder!;
  const child = createFolder("Child", parent.id).folder!;
  createFolder("Photos", parent.id);
  const moved = createFolder("Photos", child.id).folder!;

  assert.equal(deleteFolder(child.id), true);
  assert.equal(getFolder(moved.id)?.name, "Photos (2)");
  assert.equal(getFolder(moved.id)?.parentId, parent.id);
});

test("deleting a folder shortens clashing names that are already at the limit", () => {
  const name = "x".repeat(80);
  const parent = createFolder("Long parent", null).folder!;
  const child = createFolder("Child", parent.id).folder!;
  createFolder(name, parent.id);
  const moved = createFolder(name, child.id).folder!;

  assert.equal(deleteFolder(child.id), true);
  assert.equal(getFolder(moved.id)?.name, `${"x".repeat(76)} (2)`);
});

const page = (slug: string, blocks: unknown[]) => ({
  type: "page",
  title: "T",
  slug,
  blocks,
});

test("a long file name with an emoji at the cut keeps its folder usable", async () => {
  const name = `${"a".repeat(119)}😀${"b".repeat(100)}😀.txt`;
  const { file } = await saveFile(Buffer.from("emoji at the cut"), name);
  assert.ok(file!.name.isWellFormed());
  assert.ok(file!.name.length <= 200);
  assert.doesNotThrow(() => decodeURIComponent(file!.url));
  assert.ok(browse(null)!.files.some((f) => f.id === file!.id));
  assert.equal(await deleteFile(file!.id), true);
  assert.equal(getFile(file!.id), undefined);
});

test("file names stay usable in URLs and downloads", () => {
  assert.equal(fileSlug("firmware.bin", "bin"), "firmware.bin");
  assert.equal(fileSlug("no-extension", "bin"), "no-extension");
  assert.equal(fileSlug("..", "bin"), "file");
  assert.equal(fileSlug(".", "bin"), "file");
  assert.equal(fileSlug("Photo.PNG", "png"), "Photo.png");
});

test("an extension named like an object's method is stored as binary data", async () => {
  const { file } = await saveFile(Buffer.from("odd extension"), "odd.constructor");
  assert.equal(file!.mime, "application/octet-stream");
});

test("names stored before the fix produce a valid URL", () => {
  assert.ok(fileSlug(`${"a".repeat(119)}😀b`, "txt").isWellFormed());
  assert.equal(truncate("ab😀", 3), "ab");
  assert.equal(truncate("ab😀", 4), "ab😀");
});

test("uploading the same content in parallel stores it once", async () => {
  const content = Buffer.from("parallel upload");
  const results = await Promise.all([1, 2, 3, 4].map((i) => saveFile(content, `p${i}.txt`)));
  assert.equal(new Set(results.map((r) => r.file?.id)).size, 1);
  assert.equal(results.filter((r) => !r.duplicate).length, 1);
});

test("updateFile applies nothing if one change is invalid", async () => {
  const { file } = await saveFile(Buffer.from("atomic update"), "before.txt");
  assert.ok(updateFile(file!.id, { name: "after.txt", folder: 999999 }).error);
  assert.equal(getFile(file!.id)?.name, "before.txt");
});

test("fileUsage reports files only used by earlier versions", async () => {
  const { file } = await saveFile(Buffer.from("old version"), "old.png");
  const blocks = [{ id: "a1", type: "text", data: { heading: "h", link: file!.url } }];
  const { page: saved } = savePage(page("/usage", blocks));
  assert.equal(fileUsage(file!.filename)[0].historyOnly, false);
  savePage({ ...saved, blocks: [] });
  assert.equal(fileUsage(file!.filename)[0].historyOnly, true);
});

test("a subfolder keeps its name when a folder of the same name is deleted", () => {
  const outer = createFolder("Same name", null).folder!;
  const inner = createFolder("Same name", outer.id).folder!;
  deleteFolder(outer.id);
  assert.equal(getFolder(inner.id)?.name, "Same name");
  assert.equal(getFolder(inner.id)?.parentId, null);
});

test("an upload named only with spaces gets the stored name", async () => {
  const { file } = await saveFile(Buffer.from("nameless upload"), "   ");
  assert.equal(file?.name, file?.filename);
});

test("files in use are only deleted when forced", async () => {
  const { file } = await saveFile(Buffer.from("referenced upload"), "used.txt");
  assert.ok(file);
  const saved = savePage({
    type: "page",
    title: "Uses a file",
    slug: "/uses-a-file",
    blocks: [{ type: "text", data: { heading: "File", link: file.url } }],
  });
  assert.ok(saved.page);
  assert.equal((await deleteUnusedFile(file, false)).length, 1);
  assert.ok(getFile(file.id));
  assert.deepEqual(await deleteUnusedFile(file, true), []);
  assert.equal(getFile(file.id), undefined);
});
