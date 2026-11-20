import { assertValid, validateBlocks, validateSite } from "@cms/content/config-validation";
import assert from "node:assert/strict";
import { test } from "node:test";

const block = (extra: object = {}) => ({
  type: "text",
  label: "Text",
  fields: {},
  Component: () => null,
  ...extra,
});
const pages = { page: { label: "Page", fields: {}, blocks: ["text"] } };

test("validateBlocks accepts a valid configuration", () => {
  assert.deepEqual(validateBlocks([block()], pages), []);
});

test("validateBlocks reports every problem", () => {
  const fields = {
    bad: { type: "nope", label: "Bad" },
    choice: { type: "select", label: "Choice", options: [] },
  };
  const errors = validateBlocks([block({ fields }), block()], {
    page: { label: "Page", fields: {}, blocks: ["missing"], initialBlocks: ["other"] },
  });
  for (const problem of [
    /unknown type "nope"/,
    /select needs/,
    /more than one/,
    /unknown block type "missing"/,
    /initial block "other"/,
  ]) {
    assert.ok(
      errors.some((e) => problem.test(e)),
      String(problem),
    );
  }
});

test("validateBlocks reserves the page's own names for page fields", () => {
  const errors = validateBlocks([block()], {
    page: {
      label: "Page",
      fields: {
        blocks: { type: "text", label: "Blocks" },
        slug: { type: "text", label: "Slug" },
      },
      blocks: ["text"],
    },
  });
  assert.ok(errors.some((e) => /"blocks" is reserved/.test(e)));
  assert.ok(errors.some((e) => /"slug" is reserved/.test(e)));
});

test("validateSite checks the stylesheets and assertValid lists problems", () => {
  assert.deepEqual(validateSite({ stylesheets: ["/a.css"], files: "/files" }), []);
  assert.equal(validateSite({ stylesheets: ["a.css"], files: "/files" }).length, 1);
  for (const files of [undefined, "files", "/", "/files/"]) {
    assert.equal(validateSite({ stylesheets: [], files }).length, 1, String(files));
  }
  assert.throws(() => assertValid(["one", "two"]), /one\n {2}- two/);
});
