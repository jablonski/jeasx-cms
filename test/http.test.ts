import assert from "node:assert/strict";
import { test } from "node:test";
import { request } from "@cms/browser/shared/http";
import { bodyOf, queryOf, splitUrl } from "@cms/core/http";
import { parseId } from "@cms/core/id";

test("parseId only accepts positive whole numbers", () => {
  assert.equal(parseId("12"), 12);
  for (const value of ["", " ", "abc", "1.5", "1e2", "0x10", -1, 0, null, undefined, true, [5]]) {
    assert.equal(parseId(value), null);
  }
});

test("bodyOf ignores JSON that isn't an object", () => {
  for (const body of [5, "text", [1], null]) {
    assert.deepEqual(bodyOf({ body } as any), {});
  }
});

test("queryOf uses the first value of a repeated parameter", () => {
  const query = queryOf({ query: { id: ["7", "8"], force: "1" } } as any);
  assert.deepEqual(query, { id: "7", force: "1" });
});

test("failed requests explain themselves, also without a JSON answer", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("<html>", { status: 502 }));
  const res = await request("POST", "http://cms.test/api");
  assert.ok(!res.ok);
  assert.equal(res.error, "Request failed with status 502");
});

test("failed requests keep the details sent by the API", async (t) => {
  const errors = [{ message: "Title is required", path: "title" }];
  t.mock.method(globalThis, "fetch", async () => Response.json({ errors }, { status: 422 }));
  const res = await request("POST", "http://cms.test/api");
  assert.ok(!res.ok);
  assert.deepEqual(res.errors, errors);
});

test("unreachable servers are reported with status 0", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("offline");
  });
  const res = await request("GET", "http://cms.test/api");
  assert.ok(!res.ok);
  assert.equal(res.status, 0);
  assert.equal(res.error, "offline");
});

test("splitUrl separates the path from the query", () => {
  assert.deepEqual(splitUrl("/a/?b=1?c"), { pathname: "/a/", search: "?b=1?c" });
  assert.deepEqual(splitUrl("/a"), { pathname: "/a", search: "" });
});
