/** Helpers for the admin's JSON API routes (server only). */

import type { FastifyReply, FastifyRequest } from "fastify";
import { Readable } from "node:stream";

/** The query parameters; of a repeated parameter (?id=1&id=2), the first value counts. */
export const queryOf = (request: FastifyRequest): Record<string, string> =>
  Object.fromEntries(
    Object.entries((request.query ?? {}) as Record<string, string | string[]>).map(
      ([name, value]) => [name, Array.isArray(value) ? value[0] : value],
    ),
  );

/** A request URL in its parts: "/a?b=1" → { pathname: "/a", search: "?b=1" }. */
export function splitUrl(url: string) {
  const start = url.indexOf("?");
  return start < 0
    ? { pathname: url, search: "" }
    : { pathname: url.slice(0, start), search: url.slice(start) };
}

/** The parsed JSON object; empty if the request has none or sent another JSON value. */
export const bodyOf = (request: FastifyRequest): Record<string, unknown> => {
  const body = request.body;
  return body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
};

export const fail = (reply: FastifyReply, status: number, error: string) =>
  reply.status(status).send({ error });

export const notFound = (reply: FastifyReply, error = "Not found") => fail(reply, 404, error);

/**
 * Reads a raw request body into memory. Returns null if it exceeds `limit` bytes; the
 * rest is discarded, so the client still receives the answer.
 */
export async function readBody(request: FastifyRequest, limit: number): Promise<Buffer | null> {
  const body = request.body;
  if (!(body instanceof Readable)) {
    return Buffer.alloc(0);
  }
  if (Number(request.headers["content-length"]) > limit) {
    return null;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of body) {
    size += chunk.length;
    if (size <= limit) {
      chunks.push(chunk);
    }
  }
  return size <= limit ? Buffer.concat(chunks) : null;
}

/** Runs the handler of the request's method; other methods are answered with 405. */
export function dispatch(
  request: FastifyRequest,
  reply: FastifyReply,
  handlers: Record<string, () => unknown>,
) {
  if (Object.hasOwn(handlers, request.method)) {
    return handlers[request.method]();
  }
  return reply
    .header("Allow", Object.keys(handlers).join(", "))
    .status(405)
    .send({ error: "Method not allowed" });
}

/** Wraps handlers that need a JSON body; other content types are answered with 415. */
export const jsonOnly =
  (request: FastifyRequest, reply: FastifyReply) => (handler: () => unknown) => () =>
    request.headers["content-type"]?.startsWith("application/json")
      ? handler()
      : fail(reply, 415, "Expected JSON");
