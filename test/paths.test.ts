import "./setup";
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMove, checkDrop } from "@cms/browser/editor/block-moves";
import {
  allowedBlocksAt,
  blockOfPath,
  blocksAt,
  fieldAt,
  getAt,
  locate,
  move,
  renewIds,
  setAt,
} from "@cms/browser/editor/paths";

const text = (id: string) => ({ id, type: "text", data: { heading: id, link: "" } });
const draft = () => ({
  type: "page",
  meta: { description: "Meta" },
  blocks: [text("a"), { id: "s", type: "section", data: { blocks: [text("b")] } }, text("c")],
});

test("getAt and setAt follow data paths", () => {
  const page = draft();
  assert.equal(getAt(page, "blocks.1.data.blocks.0.id"), "b");
  setAt(page, "meta.description", "New");
  assert.equal(page.meta.description, "New");
});

test("locate finds nested blocks", () => {
  assert.deepEqual(locate(draft(), "b"), { path: "blocks.1.data.blocks", index: 0 });
  assert.equal(locate(draft(), "missing"), null);
});

test("fieldAt resolves meta, block and nested fields", () => {
  const page = draft();
  assert.equal(fieldAt(page, "meta.description")?.label, "Description");
  assert.equal(fieldAt(page, "blocks.0.data.heading")?.label, "Heading");
  assert.equal(fieldAt(page, "blocks.1.data.blocks.0.data.link")?.type, "url");
  assert.deepEqual(allowedBlocksAt(page, "blocks"), ["text", "section"]);
  assert.equal(fieldAt(page, "other"), undefined);
});

test("blockOfPath finds the innermost block of a field", () => {
  assert.deepEqual(blockOfPath("blocks.1.data.blocks.0.data.heading"), {
    path: "blocks.1.data.blocks",
    index: 0,
  });
  assert.deepEqual(blockOfPath("blocks.2.data.dataLabel"), { path: "blocks", index: 2 });
  assert.deepEqual(blockOfPath("blocks.3"), { path: "blocks", index: 3 });
  assert.equal(blockOfPath("meta.description"), null);
});

test("renewIds replaces the ids of nested blocks", () => {
  const copy = renewIds(structuredClone(draft().blocks[1])) as any;
  assert.notEqual(copy.id, "s");
  assert.notEqual(copy.data.blocks[0].id, "b");
});

test("move ignores targets outside the list", () => {
  const list = [1, 2, 3];
  move(list, 0, 1);
  assert.deepEqual(list, [2, 1, 3]);
  move(list, 0, -1);
  move(list, 2, 3);
  assert.deepEqual(list, [2, 1, 3]);
});

test("checkDrop enforces allowed types and blocks moves into itself", () => {
  const page = draft();
  const section = { path: "blocks", index: 1, block: page.blocks[1] };
  const plain = { path: "blocks", index: 0, block: page.blocks[0] };
  assert.equal(checkDrop(page, section, "blocks.1.data.blocks", 0), null); // into itself
  assert.equal(checkDrop(page, plain, "blocks.1.data.blocks", 0)?.noop, false);
  assert.equal(checkDrop(page, plain, "blocks", 1)?.noop, true); // stays in place
});

test("applyMove moves blocks within and between lists", () => {
  const page = draft();
  applyMove(page, { path: "blocks", index: 0, block: page.blocks[0] }, "blocks", 3);
  assert.deepEqual(
    page.blocks.map((b) => b.id),
    ["s", "c", "a"],
  );

  const other = draft();
  applyMove(other, { path: "blocks", index: 0, block: other.blocks[0] }, "blocks.1.data.blocks", 1);
  assert.deepEqual(
    other.blocks.map((b) => b.id),
    ["s", "c"],
  );
  assert.deepEqual(
    blocksAt(other, "blocks.0.data.blocks").map((b) => b.id),
    ["b", "a"],
  );
});

test("blockOfPath finds a nested block itself", () => {
  assert.deepEqual(blockOfPath("blocks.0.data.columns.1.blocks.2"), {
    path: "blocks.0.data.columns.1.blocks",
    index: 2,
  });
});

test("fieldAt finds no field on a page whose type is gone", () => {
  assert.equal(fieldAt({ type: "removed", blocks: [] }, "blocks"), undefined);
});
