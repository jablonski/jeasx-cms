import "./setup";
import assert from "node:assert/strict";
import { test } from "node:test";
import { limitedAttempt, lockedSeconds, recordFailure } from "@cms/auth/login-limit";
import { safeNext } from "@cms/auth/safe-next";
import {
  currentSession,
  endSession,
  endSessions,
  isCrossSite,
  startSession,
} from "@cms/auth/sessions";
import {
  confirmPassword,
  createUser,
  deleteUser,
  ensureInitialUser,
  initialPassword,
  updateUser,
  verifyCredentials,
} from "@cms/auth/users";
import type { FastifyReply, FastifyRequest } from "fastify";

const PASSWORD = "correct horse battery";

const requestWith = (headers: Record<string, string>) =>
  ({ headers, protocol: "http" }) as unknown as FastifyRequest;

/** Signs in and returns a request carrying the new session cookie. */
function signIn(userId: number) {
  let cookie = "";
  const reply = {
    header: (_name: string, value: string) => (cookie = value),
  } as unknown as FastifyReply;
  startSession(requestWith({}), reply, userId, "/@cms");
  return { request: requestWith({ cookie: cookie.split(";")[0] }), reply, cookie };
}

const newUser = async (username: string) =>
  (await createUser({ username, password: PASSWORD })).user!;

test("the start password is only predictable in development", (t) => {
  t.mock.method(console, "warn", () => {});
  assert.equal(initialPassword({ NODE_ENV: "development" }), "admin");
  assert.equal(initialPassword({ CMS_ADMIN_PASSWORD: PASSWORD }), PASSWORD);
  for (const env of [{}, { NODE_ENV: "production" }, { CMS_ADMIN_PASSWORD: "short" }]) {
    assert.ok(initialPassword(env).length >= 20);
  }
});

test("the first user is created only while there are no users", async (t) => {
  t.mock.method(console, "warn", () => {});
  process.env.NODE_ENV = "development";
  ensureInitialUser();
  assert.equal((await verifyCredentials("admin", "admin"))?.role, "admin");
  await updateUser((await verifyCredentials("admin", "admin"))!.id, { password: PASSWORD });
  ensureInitialUser();
  assert.equal(await verifyCredentials("admin", "admin"), undefined);
});

test("createUser validates its input", async () => {
  assert.match((await createUser({ username: "x", password: PASSWORD })).error!, /Usernames/);
  assert.match((await createUser({ username: "short", password: "short" })).error!, /at least/);
  assert.match(
    (await createUser({ username: "badrole", password: PASSWORD, role: "root" })).error!,
    /role/,
  );
  await newUser("taken");
  assert.match(
    (await createUser({ username: "TAKEN", password: PASSWORD })).error!,
    /already taken/,
  );
});

test("verifyCredentials accepts only the right password", async () => {
  const user = await newUser("verify");
  assert.equal((await verifyCredentials("verify", PASSWORD))?.id, user.id);
  assert.equal(await verifyCredentials("verify", "wrong password"), undefined);
  assert.equal(await verifyCredentials("nobody", PASSWORD), undefined);
  assert.equal(await verifyCredentials("nobody", ""), undefined);
});

test("updateUser keeps the password unless a new one is given", async () => {
  const user = await newUser("update");
  await updateUser(user.id, { role: "admin" });
  assert.equal((await verifyCredentials("update", PASSWORD))?.role, "admin");
  assert.match((await updateUser(user.id, { password: "short" })).error!, /at least/);
});

test("sessions identify their user until they end", async () => {
  const user = await newUser("session");
  const { request, reply, cookie } = signIn(user.id);
  assert.match(cookie, /HttpOnly; SameSite=Lax/);
  assert.equal(currentSession(request)?.userId, user.id);
  endSession(request, reply, "/@cms");
  assert.equal(currentSession(request), undefined);
  assert.equal(currentSession(requestWith({ cookie: "cms_session=forged" })), undefined);
});

