/** User accounts of the admin (server only, table "users"). */

import { limitedAttempt } from "@cms/auth/login-limit";
import { hashPassword, hashPasswordSync, matchesHash } from "@cms/auth/passwords";
import { execute, insert, queryAll, queryOne } from "@cms/core/db";
import { type Result, resultOf } from "@cms/core/result";
import { MAX_PASSWORD, MIN_PASSWORD } from "@cms/universal/account-limits";
import { shared } from "@cms/universal/global";
import { randomBytes } from "node:crypto";

const ROLES = ["admin", "editor"] as const;
export type Role = (typeof ROLES)[number];

export interface User {
  id: number;
  username: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

/** A row of the table "users". */
interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

const USERNAME = /^[\p{L}\p{N}._@-]{2,80}$/u;

/** Compared against for unknown usernames, so they take as long as wrong passwords. */
const decoy = shared("__cmsDecoyHash", (): { hash?: string } => ({}));

const toUser = (row: UserRow): User => ({
  id: row.id,
  username: row.username,
  role: row.role,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function listUsers(): User[] {
  return queryAll<UserRow>("SELECT * FROM users ORDER BY username").map(toUser);
}

export function getUser(id: number | null): User | undefined {
  const row = queryOne<UserRow>("SELECT * FROM users WHERE id = ?", id);
  return row && toUser(row);
}

/** The user with these credentials, if they are correct. */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<User | undefined> {
  const row = queryOne<UserRow>("SELECT * FROM users WHERE username = ?", username);
  const valid = await matchesHash(
    password,
    row?.password_hash ?? (decoy.hash ??= await hashPassword("")),
  );
  return valid && row ? toUser(row) : undefined;
}

/** Is this the password of the user? */
async function verifyPassword(id: number, password: string) {
  const row = queryOne<Pick<UserRow, "password_hash">>(
    "SELECT password_hash FROM users WHERE id = ?",
    id,
  );
  return row ? matchesHash(password, row.password_hash) : false;
}

/**
 * Confirms the password of a signed-in user before a sensitive change. Guesses count
 * towards the same limits as sign-ins, so a stolen session can't try passwords freely.
 */
export async function confirmPassword(
  ip: string,
  userId: number,
  password: string,
): Promise<"ok" | "wrong" | "locked"> {
  const username = getUser(userId)?.username ?? "";
  const { outcome } = await limitedAttempt(ip, username, () => verifyPassword(userId, password));
  return outcome === "failed" ? "wrong" : outcome;
}

/**
 * Password of the start user: CMS_ADMIN_PASSWORD if set and valid, "admin" in development,
 * otherwise a random one that is written to the server log once.
 */
export function initialPassword(env: Record<string, string | undefined> = process.env) {
  const configured = env.CMS_ADMIN_PASSWORD;
  if (configured) {
    const problem = passwordProblem(configured);
    if (!problem) {
      return configured;
    }
    console.warn(`CMS_ADMIN_PASSWORD is ignored: ${problem}`);
  }
  if (env.NODE_ENV === "development") {
    return "admin";
  }
  const generated = randomBytes(18).toString("base64url");
  console.warn(`Created the user "admin" with the password: ${generated}`);
  return generated;
}

/** Creates the start user "admin" while the database has no users. */
export function ensureInitialUser() {
  if (queryOne("SELECT 1 FROM users LIMIT 1")) {
    return;
  }
  execute(
    "INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, 'admin')",
    "admin",
    hashPasswordSync(initialPassword()),
  );
}

function usernameProblem(username: string, exceptId: number | null = null) {
  if (!USERNAME.test(username)) {
    return "Usernames need 2 to 80 characters: letters, numbers, dots, dashes, underscores or @";
  }
  const clash = queryOne(
    "SELECT 1 FROM users WHERE username = ? AND id IS NOT ?",
    username,
    exceptId,
  );
  return clash ? `The username »${username}« is already taken` : null;
}

function passwordProblem(password: unknown) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD) {
    return `Passwords need at least ${MIN_PASSWORD} characters`;
  }
  return password.length > MAX_PASSWORD
    ? `Passwords can have at most ${MAX_PASSWORD} characters`
    : null;
}

const roleProblem = (role: unknown) =>
  ROLES.includes(role as Role) ? null : "Please choose a valid role";

export async function createUser({
  username,
  password,
  role = "editor",
}: Record<string, unknown>): Promise<Result<"user", User>> {
  const name = String(username ?? "").trim();
  const error = usernameProblem(name) ?? passwordProblem(password) ?? roleProblem(role);
  if (error) {
    return { error };
  }
  const hash = await hashPassword(password as string);
  // The name may have been taken while hashing.
  const taken = usernameProblem(name);
  if (taken) {
    return { error: taken };
  }
  const id = insert(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
    name,
    hash,
    role as Role,
  );
  return resultOf("user", getUser(id), "User not found");
}

/** Changes the username, the role and/or, if one is given, the password. */
export async function updateUser(
  id: number | null,
  { username, password, role }: Record<string, unknown>,
): Promise<Result<"user", User>> {
  const user = getUser(id);
  if (!user) {
    return { error: "User not found" };
  }
  const name = username === undefined ? user.username : String(username).trim();
  const newRole = role === undefined ? user.role : role;
  const error =
    usernameProblem(name, user.id) ??
    roleProblem(newRole) ??
    (password ? passwordProblem(password) : null);
  if (error) {
    return { error };
  }
  const hash = password ? await hashPassword(password as string) : null;
  // The name may have been taken while hashing.
  const taken = usernameProblem(name, user.id);
  if (taken) {
    return { error: taken };
  }
  // updated_at is set by the trigger "users_updated" (schema.ts)
  execute(
    `UPDATE users SET username = ?, role = ?, password_hash = COALESCE(?, password_hash)
     WHERE id = ?`,
    name,
    newRole as Role,
    hash,
    user.id,
  );
  return resultOf("user", getUser(user.id), "User not found");
}

/** Deletes a user; their sessions end with the account. */
export function deleteUser(id: number | null) {
  return execute("DELETE FROM users WHERE id = ?", id) > 0;
}
