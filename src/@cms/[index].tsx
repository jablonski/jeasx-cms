import { isCrossSite } from "@cms/auth/sessions";
import { duplicatePage, listPages } from "@cms/content/pages";
import { parseId } from "@cms/core/id";
import type { RouteProps, ThisContext } from "@cms/core/types";
import Layout from "@cms/render/admin-layout";
import { PAGE_TYPES } from "@cms/universal/blocks";
import { CopyIcon, PencilIcon } from "@cms/universal/icons";

/** Page list; POST duplicates a page and returns to the list, which then shows the copy. */
export default function (this: ThisContext, { request, reply }: RouteProps) {
  const cmsPath = this.cmsPath!;
  if (request.method === "POST") {
    if (isCrossSite(request)) {
      return reply.status(403).send("Forbidden");
    }
    const form = new URLSearchParams(typeof request.body === "string" ? request.body : "");
    const copy = duplicatePage(parseId(form.get("duplicate")));
    // absolute: an HTTP Location header ignores the page's <base> tag;
    // the anchor scrolls back to the list position, onto the copy
    return reply.redirect(`${cmsPath}/${copy ? `#page-${copy}` : ""}`, 303);
  }
  const pages = listPages();
  return (
    <Layout title="Pages">
      <main class="admin-main">
        <div class="toolbar">
          <h1>Pages</h1>
          <input
            type="search"
            id="page-filter"
            class="page-filter"
            placeholder="Filter by path or title…"
            aria-label="Filter pages"
            aria-controls="page-list"
            autocomplete="off"
          />
          <form action="edit" method="get" class="inline-form">
            <select name="type" aria-label="Page type">
              {Object.entries(PAGE_TYPES).map(([key, { label }]) => (
                <option value={key}>{label}</option>
              ))}
            </select>
            <button type="submit" class="primary">
              New page
            </button>
          </form>
        </div>
        <table class="pages" id="page-list">
          <thead>
            <tr>
              <th>Path</th>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Updated</th>
              <th>
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr id={`page-${p.id}`} data-search={`${p.title} ${p.slug}`.toLowerCase()}>
                <td>
                  {/* a second way into the editor: one tab stop per row (the title) is enough */}
                  <a href={`edit?id=${p.id}`} class="page-path" tabindex="-1">
                    <code>{p.slug}</code>
                  </a>
                </td>
                <td>
                  <a href={`edit?id=${p.id}`}>{p.title}</a>
                </td>
                <td>{PAGE_TYPES[p.type]?.label ?? p.type}</td>
                <td>
                  <span class={`badge ${p.status}`}>{p.status}</span>
                </td>
                <td>
                  <time data-local-time>{p.updatedAt}</time>
                </td>
                <td class="page-actions">
                  <a
                    class="button icon"
                    href={`edit?id=${p.id}`}
                    aria-label={`Edit ${p.title}`}
                    title={`Edit ${p.title}`}
                  >
                    <PencilIcon />
                  </a>
                  <form method="post" class="inline-form">
                    <button
                      type="submit"
                      name="duplicate"
                      value={p.id}
                      class="icon"
                      aria-label={`Duplicate ${p.title}`}
                      title={`Duplicate ${p.title}`}
                    >
                      <CopyIcon />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </Layout>
  );
}
