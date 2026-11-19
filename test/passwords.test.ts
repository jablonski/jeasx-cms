import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, hashPasswordSync, matchesHash } from "@cms/auth/passwords";

test("a password matches its own hash and nothing else", async () => {
  const hash = await hashPassword("secret one");
  assert.equal(await matchesHash("secret one", hash), true);
  assert.equal(await matchesHash("secret two", hash), false);
  assert.equal(await matchesHash("", hash), false);
});

test("hashes carry their parameters and a fresh salt", async () => {
  const a = await hashPassword("same");
  const b = await hashPassword("same");
  assert.match(a, /^scrypt\$32768\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  assert.notEqual(a, b);
});

test("sync and async hashes are interchangeable", async () => {
  assert.equal(await matchesHash("start", hashPasswordSync("start")), true);
});

test("hashes with older, weaker parameters still verify", async () => {
  const { scryptSync, randomBytes } = await import("node:crypto");
  const salt = randomBytes(16);
  const key = scryptSync("legacy", salt, 32, { N: 1024, r: 8, p: 1 });
  const stored = `scrypt$1024$8$1$${salt.toString("base64")}$${key.toString("base64")}`;
  assert.equal(await matchesHash("legacy", stored), true);
  assert.equal(await matchesHash("other", stored), false);
});
