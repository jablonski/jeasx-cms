import { ROLE_LABELS, type User } from "@cms/browser/user-admin/user-roles";
import { formatTime } from "@cms/browser/utils/format-time";

/** What GET api/users answers. */
export interface UserList {
  users: User[];
  currentUserId: number;
  canManage: boolean;
}

/** The accounts the signed-in user can see, with their actions. */
export default function UserTable({ users, currentUserId, canManage }: UserList) {
  return (
    <>
      <div class="toolbar">
        <h1>{canManage ? "Users" : "Account"}</h1>
        {canManage && (
          <button type="button" class="primary" data-new-user>
            New user
          </button>
        )}
      </div>
      <table class="pages">
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Created</th>
            <th>Updated</th>
            <th>
              <span class="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr>
              <td>
                {u.username}
                {u.id === currentUserId && <small class="user-self"> (you)</small>}
              </td>
              <td>{ROLE_LABELS[u.role]}</td>
              <td>{formatTime(u.createdAt)}</td>
              <td>{formatTime(u.updatedAt)}</td>
              <td class="user-actions">
                <button type="button" data-edit-user={u.id}>
                  {canManage ? "Edit" : "Change password"}
                </button>
                {canManage && u.id !== currentUserId && (
                  <button type="button" data-delete-user={u.id}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
