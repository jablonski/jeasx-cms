/**
 * Public URLs of uploaded files (free of Node.js imports, usable everywhere):
 *   <files>/<hash>/<original-name>   e.g. /files/4ff6ab670a58c142/München-Foto.png
 *
 * The hash keeps URLs unique and cacheable forever; the name is for people,
 * downloads and search engines.
 */
import { truncate } from "@cms/shared/text";

/** Longest display name of a file. */
export const MAX_FILE_NAME = 200;

/**
 * URL-safe version of the original file name: whitespace → "-", no slashes or
 * control characters, and the extension of the stored file ("bin": none is added).
 * @param name original name, e.g. "München Foto.PNG"
 * @param ext stored extension, e.g. "png"
 */
export function fileSlug(name: string, ext: string): string {
  const original = String(name ?? "").toWellFormed();
  // "bin" means no extension is added, so a name like "firmware.bin" has to keep its own.
  const stem =
    ext === "bin"
      ? original
      : original
          .replace(new RegExp(`\\.${ext}$`, "i"), "")
          .replace(/\.(jpe?g|png|gif|webp|avif|pdf)$/i, "");
  const slug = stem
    .replace(/[\p{Cc}/\\?#%"<>|*:]+/gu, "")
    .trim()
    .replace(/\s+/g, "-");
  // Browsers resolve "." and ".." in a URL, which would lead away from the file.
  const base = truncate(slug, 120).replace(/^\.{1,2}$/, "") || "file";
  return ext === "bin" ? base : `${base}.${ext}`;
}

/**
 * @param files public path of uploaded files (`files` in the site configuration)
 * @param filename stored name "<hash>.<ext>"
 * @param name original name
 */
export function fileUrl(files: string, filename: string, name: string): string {
  const [hash, ext] = filename.split(".");
  return `${files}/${hash}/${encodeURIComponent(fileSlug(name, ext))}`;
}
