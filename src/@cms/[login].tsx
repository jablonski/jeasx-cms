import { limitedAttempt } from "@cms/auth/login-limit";
import { safeNext } from "@cms/auth/safe-next";
import { currentSession, isCrossSite, startSession } from "@cms/auth/sessions";
import { ensureInitialUser, verifyCredentials } from "@cms/auth/users";
import { queryOf } from "@cms/core/http";
import { plural } from "@cms/shared/text";
import type { RouteProps, ThisContext } from "@cms/core/types";
import LoginPage from "@cms/render/login-page";

/** GET /@cms/login shows the form, POST signs in. */
export default async function (this: ThisContext, { request, reply }: RouteProps) {
  const cmsPath = this.cmsPath!;

  ensureInitialUser();

  if (request.method === "GET" || request.method === "HEAD") {
    const next = safeNext(queryOf(request).next ?? null, cmsPath);
    return currentSession(request) ? reply.redirect(next, 303) : LoginPage({ cmsPath, next });
  }
  if (request.method !== "POST") {
    return reply.status(405).header("Allow", "GET, POST").send();
  }
  if (isCrossSite(request)) {
    return reply.status(403).send("Forbidden");
  }

  const form = new URLSearchParams(typeof request.body === "string" ? request.body : "");
  const next = safeNext(form.get("next"), cmsPath);
  const username = form.get("username") ?? "";
  const client = request.ip;

  const attempt = await limitedAttempt(client, username, () =>
    verifyCredentials(username, form.get("password") ?? ""),
  );
  if (attempt.outcome === "locked") {
    reply.status(429).header("Retry-After", attempt.retryAfter);
    const wait = plural(Math.ceil(attempt.retryAfter / 60), "minute");
    return LoginPage({
      cmsPath,
      next,
      username,
      error: `Too many failed attempts. Try again in ${wait}.`,
    });
  }
  if (attempt.outcome === "failed") {
    reply.status(401);
    return LoginPage({ cmsPath, next, username, error: "Incorrect username or password." });
  }

  startSession(request, reply, attempt.value.id, cmsPath);
  return reply.redirect(next, 303);
}
