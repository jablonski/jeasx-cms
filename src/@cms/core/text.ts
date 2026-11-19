/** Text helpers. Free of Node.js imports: the admin's browser code uses them, too. */

/** "1 file", "2 files" */
export const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

const KB = 1024;
const MB = 1024 * KB;

/** Readable file size, e.g. "512 B", "14 KB" or "2.5 MB". */
export function formatSize(bytes: number) {
  if (bytes < KB) {
    return `${bytes} B`;
  }
  return bytes < MB ? `${(bytes / KB).toFixed(0)} KB` : `${(bytes / MB).toFixed(1)} MB`;
}

/** "/about//" → "/about". A loop, as a regex needs quadratic time on long runs of slashes. */
export function trimTrailingSlashes(path: string) {
  let end = path.length;
  while (end > 0 && path[end - 1] === "/") {
    end--;
  }
  return path.slice(0, end);
}

/** Shortens text to `max` UTF-16 units without cutting a character like an emoji in half. */
export const truncate = (text: string, max: number) =>
  text.slice(0, max).replace(/[\uD800-\uDBFF]$/, "");
