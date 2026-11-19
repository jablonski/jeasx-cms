import "./setup";
import assert from "node:assert/strict";
import { test } from "node:test";
import { isContainer } from "@cms/shared/block-tree";
import { BLOCKS } from "@cms/shared/blocks";

test("isContainer finds blocks at any depth of nested lists", (t) => {
  t.after(() => delete BLOCKS.deep);
  const blocks = { type: "blocks", label: "Content", blocks: ["text"] } as const;
  const inner = { type: "list", label: "Inner", fields: { blocks } } as const;
  BLOCKS.deep = {
    type: "deep",
    label: "Deep",
    fields: { outer: { type: "list", label: "Outer", fields: { inner } } },
    Component: () => null,
  };
  assert.equal(isContainer("deep"), true);
  assert.equal(isContainer("section"), true);
  assert.equal(isContainer("text"), false);
});
