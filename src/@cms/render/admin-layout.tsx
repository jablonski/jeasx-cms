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
  return (
    <>
      {html("<!DOCTYPE html>")}
      <html lang="en">
        <Head title={title} cmsPath={this.cmsPath} script />
        <body class={wide ? "admin wide" : "admin"}>
          <header class="admin-header">
            <a class="brand" href={this.cmsPath}>
              <Logo size={24} /> JeasxCMS
            </a>
            <nav>
              <a href={pageId ? `${this.cmsPath}#page-${pageId}` : this.cmsPath} data-pages-link>
                Pages
              </a>
              <a href="files">Files</a>
              <a href="users">{this.session?.role === "admin" ? "Users" : "Account"}</a>
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
