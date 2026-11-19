/** User management page of the admin: holds the page's state, its parts live in this folder. */
import { alertDialog, confirmDialog } from "@cms/browser/utils/dialog";
import { json, request } from "@cms/browser/utils/http";
import { toHtml } from "@cms/browser/utils/to-html";
import { editUser, type SaveUser } from "@cms/browser/user-admin/user-form";
import type { User } from "@cms/browser/user-admin/user-roles";
import UserTable, { type UserList } from "@cms/browser/user-admin/user-table";

const API = "api/users";

/** Creates a user, or changes the given one. */
const saveUser: SaveUser = (values, user) =>
  user ? json("PATCH", `${API}?id=${user.id}`, values) : json("POST", API, values);

export default function initUserAdmin(root: HTMLElement) {
  let users: User[] = [];
  let currentUserId = 0;
  let canManage = false;

  async function load() {
    const res = await request<UserList>("GET", API);
    if (!res.ok) {
      root.textContent = res.error;
      return;
    }
    ({ users, currentUserId, canManage } = res.data);
    root.innerHTML = toHtml(<UserTable {...res.data} />);
  }

  root.addEventListener("click", async (e) => {
    const button = (e.target as HTMLElement).closest("button");
    if (!button) {
      return;
    }
    const find = (id: string) => users.find((u) => u.id === Number(id));

    if ("newUser" in button.dataset) {
      if (await editUser(saveUser, canManage, false)) {
        await load();
      }
    } else if (button.dataset.editUser) {
      const user = find(button.dataset.editUser);
      if (await editUser(saveUser, canManage, user?.id === currentUserId, user)) {
        await load();
      }
    } else if (button.dataset.deleteUser) {
      const user = find(button.dataset.deleteUser);
      const confirmed = await confirmDialog({
        title: `Delete ${user?.username}?`,
        message: "This account will be signed out and can no longer be used.",
        confirmLabel: "Delete",
        danger: true,
      });
      if (!confirmed) {
        return;
      }
      const res = await request("DELETE", `${API}?id=${user?.id}`);
      if (!res.ok) {
        await alertDialog({ title: "Not deleted", message: res.error });
      }
      await load();
    }
  });

  load();
}
