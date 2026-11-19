import { createReadStream } from "node:fs";
import type { RouteProps } from "@cms/core/types";
import { findFile, type StoredFile } from "@cms/media/files";
import type { FastifyReply } from "fastify";

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

/**
 * The byte range asked for by a Range header (media players need this to seek).
 * Returns null to send the whole file (no range, invalid or several ranges) and
 * "unsatisfiable" if the range lies outside the file.
 */
function parseRange(header: string | undefined, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? "");
  if (!match || (!match[1] && !match[2])) {
    return null;
  }
  const [, first, last] = match;
  if (!first) {
    // "bytes=-500": the last 500 bytes
    const length = Number(last);
    return length ? { start: Math.max(0, size - length), end: size - 1 } : "unsatisfiable";
  }
  const start = Number(first);
  if (last && Number(last) < start) {
    return null;
  }
  if (start >= size) {
    return "unsatisfiable";
  }
  return { start, end: last ? Math.min(Number(last), size - 1) : size - 1 };
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
    .header("Accept-Ranges", "bytes")
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

  const { size } = stored;
  // Files never change under their URL, so a range always matches the cached version.
  const range = request.method === "GET" ? parseRange(request.headers.range, size) : null;
  if (range === "unsatisfiable") {
    return reply
      .status(416)
      .header("Content-Range", `bytes */${size}`)
      .type("text/plain; charset=utf-8")
      .send("Range not satisfiable");
  }

  setFileHeaders(reply, stored.file, "download" in (request.query as object));

  // Streamed from disk: a request only costs memory for the part being sent.
  const { start, end } = range ?? { start: 0, end: size - 1 };
  if (range) {
    reply.status(206).header("Content-Range", `bytes ${start}-${end}/${size}`);
  }
  reply.header("Content-Length", end - start + 1);
  if (request.method === "HEAD") {
    return reply.send();
  }
  return createReadStream(stored.diskPath, { start, end });
}
