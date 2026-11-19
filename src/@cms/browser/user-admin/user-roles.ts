/** Roles as shown in the admin (browser); users.ts itself is server only. */
import type { Role, User } from "@cms/auth/users";

export type { User };

export const ROLE_LABELS: Record<Role, string> = { admin: "Admin", editor: "Editor" };