test("endSessions keeps only the given session", async () => {
  const user = await newUser("devices");
  const first = signIn(user.id).request;
  const second = signIn(user.id).request;
  endSessions(user.id, currentSession(first)!.tokenHash);
  assert.ok(currentSession(first));
  assert.equal(currentSession(second), undefined);
});

test("deleting a user ends their sessions", async () => {
  const user = await newUser("deleted");
  const { request } = signIn(user.id);
  assert.equal(deleteUser(user.id), true);
  assert.equal(currentSession(request), undefined);
});

test("isCrossSite rejects requests from other sites", () => {
  assert.equal(isCrossSite(requestWith({ "sec-fetch-site": "cross-site" })), true);
  assert.equal(isCrossSite(requestWith({ "sec-fetch-site": "same-site" })), true);
  assert.equal(isCrossSite(requestWith({ "sec-fetch-site": "same-origin" })), false);
  assert.equal(isCrossSite(requestWith({})), false);
});

test("confirming a password counts wrong guesses and locks them out", async () => {
  const { user } = await createUser({ username: "confirmer", password: "correct password" });
  assert.equal(await confirmPassword("7.7.7.7", user!.id, "correct password"), "ok");
  for (let i = 0; i < 5; i++) {
    assert.equal(await confirmPassword("7.7.7.7", user!.id, "nope"), "wrong");
  }
  assert.equal(await confirmPassword("7.7.7.7", user!.id, "correct password"), "locked");
});

test("sign-ins lock per client", () => {
  for (let i = 0; i < 5; i++) {
    recordFailure("192.0.2.1", `user${i}`);
  }
  assert.ok(lockedSeconds("192.0.2.1", "other") > 0);
  assert.equal(lockedSeconds("192.0.2.2", "other"), 0);
});

test("signing in to an own account doesn't reset guesses at other accounts", async () => {
  const guess = (username: string) => limitedAttempt("192.0.2.50", username, async () => false);
  const signIn = () => limitedAttempt("192.0.2.50", "own-account", async () => true);
  for (let round = 0; round < 2; round++) {
    assert.equal((await guess(`victim${round}a`)).outcome, "failed");
    assert.equal((await guess(`victim${round}b`)).outcome, "failed");
    assert.equal((await signIn()).outcome, "ok");
  }
  assert.equal((await guess("victim-last")).outcome, "failed");
  assert.equal((await guess("victim-locked")).outcome, "locked");
});

test("a correct password clears the failures of its account", async () => {
  for (let i = 0; i < 19; i++) {
    recordFailure(`198.51.101.${i}`, "returning");
  }
  await limitedAttempt("203.0.113.20", "returning", async () => true);
  recordFailure("198.51.101.100", "returning");
  assert.equal(lockedSeconds("203.0.113.21", "returning"), 0);
});

test("after signing in, only paths of the admin are followed", () => {
  for (const next of ["/@cms", "/@cms/files", "/@cms?a=1", "/@cms/edit?id=1"]) {
    assert.equal(safeNext(next, "/@cms"), next);
  }
  for (const next of [
    null,
    "//evil.example",
    "https://evil.example",
    "/@cmsevil",
    "/@cms/../../evil",
    "/@cms/%2e%2e/evil",
    "/@cms\\@evil.example",
    "/@cms/login",
    "/@cms/x/../login",
  ]) {
    assert.equal(safeNext(next, "/@cms"), "/@cms");
  }
});

test("addresses of one IPv6 network share their limit", () => {
  for (let i = 0; i < 5; i++) {
    recordFailure(`2001:db8:1:2::${i + 1}`, `v6user${i}`);
  }
  assert.ok(lockedSeconds("2001:db8:1:2:ffff::9", "other") > 0);
  assert.equal(lockedSeconds("2001:db8:1:3::1", "other"), 0);
});

test("guessing one account from many addresses locks it", () => {
  for (let i = 0; i < 20; i++) {
    recordFailure(`198.51.100.${i}`, "Target");
  }
  assert.ok(lockedSeconds("203.0.113.9", "target") > 0);
});
