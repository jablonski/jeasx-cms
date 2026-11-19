import {
  type AccountChange,
  addAccount,
  changeAccount,
  removeAccount,
} from "@cms/auth/account-changes";
import { getUser, listUsers } from "@cms/auth/users";
import { bodyOf, dispatch, fail, jsonOnly, queryOf } from "@cms/core/http";
import { parseId } from "@cms/core/id";
import type { RouteProps, ThisContext } from "@cms/core/types";

/**
 * JSON API for user accounts.
 *   GET    /@cms/api/users          { users, currentUserId, canManage }
 *   POST   /@cms/api/users          JSON { username, password, role }
 *   PATCH  /@cms/api/users?id=1     JSON { username?, password?, role?, currentPassword? }
 *   DELETE /@cms/api/users?id=1
 *
 * Editors only see their own account. The rules for changes: auth/account-changes.ts.
 *
 * Mutations need the "x-requested-with" header (checked by the API guard).
 */
export default function (this: ThisContext, { request, reply }: RouteProps) {
  const id = parseId(queryOf(request).id);
  const session = this.session!;
  const canManage = session.role === "admin";
  const json = jsonOnly(request, reply);
  const answer = (result: AccountChange) =>
    "status" in result ? fail(reply, result.status, result.error) : result.user;

  return dispatch(request, reply, {
    GET: () => ({
      users: canManage ? listUsers() : [getUser(session.userId)],
      currentUserId: session.userId,
      canManage,
    }),
    POST: json(async () => answer(await addAccount(session, bodyOf(request)))),
    PATCH: json(async () => answer(await changeAccount(session, request.ip, id, bodyOf(request)))),
    DELETE() {
      const refusal = removeAccount(session, id);
      return refusal ? fail(reply, refusal.status, refusal.error) : { ok: true };
    },
  });
}
