import { PAGE_TYPES } from "@cms/content/blocks";
import { listPages } from "@cms/content/pages";
import Layout from "@cms/render/admin-layout";

export default function () {
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
              <tr>
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
                  <a class="button" href={`edit?id=${p.id}`} aria-label={`Edit ${p.title}`}>
                    Edit
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </Layout>
  );
}
