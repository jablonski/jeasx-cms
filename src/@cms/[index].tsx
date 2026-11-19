import { PAGE_TYPES } from "@cms/shared/blocks";
import { duplicatePage, listPages } from "@cms/content/pages";
import { parseId } from "@cms/core/id";
import { isCrossSite } from "@cms/auth/sessions";
import { CopyIcon, PencilIcon } from "@cms/shared/icons";
import Layout from "@cms/render/admin-layout";
import type { RouteProps, ThisContext } from "@cms/core/types";

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
        <table class="pages">
          <thead>
            <tr>
              <th>Title</th>
              <th>Path</th>
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
              <tr id={`page-${p.id}`}>
                <td>
                  <a href={`edit?id=${p.id}`}>{p.title}</a>
                </td>
                <td>
                  <code>{p.slug}</code>
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
