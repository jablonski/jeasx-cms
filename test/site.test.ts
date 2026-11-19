import "./setup";
import assert from "node:assert/strict";
import { test } from "node:test";
import SettingsDialog from "@cms/browser/editor/settings-dialog";
import { execute } from "@cms/core/db";
import { jsxToString } from "jsx-async-runtime";
import { latestArticles } from "../src/queries";

for (const slug of ["/one", "/two", "/three"]) {
  execute(
    "INSERT INTO pages (type, slug, title, status) VALUES ('article', ?, ?, 'published')",
    slug,
    slug,
  );
}

test("latestArticles accepts every number an editor can enter", () => {
  assert.equal(latestArticles(2).length, 2);
  assert.equal(latestArticles(2.5).length, 2);
  assert.equal(latestArticles(-1).length, 0);
  assert.equal(latestArticles(1e30).length, 3);
});

test("page settings open for a page whose type is gone", async () => {
  const page = { type: "gone", slug: "/old", title: "Old", status: "draft", meta: {}, blocks: [] };
  const html = await jsxToString(SettingsDialog({ page: page as never }));
  assert.match(html, /Page settings/);
});
