/** Earlier versions of pages (server only, table "revisions"). */
import type { Page, StoredPage } from "@cms/content/pages";
import { execute, queryAll, queryOne } from "@cms/core/db";

/** Earlier versions kept per page; older ones are removed when a page is saved. */
export const MAX_REVISIONS = 50;

export interface Revision {
  id: number;
  title: string;
  slug: string;
  status: Page["status"];
  createdAt: string;
}

/** Stores the version of a page that is about to be replaced and drops the oldest ones. */
export function keepRevision(pageId: number, page: StoredPage | undefined): void {
  execute("INSERT INTO revisions (page_id, snapshot) VALUES (?, ?)", pageId, JSON.stringify(page));
  execute(
    `DELETE FROM revisions WHERE page_id = ?1 AND id NOT IN
     (SELECT id FROM revisions WHERE page_id = ?1 ORDER BY id DESC LIMIT ?2)`,
    pageId,
    MAX_REVISIONS,
  );
}

/** Earlier versions of a page, newest first. Every save stores the version it replaces. */
export function listRevisions(pageId: number | null): Revision[] {
  const rows = queryAll<Omit<Revision, "createdAt"> & { created_at: string }>(
    `SELECT id, snapshot ->> '$.title' AS title, snapshot ->> '$.slug' AS slug,
     snapshot ->> '$.status' AS status, created_at FROM revisions
     WHERE page_id = ? ORDER BY id DESC`,
    pageId,
  );
  return rows.map(({ created_at, ...r }) => ({ ...r, createdAt: created_at }));
}

/** One earlier version of a page (as it was before the save that replaced it). */
export function getRevision(
  pageId: number | null,
  revisionId: number | null,
): StoredPage | undefined {
  const row = queryOne<{ snapshot: string }>(
    "SELECT snapshot FROM revisions WHERE id = ? AND page_id = ?",
    revisionId,
    pageId,
  );
  return row && JSON.parse(row.snapshot);
}
