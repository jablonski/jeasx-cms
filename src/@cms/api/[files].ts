import { bodyOf, dispatch, fail, jsonOnly, notFound, queryOf, readBody } from "@cms/core/http";
import { parseId } from "@cms/core/id";
import type { RouteProps } from "@cms/core/types";
import {
  browse,
  deleteUnusedFile,
  getFile,
  saveFile,
  updateFile,
  withLocation,
} from "@cms/media/files";
import type { FastifyRequest } from "fastify";

/** Largest accepted upload in bytes. */
const MAX_UPLOAD = 10 * 1024 * 1024;

/** The original name of an upload (sent URI encoded); empty if it can't be decoded. */
function uploadName(request: FastifyRequest) {
  try {
    return decodeURIComponent(String(request.headers["x-filename"] ?? ""));
  } catch {
    return "";
  }
}

/**
 * JSON API for the file library.
 *   GET    /@cms/api/files[?folder=ID]   folder contents: { folder, path, folders, files }
 *   POST   /@cms/api/files   raw file body (application/octet-stream); headers "x-filename" (URI encoded), "x-folder" (optional)
 *                            a file stored already is returned with { duplicate: true, folderName }
 *   PATCH  /@cms/api/files?id=1   JSON { name } rename and/or { folder: ID | null } move a file
 *   DELETE /@cms/api/files?id=1[&force=1]   409 with usage if referenced by pages
 *
 * Mutations need the "x-requested-with" header (checked by the API guard).
 */
export default function ({ request, reply }: RouteProps) {
  const query = queryOf(request);
  const { force, folder } = query;
  const id = parseId(query.id);

  const json = jsonOnly(request, reply);

  return dispatch(request, reply, {
    GET: () => browse(folder) ?? notFound(reply, "Folder not found"),
    async POST() {
      const content = await readBody(request, MAX_UPLOAD);
      if (!content) {
        return fail(reply, 413, "File is too large");
      }
      const target = request.headers["x-folder"] ? String(request.headers["x-folder"]) : null;
      const { file, error, duplicate } = await saveFile(content, uploadName(request), target);
      if (error !== undefined) {
        return fail(reply, 422, error);
      }
      return duplicate ? withLocation(file) : file;
    },
    PATCH: json(() => {
      if (!getFile(id)) {
        return notFound(reply);
      }
      const { file, error } = updateFile(id, bodyOf(request));
      return error ? fail(reply, 422, error) : file;
    }),
    async DELETE() {
      const file = getFile(id);
      if (!file) {
        return notFound(reply);
      }
      const usage = await deleteUnusedFile(file, force === "1");
      return usage.length
        ? reply.status(409).send({ error: "File is in use", usage })
        : { ok: true };
    },
  });
}
