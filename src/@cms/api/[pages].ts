import {
  deleteUnlinkedPage,
  getPage,
  listPages,
  normalizePage,
  savePage,
} from "@cms/content/pages";
import { getRevision, listRevisions } from "@cms/content/revisions";
import { dispatch, jsonOnly, notFound, queryOf } from "@cms/core/http";
import { parseId } from "@cms/core/id";
import type { RouteProps } from "@cms/core/types";

/**
 * JSON API for the admin editor.
 *   GET    /@cms/api/pages[?id=1]
 *   GET    /@cms/api/pages?id=1&revisions       earlier versions, newest first
 *   GET    /@cms/api/pages?id=1&revision=5      one earlier version (a full page)
 *   POST   /@cms/api/pages   (create or update, JSON body; 409 if `baseVersion` is outdated)
 *   DELETE /@cms/api/pages?id=1[&force=1]   409 with usage if linked by other pages
 *
 * Mutations need the "x-requested-with" header (checked by the API guard).
 */
export default function ({ request, reply }: RouteProps) {
  const query = queryOf(request);
  const id = parseId(query.id);

  const json = jsonOnly(request, reply);

  return dispatch(request, reply, {
    GET() {
      if (!query.id) {
        return listPages();
      }
      const page = getPage(id);
      if (!page) {
        return notFound(reply);
      }
      if ("revisions" in query) {
        return listRevisions(id);
      }
      if (query.revision) {
        const earlier = getRevision(id, parseId(query.revision));
        return earlier ? normalizePage(earlier) : notFound(reply);
      }
      return page;
    },
    POST: json(() => {
      const { page, errors, conflict } = savePage(request.body);
      return errors ? reply.status(conflict ? 409 : 422).send({ errors }) : page;
    }),
    DELETE() {
      const page = getPage(id);
      if (!page) {
        return notFound(reply);
      }
      const usage = deleteUnlinkedPage(page, query.force === "1");
      return usage.length
        ? reply.status(409).send({ error: "Page is linked", usage })
        : { ok: true };
    },
  });
}
