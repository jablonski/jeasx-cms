import type { ThisContext } from "@cms/core/types";
import { html } from "jsx-async-runtime";
import { footerNavigation, navigation } from "./queries";

/** Page frame of the public site. */
export default function Layout(
  this: ThisContext,
  props: { title: string; description?: string; children?: unknown },
) {
  const { title, description, children } = props;
  return (
    <>
      {html("<!DOCTYPE html>")}
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          {description && <meta name="description" content={description} />}
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="stylesheet" href={`/styles/index.css?v=${process.env.BUILD_ID}`} />
          <title>{`${title} | JeasxCMS`}</title>
        </head>
        <body>
          <header class="site-header">
            <a class="brand" href="/">
              <img src="/favicon.svg" alt="" width="24" height="24" />
              JeasxCMS
            </a>
            <nav>
              {navigation().map(({ slug, title }) => (
                <a href={slug} aria-current={slug === this.request.path ? "page" : undefined}>
                  {title}
                </a>
              ))}
            </nav>
          </header>
          <main>{children}</main>
          <footer class="site-footer">
            <nav aria-label="Footer">
              {footerNavigation().map(({ slug, title }) => (
                <a href={slug}>{title}</a>
              ))}
            </nav>
            <span>Built with Jeasx · SQLite · blocks</span>
          </footer>
        </body>
      </html>
    </>
  );
}
