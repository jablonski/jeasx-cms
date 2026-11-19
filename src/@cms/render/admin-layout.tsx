import type { ThisContext } from "@cms/core/types";
import Head from "@cms/render/admin-head";
import Logo from "@cms/render/admin-logo";
import { html } from "jsx-async-runtime";

export default function Layout(
  this: ThisContext,
  {
    title,
    wide,
    children,
  }: {
    title: string;
    wide?: boolean;
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
              <a href={this.cmsPath}>Pages</a>
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
