import "./setup";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { test } from "node:test";
import db from "@cms/core/db";
import download from "@cms/media/file-download";
import { saveFile } from "@cms/media/files";
import { detectType } from "@cms/media/mime";

/** Calls the route and collects what it answers. */
async function get(path: string, headers: Record<string, string> = {}, query: object = {}) {
  const res = { status: 200, headers: {} as Record<string, unknown>, body: undefined as unknown };
  const reply: any = {
    status: (code: number) => ((res.status = code), reply),
    type: (value: string) => ((res.headers["content-type"] = value), reply),
    header: (name: string, value: unknown) => ((res.headers[name.toLowerCase()] = value), reply),
    send: (body: unknown) => ((res.body = body), reply),
  };
  const raw = { method: "GET", headers };
  const result = await download({ request: { ...raw, raw, path, query }, reply } as any);
  if (result instanceof Readable) {
    res.body = Buffer.concat(await result.toArray());
  } else if (result !== reply) {
    res.body = result;
  }
  return res;
}

const stored = async (content: string, name: string) =>
  (await saveFile(Buffer.from(content), name)).file!.url;

test("safe types open in the browser, sandboxed", async () => {
  const res = await get(await stored("plain text", "note.txt"));
  assert.match(String(res.headers["content-disposition"]), /^inline/);
  assert.match(String(res.headers["content-security-policy"]), /sandbox/);
  assert.equal(res.headers["x-content-type-options"], "nosniff");
});

test("HTML is always downloaded", async () => {
  const res = await get(await stored("<script>alert(1)</script>", "page.html"));
  assert.match(String(res.headers["content-disposition"]), /^attachment/);
});

test("?download forces a download", async () => {
  const res = await get(await stored("for saving", "save.txt"), {}, { download: "" });
  assert.match(String(res.headers["content-disposition"]), /^attachment/);
});

test("byte ranges are answered for media players", async () => {
  const url = await stored("0123456789", "range.txt");
  const part = await get(url, { range: "bytes=2-4" });
  assert.equal(part.status, 206);
  assert.equal(String(part.body), "234");
  assert.equal(part.headers["content-range"], "bytes 2-4/10");
  assert.equal(String((await get(url, { range: "bytes=-3" })).body), "789");
  assert.equal((await get(url, { range: "bytes=50-" })).status, 416);
});

test("unknown files answer 404", async () => {
  assert.equal((await get("/files/0000000000000000/nope.txt")).status, 404);
  assert.equal((await get("/files/../../etc/passwd")).status, 404);
});

test("uploaded JavaScript can't be loaded as a script", async () => {
  assert.equal(detectType(Buffer.from("alert(1)"), "x.js").mime, "application/octet-stream");
  const { file } = await saveFile(Buffer.from("alert('stored earlier')"), "old.js");
  db().prepare("UPDATE files SET mime = 'text/javascript' WHERE id = ?").run(file!.id);
  let type = "";
  const reply: any = {
    type: (value: string) => ((type = value), reply),
    header: () => reply,
    status: () => reply,
    removeHeader: () => reply,
    send: () => reply,
  };
  const path = new URL(file!.url, "http://x").pathname;
  const raw = { method: "HEAD", headers: {} };
  await download({ request: { ...raw, raw, path, query: {} }, reply } as any);
  assert.equal(type, "application/octet-stream");
});

test("text files are sent with their charset", async () => {
  const { file } = await saveFile(Buffer.from("Grüße"), "greeting.txt");
  const res = await get(file!.url);
  assert.equal(res.headers["content-type"], "text/plain; charset=utf-8");
});
