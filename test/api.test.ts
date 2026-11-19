import "./setup";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { test } from "node:test";
import type { Session } from "@cms/auth/sessions";
import { createUser } from "@cms/auth/users";
import filesApi from "../src/@cms/api/[files]";
import foldersApi from "../src/@cms/api/[folders]";
import previewApi from "../src/@cms/api/[preview]";
import usersApi from "../src/@cms/api/[users]";

const JSON_TYPE = { "content-type": "application/json" };

/** Calls a route with a fake request and records what it answers. */
async function call(
  route: (...args: any[]) => unknown,
  method: string,
  {
    query = {},
    body,
    headers = {},
    session,
  }: {
    query?: object;
    body?: unknown;
    headers?: Record<string, string>;
    session?: Session;
  } = {},
) {
  const res = {
    status: 200,
    type: "",
    headers: {} as Record<string, string>,
    body: undefined as any,
  };
  const reply: any = {
    status: (code: number) => ((res.status = code), reply),
    header: (name: string, value: string) => ((res.headers[name] = value), reply),
    type: (type: string) => ((res.type = type), reply),
    send: (data: unknown) => ((res.body = data), reply),
  };
  const request = { method, query, body, headers, ip: "127.0.0.1" };
  const result = await route.call({ session }, { request, reply });
  if (result !== reply) {
    res.body = result;
  }
  return res;
}

const upload = (content: string, name: string, headers: Record<string, string> = {}) => ({
  body: Readable.from([Buffer.from(content)]),
  headers: { "x-filename": encodeURIComponent(name), ...headers },
});

test("folders API creates, renames and deletes folders", async () => {
  const created = await call(foldersApi, "POST", {
    body: { name: "Api", parent: null },
    headers: JSON_TYPE,
  });
  assert.equal(created.status, 200);
  assert.equal(created.body.name, "Api");
  const id = created.body.id;

  const list = await call(foldersApi, "GET");
  assert.ok(list.body.some((f: { id: number }) => f.id === id));

  const renamed = await call(foldersApi, "PATCH", {
    query: { id: String(id) },
    body: { name: "Api 2" },
    headers: JSON_TYPE,
  });
  assert.equal(renamed.body.name, "Api 2");

  assert.deepEqual((await call(foldersApi, "DELETE", { query: { id: String(id) } })).body, {
    ok: true,
  });
  assert.equal((await call(foldersApi, "DELETE", { query: { id: String(id) } })).status, 404);
});

test("folders API rejects invalid names, unknown folders and non-JSON bodies", async () => {
  assert.equal(
    (await call(foldersApi, "POST", { body: { name: "  " }, headers: JSON_TYPE })).status,
    422,
  );
  assert.equal((await call(foldersApi, "POST", { body: { name: "x" } })).status, 415);
  assert.equal(
    (
      await call(foldersApi, "PATCH", {
        query: { id: "999999" },
        body: { name: "x" },
        headers: JSON_TYPE,
      })
    ).status,
    404,
  );
  const put = await call(foldersApi, "PUT");
  assert.equal(put.status, 405);
  assert.equal(put.headers.Allow, "GET, POST, PATCH, DELETE");
});

test("files API uploads, reports duplicates, renames and deletes files", async () => {
  const first = await call(filesApi, "POST", upload("api file content", "api.txt"));
  assert.equal(first.status, 200);
  assert.ok(first.body.id);
  assert.ok(!first.body.duplicate);

  const again = await call(filesApi, "POST", upload("api file content", "other.txt"));
  assert.equal(again.body.duplicate, true);
  assert.equal(again.body.id, first.body.id);

  const id = String(first.body.id);
  const renamed = await call(filesApi, "PATCH", {
    query: { id },
    body: { name: "renamed.txt" },
    headers: JSON_TYPE,
  });
  assert.equal(renamed.status, 200);
  assert.match(renamed.body.name, /^renamed/);

  assert.deepEqual((await call(filesApi, "DELETE", { query: { id } })).body, { ok: true });
  assert.equal((await call(filesApi, "DELETE", { query: { id } })).status, 404);
  assert.equal(
    (await call(filesApi, "PATCH", { query: { id }, body: { name: "x" }, headers: JSON_TYPE }))
      .status,
    404,
  );
});

