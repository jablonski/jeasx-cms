import type { RouteProps } from "@cms/core/types";
import { findFile, type StoredFile } from "@cms/media/files";
import send from "@fastify/send"; // installed with Jeasx, which serves its static files with it
import type { FastifyReply } from "fastify";
import { STATUS_CODES } from "node:http";
import { basename, dirname } from "node:path";

/**
 * Any file type can be uploaded, so only types that can't run scripts on this site are
 * shown in the browser; everything else (e.g. HTML) is always downloaded. The sandbox
 * also covers SVG images opened directly. PDFs need an exception: the viewers of
 * browsers don't work in a sandbox, and their scripts can't access the site.
 */
const showInBrowser = (mime: string) =>
  /^(image|audio|video)\//.test(mime) || mime === "application/pdf" || mime === "text/plain";

/**
 * The Content-Type of a stored file. Uploads stored as JavaScript before it was sent as binary
 * data must not run as scripts; text needs its charset, or browsers guess a wrong one.
 */
function servedType(mime: string) {
  if (/javascript|ecmascript/i.test(mime)) {
    return "application/octet-stream";
  }
  return mime.startsWith("text/") ? `${mime}; charset=utf-8` : mime;
}

/** Names the file for browsers: a plain ASCII fallback, and the real name for all others. */
function contentDisposition(disposition: "attachment" | "inline", name: string) {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** Headers describing the file, and the policy keeping its content away from the site. */
function setFileHeaders(reply: FastifyReply, file: StoredFile, download: boolean) {
  const disposition = download || !showInBrowser(file.mime) ? "attachment" : "inline";
  reply
    .type(servedType(file.mime))
    .header("Content-Disposition", contentDisposition(disposition, file.downloadName))
    .header("Cache-Control", "public, max-age=31536000, immutable")
    .header("X-Content-Type-Options", "nosniff");
  if (file.mime === "application/pdf") {
    reply.removeHeader("Content-Security-Policy");
  } else {
    reply.header("Content-Security-Policy", "default-src 'none'; sandbox");
  }
}

/**
 * Serves uploaded files: <files>/<hash>/<original-name>
 * Add ?download to force a download instead of showing the file.
 *
 * Files are identified by their content hash, so responses can be cached forever.
 * The original name is sent along, so browsers suggest it when saving the file.
 */
export default async function ({ request, reply }: RouteProps) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return;
  }
  const stored = await findFile(request.path.split("/").slice(-2).join("/"));
  // Unknown files answer 404 right here instead of falling through to the page routes.
  if (!stored) {
    return reply.status(404).type("text/plain; charset=utf-8").send("Not found");
  }

  // Ranges (media players need them to seek), conditional requests and streaming from
  // disk; the type and the other headers are set below from what was stored.
  const result = await send(request.raw, `/${encodeURIComponent(basename(stored.diskPath))}`, {
    root: dirname(stored.diskPath),
    dotfiles: "allow",
    contentType: false,
    cacheControl: false,
  });
  if (result.type !== "file") {
    // e.g. 416 for a range outside the file, 412 for a failed If-Match; send's error page is HTML
    result.stream.destroy();
    if (result.headers["Content-Range"]) {
      reply.header("Content-Range", result.headers["Content-Range"]);
    }
    return reply
      .status(result.statusCode)
      .type("text/plain; charset=utf-8")
      .send(STATUS_CODES[result.statusCode] ?? "Error");
  }
  reply.status(result.statusCode);
  for (const [name, value] of Object.entries(result.headers)) {
    reply.header(name, value);
  }
  setFileHeaders(reply, stored.file, "download" in (request.query as object));
  return result.stream;
}
