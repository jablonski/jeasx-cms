/** Earlier versions of pages (server only, table "revisions"). */
import type { Page, StoredPage } from "@cms/content/pages";
import { parsePageContent } from "@cms/content/page-validation";
import { queryAll, queryOne } from "@cms/core/db";

/**
 * Revisions are kept by the trigger "pages_revision" (schema.ts) whenever a page changes,
 * up to MAX_REVISIONS per page.
 */
export { MAX_REVISIONS } from "@cms/core/schema";

export interface Revision {
  id: number;
  title: string;
  slug: string;
  status: Page["status"];
  createdAt: string;
}

/** A row of the table "revisions": the columns of the page as it was. */
interface RevisionRow {
  page_id: number;
  type: string;
  slug: string;
  title: string;
  status: Page["status"];
  content: string;
  version: number;
  updated_at: string;
}

/** Earlier versions of a page, newest first. Every save stores the version it replaces. */
export function listRevisions(pageId: number | null): Revision[] {
  const rows = queryAll<Omit<Revision, "createdAt"> & { created_at: string }>(
    `SELECT id, title, slug, status, created_at FROM revisions
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
  const row = queryOne<RevisionRow>(
    `SELECT page_id, type, slug, title, status, content, version, updated_at
     FROM revisions WHERE id = ? AND page_id = ?`,
    revisionId,
    pageId,
  );
  return (
    row && {
      id: row.page_id,
      type: row.type,
      slug: row.slug,
      title: row.title,
      status: row.status,
      ...parsePageContent(row.content),
      updatedAt: row.updated_at,
      version: row.version,
    }
  );
}
