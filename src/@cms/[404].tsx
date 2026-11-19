import type { RouteProps, ThisContext } from "@cms/core/types";
import Layout from "@cms/render/admin-layout";

export default function (this: ThisContext, { request }: RouteProps) {
  return (
    <Layout title="Page not found">
      <main class="not-found">
        <p class="not-found-code">404</p>
        <h1>Page not found</h1>
        <p class="not-found-message">
          There is nothing at <code>{request.path}</code>. It may have been moved, or the address
          may be mistyped.
        </p>
        <p class="not-found-actions">
          <a class="button primary" href={this.cmsPath}>
            Go to pages
          </a>
          <a class="button" href="files">
            Open files
          </a>
        </p>
      </main>
    </Layout>
  );
}
