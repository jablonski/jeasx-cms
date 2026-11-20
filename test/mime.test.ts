import { detectType } from "@cms/media/mime";
import assert from "node:assert/strict";
import { test } from "node:test";

const hex = (s: string) => Buffer.from(s, "hex");
const latin = (s: string) => Buffer.from(s, "latin1");

test("images and PDFs are recognized by their content", () => {
  assert.deepEqual(detectType(hex("ffd8ffe000"), "x.txt"), { ext: "jpg", mime: "image/jpeg" });
  assert.deepEqual(detectType(hex("89504e470d0a1a0a00"), "x"), { ext: "png", mime: "image/png" });
  assert.deepEqual(detectType(latin("GIF89a"), "x.png"), { ext: "gif", mime: "image/gif" });
  assert.deepEqual(detectType(latin("RIFF\0\0\0\0WEBPVP8 "), "x"), {
    ext: "webp",
    mime: "image/webp",
  });
  assert.deepEqual(detectType(latin("\0\0\0\x1cftypavif"), "x"), {
    ext: "avif",
    mime: "image/avif",
  });
  assert.deepEqual(detectType(latin("%PDF-1.7"), "x.jpg"), { ext: "pdf", mime: "application/pdf" });
});

test("a trusted extension without matching content is not trusted", () => {
  assert.deepEqual(detectType(latin("<html>"), "evil.png"), {
    ext: "png",
    mime: "application/octet-stream",
  });
  assert.deepEqual(detectType(latin("RIFF\0\0\0\0WAVE"), "a.webp"), {
    ext: "webp",
    mime: "application/octet-stream",
  });
});

test("other files get their type from the extension, case-insensitively", () => {
  assert.deepEqual(detectType(latin("a,b"), "Data.CSV"), { ext: "csv", mime: "text/csv" });
  assert.deepEqual(detectType(latin("x"), "archive.tar.gz"), {
    ext: "gz",
    mime: "application/gzip",
  });
});

test("scripts, unknown and missing extensions are sent as binary data", () => {
  for (const name of [
    "app.js",
    "file.xyz",
    "noext",
    "trailing.",
    "toString.toString",
    "x.__proto__",
  ]) {
    assert.equal(detectType(latin("x"), name).mime, "application/octet-stream", name);
  }
  assert.equal(detectType(latin("x"), "noext").ext, "bin");
  assert.equal(detectType(Buffer.alloc(0), "empty").ext, "bin");
});
