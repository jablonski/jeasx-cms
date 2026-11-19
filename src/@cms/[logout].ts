import { endSession, isCrossSite } from "@cms/auth/sessions";
import type { RouteProps, ThisContext } from "@cms/core/types";

/** POST <admin>/logout ends the current session. */
export default function (this: ThisContext, { request, reply }: RouteProps) {
  if (request.method !== "POST") {
    return reply.status(405).header("Allow", "POST").send();
  }
  if (isCrossSite(request)) {
    return reply.status(403).send("Forbidden");
  }
  endSession(request, reply, this.cmsPath!);
  return reply.redirect(`${this.cmsPath}/login`, 303);
}
