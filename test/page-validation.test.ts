import "./setup";
import assert from "node:assert/strict";
import { test } from "node:test";
import type { PageType } from "@cms/content/blocks";
import { savePage } from "@cms/content/pages";
import { validatePage } from "@cms/content/page-validation";

const type: PageType = {
  label: "Page",
  fields: { description: { type: "textarea", label: "Description" } },
  blocks: ["text"],
};

test("validatePage requires a title and derives the path from it", () => {
  const missing = validatePage({ title: "  " }, "page", type, null);
  assert.ok(missing.errors.some((e) => e.path === "title"));

  const { values, errors } = validatePage({ title: " Hello World " }, "page", type, null);
  assert.deepEqual(errors, []);
  assert.equal(values.title, "Hello World");
  assert.equal(values.slug, "/hello-world");
});

test("validatePage keeps only known statuses", () => {
  const status = (s: unknown) =>
    validatePage({ title: "S", status: s }, "page", type, null).values.status;
  assert.equal(status("published"), "published");
  assert.equal(status("draft"), "draft");
  assert.equal(status("archived"), "draft");
  assert.equal(status(undefined), "draft");
});

test("validatePage allows the homepage only when asked for", () => {
  assert.equal(validatePage({ title: "Home", slug: "/" }, "page", type, null).errors.length, 0);
  const emoji = validatePage({ title: "🎉" }, "page", type, null);
  assert.deepEqual(
    emoji.errors.map((e) => e.path),
    ["slug"],
  );
});

test("validatePage reports a taken path, except for the page itself", () => {
  const saved = savePage({ type: "page", title: "Validation Taken", blocks: [] });
  assert.ok("page" in saved && saved.page, JSON.stringify(saved));
  const id = (saved as { page: { id: number } }).page.id;
  const clash = validatePage({ title: "Validation Taken" }, "page", type, null);
  assert.match(clash.errors[0].message, /already used/);
  assert.deepEqual(validatePage({ title: "Validation Taken" }, "page", type, id).errors, []);
});

test("validatePage stores meta and blocks as JSON", () => {
  const { values } = validatePage(
    { title: "Json", meta: { description: "d" }, blocks: [] },
    "page",
    type,
    null,
  );
  assert.equal(JSON.parse(values.meta).description, "d");
  assert.deepEqual(JSON.parse(values.blocks), []);
});
