/**
 * Protects the admin: without a session, only the login is reachable. The admin's URL
 * follows from this guard's location, so the folder can be renamed freely. Its pages and
 * APIs are regular Jeasx routes next to this guard and link relative to a <base> tag.
 */
import { currentSession } from "@cms/auth/sessions";
import { splitUrl } from "@cms/core/http";
import { trimTrailingSlashes } from "@cms/universal/text";
import type { RouteProps, ThisContext } from "@cms/core/types";

export default function (this: ThisContext, { request, reply }: RouteProps) {
  const cmsPath = request.route.slice(0, -"/[...guard]".length);
  this.cmsPath = cmsPath;

  const path = trimTrailingSlashes(request.path);
  // The login page's only asset.
  if (path === `${cmsPath}/browser/styles/index.css`) {
    return;
  }
  reply.header("Cache-Control", "no-store");

  const session = currentSession(request);
  this.session = session;
  if (session || path === `${cmsPath}/login` || path === `${cmsPath}/logout`) {
    return;
  }

  if (path.startsWith(`${cmsPath}/api/`) || request.method !== "GET") {
    return reply.status(401).send({ error: "Your session has expired. Please sign in again." });
  }
  // The raw URL comes from anonymous visitors: this must stay linear in its length.
  const { pathname, search } = splitUrl(request.url);
  const next = encodeURIComponent(trimTrailingSlashes(pathname) + search);
  return reply.redirect(`${cmsPath}/login?next=${next}`, 303);
}