test("files API refuses oversized uploads and unknown folders", async () => {
  const big = await call(
    filesApi,
    "POST",
    upload("x", "big.txt", { "content-length": String(11 * 1024 * 1024) }),
  );
  assert.equal(big.status, 413);
  assert.equal(
    (await call(filesApi, "POST", upload("y", "y.txt", { "x-folder": "999999" }))).status,
    422,
  );
  assert.equal((await call(filesApi, "GET", { query: { folder: "999999" } })).status, 404);
});

test("files API survives an undecodable file name", async () => {
  const res = await call(filesApi, "POST", {
    body: Readable.from([Buffer.from("bad name content")]),
    headers: { "x-filename": "%E0%A4%A" },
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.name);
});

test("files API lists the root folder", async () => {
  const res = await call(filesApi, "GET");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.files));
  assert.ok(Array.isArray(res.body.folders));
});

test("preview API renders known page types as uncached HTML", async () => {
  const res = await call(previewApi, "POST", {
    body: { page: { type: "page", blocks: [{ id: "b1", type: "text", data: { heading: "Hi" } }] } },
    headers: JSON_TYPE,
  });
  assert.equal(res.status, 200);
  assert.match(res.type, /^text\/html/);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.match(res.body, /data-block-id="b1"/);
});

test("preview API rejects unknown page types and non-JSON bodies", async () => {
  assert.equal(
    (await call(previewApi, "POST", { body: { page: { type: "nope" } }, headers: JSON_TYPE }))
      .status,
    422,
  );
  assert.equal(
    (await call(previewApi, "POST", { body: { page: null }, headers: JSON_TYPE })).status,
    422,
  );
  assert.equal((await call(previewApi, "POST", { body: {} })).status, 415);
  assert.equal((await call(previewApi, "GET")).status, 405);
});

test("users API shows editors only their own account", async () => {
  const { user: admin } = await createUser({
    username: "apiadmin",
    password: "correct-horse-battery",
    role: "admin",
  });
  const { user: editor } = await createUser({
    username: "apieditor",
    password: "correct-horse-battery",
    role: "editor",
  });
  const adminSession: Session = { userId: admin!.id, role: "admin", tokenHash: "a" };
  const editorSession: Session = { userId: editor!.id, role: "editor", tokenHash: "e" };

  const asAdmin = await call(usersApi, "GET", { session: adminSession });
  assert.equal(asAdmin.body.canManage, true);
  assert.ok(asAdmin.body.users.length >= 2);

  const asEditor = await call(usersApi, "GET", { session: editorSession });
  assert.equal(asEditor.body.canManage, false);
  assert.deepEqual(
    asEditor.body.users.map((u: { id: number }) => u.id),
    [editor!.id],
  );
  assert.equal(asEditor.body.currentUserId, editor!.id);
});

test("users API turns refusals into error answers", async () => {
  const { user: editor } = await createUser({
    username: "apieditor2",
    password: "correct-horse-battery",
    role: "editor",
  });
  const session: Session = { userId: editor!.id, role: "editor", tokenHash: "e2" };
  const add = await call(usersApi, "POST", {
    session,
    body: { username: "x", password: "y", role: "editor" },
    headers: JSON_TYPE,
  });
  assert.equal(add.status, 403);
  assert.ok(add.body.error);
  const del = await call(usersApi, "DELETE", { session, query: { id: String(editor!.id) } });
  assert.notEqual(del.status, 200);
  assert.equal((await call(usersApi, "PATCH", { session, body: {} })).status, 415);
});

test("admins can add and delete accounts through the users API", async () => {
  const { user: admin } = await createUser({
    username: "apiadmin2",
    password: "correct-horse-battery",
    role: "admin",
  });
  const session: Session = { userId: admin!.id, role: "admin", tokenHash: "a2" };
  const added = await call(usersApi, "POST", {
    session,
    body: { username: "apinew", password: "a-long-password-1", role: "editor" },
    headers: JSON_TYPE,
  });
  assert.equal(added.status, 200);
  assert.equal(added.body.username, "apinew");
  const del = await call(usersApi, "DELETE", { session, query: { id: String(added.body.id) } });
  assert.deepEqual(del.body, { ok: true });
});
