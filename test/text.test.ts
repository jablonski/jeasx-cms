import assert from "node:assert/strict";
import { test } from "node:test";
import { trimTrailingSlashes } from "@cms/shared/text";

test("trimTrailingSlashes removes only the slashes at the end", () => {
  assert.equal(trimTrailingSlashes("/about//"), "/about");
  assert.equal(trimTrailingSlashes("/a/b"), "/a/b");
  assert.equal(trimTrailingSlashes("/"), "");
});

test("trimTrailingSlashes stays fast on long runs of slashes", () => {
  const start = performance.now();
  trimTrailingSlashes(`${"/".repeat(200_000)}x`);
  assert.ok(performance.now() - start < 50);
});
