/**
 * Page paths (shared by server and browser). Keep this file free of Node.js imports.
 */

/** "About Us/" → "/about-us" */
export function normalizeSlug(slug: unknown): string {
  const s = String(slug ?? "")
    .toLowerCase()
    .replace(/ß/g, "ss") // no decomposition in Unicode
    .normalize("NFKD")
    .replace(/[\u0300-\u036F]/g, "")
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/(^|\/)-+|-+(?=\/|$)/g, "$1")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
  return s.startsWith("/") ? s : `/${s}`;
}
