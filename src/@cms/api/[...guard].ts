import type { RouteProps } from "@cms/core/types";

/**
 * CSRF protection for the JSON APIs: cross-site requests can't send this header without
 * a CORS preflight, which the admin never allows.
 */
export default function ({ request, reply }: RouteProps) {
  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    request.headers["x-requested-with"] !== "JeasxCMS"
  ) {
    return reply.status(403).send({ error: "Forbidden" });
  }
  return undefined;
}
