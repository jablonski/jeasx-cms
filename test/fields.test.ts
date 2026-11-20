import { validateBlocks } from "@cms/content/config-validation";
import { type Fields, isSafeUrl, sanitize } from "@cms/universal/fields";
import { normalizeSlug } from "@cms/universal/slug";
import assert from "node:assert/strict";
import { test } from "node:test";

test("page types can't have blocks fields, which could not be stored", () => {
  const block = { type: "text", label: "Text", fields: {}, Component: () => null };
  const nested = { type: "blocks", label: "Nested", blocks: ["text"] };
  const pageType = (fields: object) => ({ page: { label: "Page", fields, blocks: ["text"] } });

  assert.match(validateBlocks([block], pageType({ nested }))[0], /aren't supported/);
  const inList = { items: { type: "list", label: "Items", fields: { nested } } };
  assert.match(validateBlocks([block], pageType(inList))[0], /aren't supported/);
  assert.deepEqual(validateBlocks([{ ...block, fields: { nested } }], pageType({})), []);
});

const fields: Fields = {
  title: { type: "text", label: "Title", required: true },
  count: { type: "number", label: "Count", default: 3 },
  active: { type: "boolean", label: "Active" },
  kind: {
    type: "select",
    label: "Kind",
    options: [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ],
  },
  link: { type: "url", label: "Link" },
  items: {
    type: "list",
    label: "Items",
    fields: { name: { type: "text", label: "Name", required: true } },
  },
};

test("sanitize coerces values and drops unknown keys", () => {
  const { value, errors } = sanitize(fields, {
    title: "Hello",
    count: "7",
    active: "on",
    kind: "b",
    link: " /about ",
    items: [{ name: "One", extra: true }],
    unknown: 1,
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(value, {
    title: "Hello",
    count: 7,
    active: true,
    kind: "b",
    link: "/about",
    items: [{ name: "One" }],
  });
});

test("sanitize falls back to defaults for invalid values", () => {
  const { value } = sanitize(fields, { title: "x", count: "abc", kind: "nope" });
  assert.equal(value.count, 3);
  assert.equal(value.kind, "a");
});

test("sanitize reports errors with their data paths", () => {
  const { errors } = sanitize(
    fields,
    { title: " ", link: "javascript:alert(1)", items: [{ name: "" }] },
    { at: "blocks.0.data" },
  );
  assert.deepEqual(
    errors.map((e) => e.path),
    ["blocks.0.data.title", "blocks.0.data.link", "blocks.0.data.items.0.name"],
  );
});

test("isSafeUrl allows only http(s), mailto and relative URLs", () => {
  for (const url of ["/a", "a/b", "#top", "https://x.dev", "mailto:a@b.dev"]) {
    assert.equal(isSafeUrl(url), true, url);
  }
  for (const url of ["javascript:alert(1)", "java\tscript:alert(1)", "data:text/html,x"]) {
    assert.equal(isSafeUrl(url), false, url);
  }
});

test("normalizeSlug builds clean paths", () => {
  assert.equal(normalizeSlug("About Us/"), "/about-us");
  assert.equal(normalizeSlug("Über Straße"), "/uber-strasse");
  assert.equal(normalizeSlug("/a//b"), "/a/b");
  assert.equal(normalizeSlug(""), "/");
});

test("missing values get the default of their field", () => {
  const fields = {
    text: { type: "text", label: "T", default: "Read more" },
    flag: { type: "boolean", label: "F", default: true },
    link: { type: "url", label: "L", default: "/start" },
    items: {
      type: "list",
      label: "I",
      default: [{ a: "x" }],
      fields: { a: { type: "text", label: "A" } },
    },
  } as const;
  assert.deepEqual(sanitize(fields as any, {}).value, {
    text: "Read more",
    flag: true,
    link: "/start",
    items: [{ a: "x" }],
  });
  assert.deepEqual(sanitize(fields as any, { text: "", flag: false, link: "", items: [] }).value, {
    text: "",
    flag: false,
    link: "",
    items: [],
  });
});

test("normalizeSlug never leaves empty path segments", () => {
  assert.equal(normalizeSlug("/-/evil"), "/evil");
  assert.equal(normalizeSlug("/a/-/b"), "/a/b");
  assert.equal(normalizeSlug("/foo/-/-"), "/foo");
});
