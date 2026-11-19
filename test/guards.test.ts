import assert from "node:assert/strict";
import { test } from "node:test";
import adminGuard from "../src/@cms/[...guard]";
import apiGuard from "../src/@cms/api/[...guard]";
import "./setup";

process.env.CMS_ADMIN_PASSWORD = "a password for the tests";

function run(
  guard: (...args: any[]) => unknown,
  method: string,
  path: string,
  headers: object = {},
) {
  const res = { status: 200, redirect: "" };
  const reply: any = {
    header: () => reply,
    status: (code: number) => ((res.status = code), reply),
    send: () => reply,
    redirect: (url: string, code: number) => ((res.status = code), (res.redirect = url), reply),
  };
  const request = { method, path, url: path, headers, route: "/@cms/[...guard]" };
  guard.call({}, { request, reply });
  return res;
}

test("without a session the admin only offers its login", () => {
  assert.equal(run(adminGuard, "GET", "/@cms/api/users").status, 401);
  assert.equal(run(adminGuard, "POST", "/@cms/api/pages").status, 401);
  assert.match(run(adminGuard, "GET", "/@cms/files").redirect, /^\/@cms\/login\?next=/);
  assert.match(
    run(adminGuard, "GET", "/@cms/files/?folder=1").redirect,
    /next=%2F%40cms%2Ffiles%3Ffolder%3D1$/,
  );
  assert.equal(run(adminGuard, "GET", "/@cms/login").status, 200);
  assert.equal(run(adminGuard, "POST", "/@cms/logout").status, 200);
  assert.equal(run(adminGuard, "GET", "/@cms/browser/styles/index.css").status, 200);
});

test("the way back after signing in ignores trailing slashes in linear time", () => {
  const start = performance.now();
  const url = `/@cms/${"/".repeat(100_000)}x`;
  assert.equal(run(adminGuard, "GET", url).status, 303);
  assert.ok(performance.now() - start < 50);
});

test("API changes need the header cross-site requests can't send", () => {
  assert.equal(run(apiGuard, "POST", "/@cms/api/pages").status, 403);
  assert.equal(run(apiGuard, "DELETE", "/@cms/api/pages").status, 403);
  assert.equal(
    run(apiGuard, "POST", "/@cms/api/pages", { "x-requested-with": "JeasxCMS" }).status,
    200,
  );
  assert.equal(run(apiGuard, "GET", "/@cms/api/pages").status, 200);
});
