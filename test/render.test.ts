import { ROLE_LABELS } from "@cms/browser/user-admin/user-roles";
import { toHtml } from "@cms/browser/utils/to-html";
import { cacheBuster } from "@cms/core/cache-buster";
import { dbPath, filesDir } from "@cms/core/storage";
import RenderBlocks from "@cms/render/render-blocks";
import { renderCanvas } from "@cms/render/render-canvas";
import { MAX_PASSWORD, MIN_PASSWORD } from "@cms/universal/account-limits";
import { shared } from "@cms/universal/global";
import { jsxToString } from "jsx-async-runtime";
import assert from "node:assert/strict";
import { test } from "node:test";
import "./setup";

const blocks = [
  { id: "a", type: "text", data: { heading: "Hello" } },
  { id: "b", type: "unknown", data: {} },
  {
    id: "c",
    type: "section",
    data: { blocks: [{ id: "d", type: "text", data: { heading: "Inner" } }] },
  },
];

test("RenderBlocks renders known blocks and skips unknown ones", async () => {
  const html = await jsxToString(RenderBlocks({ blocks }) as any);
  assert.match(html, /data-block-id="a"/);
  assert.match(html, /data-block-id="c"/);
  assert.doesNotMatch(html, /data-block-id="b"/);
});

test("RenderBlocks accepts data that isn't a list of blocks", async () => {
  assert.equal(await jsxToString(RenderBlocks({ blocks: null }) as any), "");
  assert.equal(await jsxToString(RenderBlocks({ blocks: "nonsense" }) as any), "");
});

test("renderCanvas renders editor controls for every block", async () => {
  const html = await renderCanvas({ type: "page", blocks }, "plaintext-only");
  assert.match(html, /data-block-id="a"/);
  assert.match(html, /data-block-id="c"/);
});

test("renderCanvas renders an empty page", async () => {
  const html = await renderCanvas({ type: "page", blocks: [] }, "true");
  assert.equal(typeof html, "string");
});

test("cacheBuster appends the build id with the right separator", () => {
  process.env.BUILD_ID = "42";
  assert.equal(cacheBuster("/a.css"), "/a.css?v=42");
  assert.equal(cacheBuster("/a.css?x=1"), "/a.css?x=1&v=42");
});

test("shared creates its value once per key", () => {
  let calls = 0;
  const key = `__test${Math.random()}`;
  const first = shared(key, () => ({ n: ++calls }));
  const second = shared(key, () => ({ n: ++calls }));
  assert.equal(first, second);
  assert.equal(calls, 1);
  delete (globalThis as any)[key];
});

test("storage paths come from the environment with defaults", () => {
  const { CMS_DB, CMS_FILES } = process.env;
  try {
    delete process.env.CMS_DB;
    delete process.env.CMS_FILES;
    assert.equal(dbPath(), "data/cms.db");
    assert.equal(filesDir(), "data/files");
    process.env.CMS_DB = "/tmp/x.db";
    process.env.CMS_FILES = "/tmp/files";
    assert.equal(dbPath(), "/tmp/x.db");
    assert.equal(filesDir(), "/tmp/files");
  } finally {
    process.env.CMS_DB = CMS_DB;
    process.env.CMS_FILES = CMS_FILES;
  }
});

test("toHtml renders without awaiting", () => {
  assert.equal(toHtml(RenderBlocks({ blocks: [] })), "");
});

test("constants for accounts are consistent", () => {
  assert.ok(MIN_PASSWORD < MAX_PASSWORD);
  assert.deepEqual(Object.keys(ROLE_LABELS).sort(), ["admin", "editor"]);
});
