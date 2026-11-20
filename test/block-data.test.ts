import { normalizeBlocks } from "@cms/universal/block-data";
import assert from "node:assert/strict";
import { test } from "node:test";
import "./setup";

test("stored blocks get the fields added to their type later", () => {
  const [block] = normalizeBlocks([{ id: "a", type: "section", data: {} }]);
  assert.deepEqual(block.data.blocks, []);
});

test("normalizeBlocks stops at the nesting limit", () => {
  let blocks: unknown[] = [];
  for (let i = 0; i < 50_000; i++) {
    blocks = [{ id: "a", type: "section", data: { blocks } }];
  }
  assert.equal(normalizeBlocks(blocks).length, 1);
});
