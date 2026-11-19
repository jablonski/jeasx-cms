import type { RouteProps } from "@cms/core/types";
import Layout from "./Layout";

export default function NotFound({ request }: RouteProps) {
  return (
    <Layout title="Page not found" description="The page could not be found.">
      <section class="not-found">
        <p class="not-found-code">404</p>
        <h1>Page not found</h1>
        <p class="not-found-message">
          There is nothing at <code>{request.path}</code>. The page may have moved, or the address
          may be mistyped.
        </p>
        <a class="button" href="/">
          Go to homepage
        </a>
      </section>
    </Layout>
  );
}
