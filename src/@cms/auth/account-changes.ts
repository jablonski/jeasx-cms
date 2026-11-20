/** The rules for changing an account, whoever asks for it (server only). */
import { endSessions, type Session } from "@cms/auth/sessions";
import {
  confirmPassword,
  createUser,
  deleteUser,
  getUser,
  updateUser,
  type User,
} from "@cms/auth/users";

/** The HTTP status and message of why an account was left as it is. */
export type AccountRefusal = { status: number; error: string };

/** The changed user, or why nothing was changed. */
export type AccountChange = { user: User } | AccountRefusal;

const ADMINS_ONLY: AccountRefusal = { status: 403, error: "Only admins can do this" };

/** Creates an account: only admins can do this. */
export async function addAccount(
  session: Session,
  body: Record<string, unknown>,
): Promise<AccountChange> {
  if (session.role !== "admin") {
    return ADMINS_ONLY;
  }
  const { user, error } = await createUser(body);
  return error === undefined ? { user } : { status: 422, error };
}

/**
 * Deletes an account. Admins can't delete themselves, so an admin always remains.
 * Returns why the account was kept; undefined once it is deleted.
 */
export function removeAccount(session: Session, id: number | null): AccountRefusal | undefined {
  if (session.role !== "admin") {
    return ADMINS_ONLY;
  }
  if (id === session.userId) {
    return { status: 422, error: "You can't delete your own account" };
  }
  return deleteUser(id) ? undefined : { status: 404, error: "Not found" };
}

/**
 * Applies changes to an account. Admins change every account, but not their own role, so
 * an admin always remains. Editors only change their own password. Changing your own
 * password needs the current one, so a stolen session can't take over the account.
 * @param ip address of the client: wrong passwords count towards the login limits
 */
export async function changeAccount(
  session: Session,
  ip: string,
  id: number | null,
  body: Record<string, unknown>,
): Promise<AccountChange> {
  const canManage = session.role === "admin";
  const isSelf = id === session.userId;
  if (!canManage && !isSelf) {
    return ADMINS_ONLY;
  }
  if (!getUser(id)) {
    return { status: 404, error: "Not found" };
  }
  if (canManage && isSelf && body.role !== undefined && body.role !== session.role) {
    return { status: 422, error: "You can't change your own role" };
  }
  if (isSelf && body.password) {
    const confirmed = await confirmPassword(ip, session.userId, String(body.currentPassword ?? ""));
    if (confirmed === "locked") {
      return { status: 429, error: "Too many failed attempts. Please try again later." };
    }
    if (confirmed === "wrong") {
      return { status: 422, error: "Your current password is incorrect" };
    }
  }
  const { user, error } = await updateUser(id, canManage ? body : { password: body.password });
  if (error !== undefined) {
    return { status: 422, error };
  }
  // A new password signs out every other device of that user.
  if (body.password) {
    endSessions(user.id, session.tokenHash);
  }
  return { user };
}
