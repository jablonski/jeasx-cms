import type { EditorData } from "@cms/browser/editor/start-editor";
import { blockSchema } from "@cms/universal/blocks";
import { getPage, newPage, normalizePage } from "@cms/content/pages";
import { queryOf } from "@cms/core/http";
import { parseId } from "@cms/core/id";
import { SITE } from "@cms/core/site";
import type { RouteProps } from "@cms/core/types";
import { cacheBuster } from "@cms/core/cache-buster";
import Layout from "@cms/render/admin-layout";
import { html } from "jsx-async-runtime";

/** Data for a <script> element: "<" is escaped, so the content can't end the element. */
const scriptData = (value: EditorData) => html(JSON.stringify(value).replaceAll("<", "\\u003c"));

/** The stored page with this id, or a new page of this type if there is no id. */
function pageToEdit({ id, type = "page" }: Record<string, string>) {
  if (!id) {
    return newPage(type);
  }
  const stored = getPage(parseId(id));
  return stored && normalizePage(stored);
}

/**
 * Editor shell. The editor itself is a browser app (src/@cms/browser/editor/start-editor.tsx),
 * fed with the page and the blocks' schemas as JSON. The canvas is rendered on the
 * server (/@cms/api/preview), so block components never run in the browser.
 */
export default async function ({ request }: RouteProps) {
  const page = pageToEdit(queryOf(request));
  if (!page) {
    return; // unknown page or page type: ends in the 404 page
  }

  return (
    <Layout title={page.title || "New page"} wide pageId={page.id}>
      <div id="editor" class="editor">
        <p class="loading">Loading editor…</p>
      </div>
      <script type="application/json" id="cms-editor">
        {scriptData({
          page,
          schema: blockSchema(),
          stylesheets: SITE.stylesheets.map(cacheBuster),
        })}
      </script>
    </Layout>
  );
}
