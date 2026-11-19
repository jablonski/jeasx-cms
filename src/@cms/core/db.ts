/**
 * SQLite storage (server only) using the built-in node:sqlite module.
 * Every route is bundled separately, so all routes share one connection.
 */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { SCHEMA } from "@cms/core/schema";
import { shared } from "@cms/core/shared";
import { dbPath } from "@cms/core/storage";

export default function db(): DatabaseSync {
  return shared("__cmsDb", () => open());
}

/** The first row of a query, typed by the caller. */
export const queryOne = <T>(sql: string, ...params: SQLInputValue[]) =>
  db()
    .prepare(sql)
    .get(...params) as T | undefined;

/** All rows of a query, typed by the caller. */
export const queryAll = <T>(sql: string, ...params: SQLInputValue[]) =>
  db()
    .prepare(sql)
    .all(...params) as T[];

/** Runs a statement that changes rows and returns how many it changed. */
export const execute = (sql: string, ...params: SQLInputValue[]) =>
  Number(
    db()
      .prepare(sql)
      .run(...params).changes,
  );

/** Runs an INSERT and returns the id of the new row. */
export const insert = (sql: string, ...params: SQLInputValue[]) =>
  Number(
    db()
      .prepare(sql)
      .run(...params).lastInsertRowid,
  );

/** Runs `work` in a transaction: everything is stored, or nothing if it throws. */
export function transaction<T>(work: () => T, conn: DatabaseSync = db()): T {
  conn.exec("BEGIN");
  try {
    const result = work();
    conn.exec("COMMIT");
    return result;
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }
}

/**
 * Opens (and creates, if needed) the database with its schema. Also usable from
 * scripts, e.g. to set up a database before the first start (see seed/seed.ts).
 * @param path defaults to the configured location
 */
export function open(path: string = dbPath()): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  return db;
}
