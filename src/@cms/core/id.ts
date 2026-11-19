/**
 * A database id from untrusted input (query parameters, JSON): a positive whole number,
 * otherwise null, which matches no row.
 */
export function parseId(value: unknown): number | null {
  const id = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0 ? id : null;
}
