import assert from "node:assert/strict";
import { test } from "node:test";
import { defineBlock } from "@cms/content/blocks";

test("defineBlock infers component props from the fields", () => {
  const block = defineBlock({
    type: "typed",
    label: "Typed",
    fields: {
      title: { type: "text", label: "Title" },
      count: { type: "number", label: "Count" },
      kind: {
        type: "select",
        label: "Kind",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
      },
      items: {
        type: "list",
        label: "Items",
        fields: { active: { type: "boolean", label: "Active" } },
      },
    },
    Component({ title, count, kind, items }) {
      const text: string = title;
      const total: number = count;
      const choice: "a" | "b" = kind;
      const active: boolean | undefined = items[0]?.active;
      // @ts-expect-error numbers are not strings
      const wrong: string = count;
      // @ts-expect-error only the select's options are possible
      const unknownChoice: "c" = kind;
      // @ts-expect-error the block has no such field
      const missing = items[0]?.missing;
      return [text, total, choice, active, wrong, unknownChoice, missing];
    },
  });
  assert.equal(block.type, "typed");
});
