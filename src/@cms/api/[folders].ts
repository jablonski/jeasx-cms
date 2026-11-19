import { bodyOf, dispatch, fail, jsonOnly, notFound, queryOf } from "@cms/core/http";
import { parseId } from "@cms/core/id";
import type { RouteProps } from "@cms/core/types";
import {
  createFolder,
  deleteFolder,
  getFolder,
  listFolders,
  updateFolder,
} from "@cms/media/folders";

/**
 * JSON API for folders.
 *   GET    /@cms/api/folders            all folders (flat, with counts)
 *   POST   /@cms/api/folders            JSON { name, parent }
 *   PATCH  /@cms/api/folders?id=1       JSON { name?, parent? }   rename / move
 *   DELETE /@cms/api/folders?id=1       contents move to the parent folder
 *
 * Mutations need the "x-requested-with" header (checked by the API guard).
 */
export default function ({ request, reply }: RouteProps) {
  const id = parseId(queryOf(request).id);
  const json = jsonOnly(request, reply);

  return dispatch(request, reply, {
    GET: () => listFolders(),
    POST: json(() => {
      const body = bodyOf(request);
      const { folder, error } = createFolder(body.name, body.parent);
      return error ? fail(reply, 422, error) : folder;
    }),
    PATCH: json(() => {
      if (!getFolder(id)) {
        return notFound(reply);
      }
      const { folder, error } = updateFolder(id, bodyOf(request));
      return error ? fail(reply, 422, error) : folder;
    }),
    DELETE: () => (deleteFolder(id) ? { ok: true } : notFound(reply)),
  });
}
