import "./setup";
import assert from "node:assert/strict";
import { test } from "node:test";
import { addAccount, changeAccount, removeAccount } from "@cms/auth/account-changes";
import type { Session } from "@cms/auth/sessions";
import { createUser, getUser, type User, verifyCredentials } from "@cms/auth/users";

const PASSWORD = "correct-horse-battery";
let users = 0;

async function account(role: User["role"]) {
  const username = `${role}${++users}`;
  const { user } = await createUser({ username, password: PASSWORD, role });
  assert.ok(user);
  const session: Session = { userId: user.id, role, tokenHash: `hash-${username}` };
  return { user, session };
}

/** Every test is its own client, so wrong passwords don't add up to a lock. */
const client = () => `10.0.0.${++users}`;

test("editors can't change other accounts", async () => {
  const editor = await account("editor");
  const other = await account("editor");
  const result = await changeAccount(editor.session, client(), other.user.id, { username: "x1" });
  assert.deepEqual(result, { status: 403, error: "Only admins can do this" });
});

test("editors only change the password of their own account", async () => {
  const { user, session } = await account("editor");
  const result = await changeAccount(session, client(), user.id, {
    role: "admin",
    username: "renamed",
    password: "a-new-password-1",
    currentPassword: PASSWORD,
  });
  assert.ok("user" in result);
  assert.equal(result.user.role, "editor");
  assert.equal(result.user.username, user.username);
  assert.ok(await verifyCredentials(user.username, "a-new-password-1"));
});

test("admins can't change their own role", async () => {
  const { user, session } = await account("admin");
  const result = await changeAccount(session, client(), user.id, { role: "editor" });
  assert.deepEqual(result, { status: 422, error: "You can't change your own role" });
});

test("a new password for your own account needs the current one", async () => {
  const { user, session } = await account("admin");
  const result = await changeAccount(session, client(), user.id, {
    password: "a-new-password-2",
    currentPassword: "wrong",
  });
  assert.deepEqual(result, { status: 422, error: "Your current password is incorrect" });
  assert.ok(await verifyCredentials(user.username, PASSWORD));
});

test("admins change other accounts without their password", async () => {
  const admin = await account("admin");
  const editor = await account("editor");
  const result = await changeAccount(admin.session, client(), editor.user.id, { role: "admin" });
  assert.ok("user" in result);
  assert.equal(result.user.role, "admin");
});

test("unknown accounts are not found", async () => {
  const { session } = await account("admin");
  const result = await changeAccount(session, client(), 99999, { role: "editor" });
  assert.deepEqual(result, { status: 404, error: "Not found" });
});

test("only admins create accounts", async () => {
  const editor = await account("editor");
  const admin = await account("admin");
  const values = { username: "created1", password: PASSWORD };
  assert.deepEqual(await addAccount(editor.session, values), {
    status: 403,
    error: "Only admins can do this",
  });
  const created = await addAccount(admin.session, values);
  assert.ok("user" in created);
  assert.equal(created.user.role, "editor");
});

test("admins delete other accounts, but never their own", async () => {
  const admin = await account("admin");
  const editor = await account("editor");
  assert.equal(removeAccount(editor.session, admin.user.id)?.status, 403);
  assert.equal(removeAccount(admin.session, admin.user.id)?.status, 422);
  assert.equal(removeAccount(admin.session, editor.user.id), undefined);
  assert.equal(getUser(editor.user.id), undefined);
  assert.equal(removeAccount(admin.session, editor.user.id)?.status, 404);
});
