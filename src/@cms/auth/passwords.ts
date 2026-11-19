/** Hashing and checking passwords with scrypt (server only). */
import { randomBytes, type ScryptOptions, scrypt, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

const derive = (password: string, salt: Buffer, length: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, length, options, (e, key) => (e ? reject(e) : resolve(key))),
  );

/** Hash with its parameters, so they can be raised later without breaking old passwords. */
function formatHash(salt: Buffer, key: Buffer) {
  const { N, r, p } = SCRYPT;
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

/** Hashing runs off the main thread, so sign-ins don't hold up other requests. */
export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH);
  return formatHash(salt, await derive(password, salt, KEY_LENGTH, SCRYPT));
}

/** Blocks the server: only for the start user, as guards wait for that account. */
export function hashPasswordSync(password: string) {
  const salt = randomBytes(SALT_LENGTH);
  return formatHash(salt, scryptSync(password, salt, KEY_LENGTH, SCRYPT));
}

export async function matchesHash(password: string, stored: string) {
  const [, N, r, p, salt, key] = stored.split("$");
  const expected = Buffer.from(key, "base64");
  const given = await derive(password, Buffer.from(salt, "base64"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  return timingSafeEqual(given, expected);
}
