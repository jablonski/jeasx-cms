import { getAt } from "@cms/browser/editor/paths";
import {
  deletePage,
  getPublishedPage,
  normalizePage,
  savePage,
  type StoredPage,
} from "@cms/content/pages";
import { getRevision, listRevisions, MAX_REVISIONS } from "@cms/content/revisions";
import assert from "node:assert/strict";
import { test } from "node:test";
import "./setup";

const block = (heading: string) => ({ id: "a1", type: "text", data: { heading } });
const input = (slug: string, extra: object = {}) => ({
  type: "page",
  title: "Title",
  slug,
  blocks: [block("Hello")],
  ...extra,
});

test("savePage creates a page and only published pages are public", () => {
  const { page } = savePage(input("/draft"));
  assert.equal(page?.status, "draft");
  assert.equal(getPublishedPage("/draft"), undefined);

  savePage({ ...page, status: "published" });
  assert.equal(getPublishedPage("/draft")?.id, page?.id);
});

test("savePage rejects unknown types, reserved and duplicate paths", () => {
  assert.equal(savePage({ type: "nope" }).errors?.[0].message, "Unknown page type");
  assert.equal(savePage({ type: "constructor" }).errors?.[0].message, "Unknown page type");
  savePage(input("/taken"));
  assert.equal(savePage(input("/taken")).errors?.[0].path, "slug");
});

test("savePage never turns text without usable characters into the homepage", () => {
  for (const title of ["日本語", "Привет мир", "!!!"]) {
    const { page, errors } = savePage(input("", { title }));
    assert.equal(page, undefined);
    assert.equal(errors?.[0].path, "slug");
  }
  assert.equal(savePage(input("日本語")).errors?.[0].path, "slug");
  assert.equal(savePage(input("/", { title: "日本語" })).page?.slug, "/");
  // With a homepage in place, the path problem is still reported only once.
  assert.equal(savePage(input("", { title: "日本語" })).errors?.length, 1);
});

test("savePage detects changes made by someone else", () => {
  const { page } = savePage(input("/shared"));
  const first = savePage({ ...page, title: "Mine", baseVersion: page!.version });
  assert.equal(first.page?.version, page!.version + 1);

  const stale = savePage({ ...page, title: "Theirs", baseVersion: page!.version });
  assert.equal(stale.conflict, true);
  assert.equal(getPublishedPage("/shared"), undefined);
  assert.equal(listRevisions(page!.id).length, 1); // nothing was stored

  assert.equal(savePage({ ...page, title: "Overwrite" }).page?.title, "Overwrite");
});

test("savePage reports block errors at their position", () => {
  const { errors } = savePage(input("/invalid", { blocks: [block("ok"), block("")] }));
  assert.equal(errors?.[0].path, "blocks.1.data.heading");
});

test("savePage refuses blocks it can't store instead of dropping them", () => {
  const { page } = savePage(input("/keep"));
  const unknown = { id: "x1", type: "removed", data: { heading: "Keep me" } };
  const nested = { id: "s2", type: "section", data: {} };
  const section = { id: "s1", type: "section", data: { blocks: [nested] } };

  const first = savePage({ ...page, blocks: [block("ok"), unknown] });
  assert.equal(first.page, undefined);
  assert.equal(first.errors?.[0].path, "blocks.1");
  assert.match(first.errors![0].message, /"removed"/);

  const second = savePage({ ...page, blocks: [section] });
  assert.equal(second.errors?.[0].path, "blocks.0.data.blocks.0");
  assert.match(second.errors![0].message, /Section/);

  assert.equal(listRevisions(page!.id).length, 0); // nothing was stored
});

test("savePage validates nested blocks", () => {
  const blocks = [{ id: "s1", type: "section", data: { blocks: [block("")] } }];
  const { errors } = savePage(input("/nested", { blocks }));
  assert.equal(errors?.[0].path, "blocks.0.data.blocks.0.data.heading");
});

test("every save keeps the replaced version", () => {
  const { page } = savePage(input("/versions", { title: "First" }));
  savePage({ ...page, title: "Second" });
  const [revision] = listRevisions(page!.id);
  assert.equal(revision.title, "First");
  assert.equal(getRevision(page!.id, revision.id)?.title, "First");
});

test("saving an unchanged page keeps no revision", () => {
  const { page } = savePage(input("/unchanged"));
  const again = savePage({ ...page, baseVersion: page!.version });
  assert.equal(listRevisions(page!.id).length, 0);
  assert.equal(again.page?.version, page!.version);
  assert.equal(again.page?.updatedAt, page!.updatedAt);
  // publishing is a change, even without edits
  savePage({ ...page, status: "published" });
  assert.equal(listRevisions(page!.id).length, 1);
});

test("only the latest revisions are kept", () => {
  const { page } = savePage(input("/limit", { title: "v0" }));
  for (let i = 1; i <= MAX_REVISIONS + 2; i++) {
    savePage({ ...page, title: `v${i}` });
  }
  const revisions = listRevisions(page!.id);
  assert.equal(revisions.length, MAX_REVISIONS);
  assert.equal(revisions[0].title, `v${MAX_REVISIONS + 1}`);
});

test("deleting a page removes its revisions", () => {
  const { page } = savePage(input("/gone"));
  savePage({ ...page, title: "Changed" });
  assert.equal(deletePage(page!.id), true);
  assert.deepEqual(listRevisions(page!.id), []);
  assert.equal(deletePage(page!.id), false);
});

test("the editor gets fields added after a page was saved", () => {
  const stored: StoredPage = {
    id: 1,
    version: 1,
    updatedAt: "2026-01-01 00:00:00",
    type: "page",
    slug: "/old",
    title: "Old",
    status: "draft",
    blocks: [{ id: "s", type: "section", data: {} }],
  };
  const page = normalizePage(stored);
  assert.deepEqual(getAt(page, "blocks.0.data.blocks"), []);
  assert.equal(page.description, ""); // page fields added since get their default
  assert.equal(page.id, 1);
});
