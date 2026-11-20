import type { ThisContext } from "@cms/core/types";
import Head from "@cms/render/admin-head";
import Logo from "@cms/render/admin-logo";
import { html } from "jsx-async-runtime";

export default function Layout(
  this: ThisContext,
  {
    title,
    wide,
    pageId,
    children,
  }: {
    title: string;
    wide?: boolean;
    /** page being edited: "Pages" links to its row, so the list scrolls back to it */
    pageId?: number;
    children?: unknown;
  },
) {
  const cmsPath = this.cmsPath!;
  /** Marks a nav link as current when the request is one of its paths. */
  const current = (...paths: string[]) =>
    paths.some((path) => this.request.path === `${cmsPath}${path}`) ? "page" : undefined;

  return (
    <>
      {html("<!DOCTYPE html>")}
      <html lang="en">
        <Head title={title} cmsPath={cmsPath} script />
        <body class={wide ? "admin wide" : "admin"}>
          <header class="admin-header">
            <a class="brand" href={cmsPath}>
              <Logo size={24} /> JeasxCMS
            </a>
            <nav>
              <a
                href={pageId ? `${cmsPath}#page-${pageId}` : cmsPath}
                aria-current={current("", "/", "/edit")}
                data-pages-link
              >
                Pages
              </a>
              <a href="files" aria-current={current("/files")}>
                Files
              </a>
              <a href="users" aria-current={current("/users")}>
                {this.session?.role === "admin" ? "Users" : "Account"}
              </a>
            </nav>
            <form method="post" action="logout">
              <button type="submit">Sign out</button>
            </form>
          </header>
          {children}
        </body>
      </html>
    </>
  );
}
