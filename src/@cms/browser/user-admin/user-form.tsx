/** The dialog for creating a user or changing an account. */
import { MAX_PASSWORD, MIN_PASSWORD } from "@cms/universal/account-limits";
import { openModal } from "@cms/browser/utils/dialog";
import type { ApiResponse } from "@cms/browser/utils/http";
import { ROLE_LABELS, type User } from "@cms/browser/user-admin/user-roles";

/** Stores the form's values for a new user or the given one. */
export type SaveUser = (
  values: Record<string, FormDataEntryValue>,
  user?: User,
) => Promise<ApiResponse<unknown>>;

function UserForm({
  user,
  canManage,
  isSelf,
}: {
  user?: User;
  canManage: boolean;
  isSelf: boolean;
}) {
  const title = !canManage ? "Change password" : user ? `Edit ${user.username}` : "New user";
  return (
    <form method="dialog">
      <div class="modal-body">
        <div class="modal-field">
          <h2 id="modal-title">{title}</h2>
          <p class="errors" role="alert" hidden />
          {canManage && (
            <label class="field">
              <span>Username</span>
              <input
                name="username"
                value={user?.username ?? ""}
                required
                maxlength="80"
                autocomplete="off"
                autocapitalize="none"
                spellcheck="false"
              />
            </label>
          )}
          {canManage && !isSelf && (
            <label class="field">
              <span>Role</span>
              <select name="role">
                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                  <option value={role} selected={(user?.role ?? "editor") === role}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {isSelf && (
            <label class="field">
              <span>
                {canManage ? "Current password (needed for a new password)" : "Current password"}
              </span>
              <input
                name="currentPassword"
                type="password"
                required={!canManage}
                maxlength={MAX_PASSWORD}
                autocomplete="current-password"
              />
            </label>
          )}
          <label class="field">
            <span>
              {!canManage
                ? "New password"
                : user
                  ? "New password (leave empty to keep it)"
                  : "Password"}
            </span>
            <input
              name="password"
              type="password"
              required={!user || !canManage}
              minlength={MIN_PASSWORD}
              maxlength={MAX_PASSWORD}
              autocomplete="new-password"
            />
          </label>
        </div>
      </div>
      <footer class="modal-actions">
        <button type="button" data-cancel>
          Cancel
        </button>
        <button type="submit" class="primary">
          {user ? "Save" : "Create user"}
        </button>
      </footer>
    </form>
  );
}

/** Asks for a user's details and saves them. Resolves true once saved. */
export function editUser(
  save: SaveUser,
  canManage: boolean,
  isSelf: boolean,
  user?: User,
): Promise<boolean> {
  let saved = false;
  return openModal({
    content: <UserForm user={user} canManage={canManage} isSelf={isSelf} />,
    dismissValue: null,
    result: () => saved,
    onOpen(dialog) {
      const form = dialog.querySelector("form") as HTMLFormElement;
      const problem = dialog.querySelector(".errors") as HTMLElement;
      dialog.querySelector("[data-cancel]")!.addEventListener("click", () => dialog.close());
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const values = Object.fromEntries(new FormData(form));
        const res = await save(values, user);
        if (res.ok) {
          saved = true;
          dialog.close();
        } else {
          problem.textContent = res.error;
          problem.hidden = false;
        }
      });
    },
  });
}
