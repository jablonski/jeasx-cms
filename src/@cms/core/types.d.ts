import type { Session } from "@cms/auth/sessions";
import type { FastifyReply, FastifyRequest } from "fastify";
import "jeasx/serverless";
import type { DatabaseSync } from "node:sqlite";

export type RouteProps = {
  request: FastifyRequest;
  reply: FastifyReply;
};

export type ThisContext = RouteProps & {
  /** Session of the signed-in user (set by the admin guard). */
  session?: Session;
  /** URL of the admin, detected from the location of its guard (set by the admin guard). */
  cmsPath?: string;
};

// Every route bundle shares one database connection.
declare global {
  var __cmsDb: DatabaseSync | undefined;
}
