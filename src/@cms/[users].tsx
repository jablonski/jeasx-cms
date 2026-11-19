import type { ThisContext } from "@cms/core/types";
import Layout from "@cms/render/admin-layout";

/** User management shell; the UI is rendered in the browser (src/@cms/browser/user-admin/user-admin.tsx). */
export default function (this: ThisContext) {
  return (
    <Layout title={this.session?.role === "admin" ? "Users" : "Account"}>
      <main class="admin-main" id="user-admin">
        <p>Loading…</p>
      </main>
    </Layout>
  );
}
