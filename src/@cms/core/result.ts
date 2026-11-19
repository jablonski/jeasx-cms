/** Outcome of a change: the stored item under its name, or what went wrong. */
export type Result<K extends string, T> =
  | ({ [key in K]: T } & { error?: undefined })
  | ({ [key in K]?: undefined } & { error: string });

/** The result for an item read back after storing it; `missing` explains if it is gone. */
export function resultOf<K extends string, T>(
  key: K,
  item: T | undefined,
  missing: string,
): Result<K, T> {
  return (item === undefined ? { error: missing } : { [key]: item }) as Result<K, T>;
}
