/** Sessions of the admin (server only, table "sessions"), kept in an HttpOnly cookie. */

import type { Role } from "@cms/auth/users";
import { execute, queryOne } from "@cms/core/db";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createHash, randomBytes } from "node:crypto";

const COOKIE = "cms_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const now = () => Math.floor(Date.now() / 1000);

/** The signed-in user's session, if the request has a valid one. */
export function currentSession(request: FastifyRequest) {
  const token = sessionToken(request);
  if (!token) {
    return undefined;
  }
  const hash = tokenHash(token);
  const row = queryOne<{ user_id: number; role: Role }>(
    `SELECT s.user_id, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
    hash,
    now(),
  );
  return row && { userId: row.user_id, role: row.role, tokenHash: hash };
}

export type Session = NonNullable<ReturnType<typeof currentSession>>;

/** Signs the user in: stores a new session and sets its cookie. */
export function startSession(
  request: FastifyRequest,
  reply: FastifyReply,
  userId: number,
  cmsPath: string,
) {
  const token = randomBytes(32).toString("base64url");
  execute("DELETE FROM sessions WHERE expires_at <= ?", now());
  execute(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    tokenHash(token),
    userId,
    now() + SESSION_SECONDS,
  );
  reply.header("Set-Cookie", cookie(request, cmsPath, token, SESSION_SECONDS));
}

/** Signs the current session out and clears its cookie. */
export function endSession(request: FastifyRequest, reply: FastifyReply, cmsPath: string) {
  const token = sessionToken(request);
  if (token) {
    execute("DELETE FROM sessions WHERE token_hash = ?", tokenHash(token));
  }
  reply.header("Set-Cookie", cookie(request, cmsPath, "", 0));
}

/** Signs a user out everywhere, except for the given session. */
export function endSessions(userId: number, exceptTokenHash: string | null = null) {
  execute(
    "DELETE FROM sessions WHERE user_id = ? AND token_hash IS NOT ?",
    userId,
    exceptTokenHash,
  );
}

/** Browsers send Sec-Fetch-Site on form posts; other clients have no session to abuse. */
export function isCrossSite(request: FastifyRequest) {
  const site = request.headers["sec-fetch-site"];
  return site !== undefined && site !== "same-origin" && site !== "none";
}

function sessionToken(request: FastifyRequest) {
  for (const part of (request.headers.cookie ?? "").split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === COOKIE) {
      return value;
    }
  }
  return undefined;
}

function cookie(request: FastifyRequest, cmsPath: string, value: string, maxAge: number) {
  // Behind a TLS-terminating proxy the connection itself is plain HTTP.
  const https = request.protocol === "https" || request.headers["x-forwarded-proto"] === "https";
  return (
    `${COOKIE}=${value}; Path=${cmsPath}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax` +
    (https ? "; Secure" : "")
  );
}
