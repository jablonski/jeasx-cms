/** Page repository (server only). Input checks: page-validation.ts, history: revisions.ts. */
import {
  type PageInput,
  type PageValues,
  parsePageContent,
  validatePage,
} from "@cms/content/page-validation";
import { execute, insert, queryAll, queryOne, transaction } from "@cms/core/db";
import { parseId } from "@cms/core/id";
import { createBlock, normalizeBlocks } from "@cms/universal/block-data";
import { type Block, PAGE_TYPES } from "@cms/universal/blocks";
import { defaults, sanitize, type ValidationError } from "@cms/universal/fields";
import { normalizeSlug } from "@cms/universal/slug";

/**
 * What every page consists of, saved or not: its columns, the blocks and, beside them,
 * the fields of its page type (e.g. `page.description`).
 */
interface PageContent {
  type: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  blocks: Block[];
  [field: string]: unknown;
}

/** A page being created in the editor. */
export interface NewPage extends PageContent {
  id?: undefined;
  updatedAt?: undefined;
  version?: undefined;
}

export interface StoredPage extends PageContent {
  id: number;
  updatedAt: string;
  /** counts the saves of a page, to detect changes made by someone else */
  version: number;
}

export type Page = NewPage | StoredPage;

/** What the list of pages shows. */
export type PageSummary = Pick<
  StoredPage,
  "id" | "type" | "slug" | "title" | "status" | "updatedAt"
>;

/** A row of the table "pages". */
interface PageRow {
  id: number;
  type: string;
  slug: string;
  title: string;
  status: Page["status"];
  content: string;
  version: number;
  created_at: string;
  updated_at: string;
}

/** The columns of a page summary. */
type SummaryRow = Pick<PageRow, "id" | "type" | "slug" | "title" | "status" | "updated_at">;

const toSummary = (row: SummaryRow): PageSummary => ({
  id: row.id,
  type: row.type,
  slug: row.slug,
  title: row.title,
  status: row.status,
  updatedAt: row.updated_at,
});

const toPage = (row: PageRow): StoredPage => ({
  ...toSummary(row),
  ...parsePageContent(row.content),
  updatedAt: row.updated_at,
  version: row.version,
});

export function listPages(): PageSummary[] {
  return queryAll<SummaryRow>(
    "SELECT id, type, slug, title, status, updated_at FROM pages ORDER BY slug",
  ).map(toSummary);
}

export function getPage(id: number | null): StoredPage | undefined {
  const row = queryOne<PageRow>("SELECT * FROM pages WHERE id = ?", id);
  return row && toPage(row);
}

export function getPublishedPage(slug: string): StoredPage | undefined {
  const row = queryOne<PageRow>(
    "SELECT * FROM pages WHERE slug = ? AND status = 'published'",
    slug,
  );
  return row && toPage(row);
}

/** An empty page of a page type, as the editor starts it; undefined for unknown types. */
export function newPage(typeName: string): NewPage | undefined {
  const type = PAGE_TYPES[typeName];
  return (
    type && {
      type: typeName,
      slug: "",
      title: "",
      status: "draft",
      ...defaults(type.fields),
      blocks: (type.initialBlocks ?? []).map(createBlock),
    }
  );
}

/**
 * A stored page in the current shape of its fields, for the editor: fields added to a
 * block or page type since it was saved exist, so lists can be added to right away.
 */
export function normalizePage(page: StoredPage): StoredPage {
  const type = PAGE_TYPES[page.type];
  return {
    ...page,
    ...(type && sanitize(type.fields, page).value),
    blocks: normalizeBlocks(page.blocks),
  };
}

/** The stored page, or why it was not stored. */
export type SaveOutcome =
  | { page: StoredPage; errors?: undefined; conflict?: undefined }
  | { page?: undefined; errors: ValidationError[]; conflict?: boolean };

/**
 * Validates and stores a page. Returns the stored page or validation errors.
 * With `baseVersion`, a page saved by someone else since that version is not
 * replaced: the result has `conflict: true`.
 * @param data untrusted page data from the editor
 */
export function savePage(data: unknown): SaveOutcome {
  const input = (data ?? {}) as PageInput;
  const typeName = typeof input.type === "string" ? input.type : "";
  const type = PAGE_TYPES[typeName];
  if (!type) {
    return { errors: [{ message: "Unknown page type" }] };
  }
  const id = parseId(input.id);
  if (input.id && id === null) {
    return { errors: [{ message: "Page not found" }] };
  }

  const { values, errors } = validatePage(input, typeName, type, id);
  if (errors.length) {
    return { errors };
  }

  const outdated = id ? checkVersion(id, input.baseVersion) : undefined;
  if (outdated) {
    return outdated;
  }
  try {
    const page = getPage(transaction(() => (id ? updatePage(id, values) : insertPage(values))));
    if (page) {
      return { page };
    }
  } catch (e) {
    // Details stay in the server log: database messages are not meant for editors.
    console.error(e);
  }
  return { errors: [{ message: "The page could not be saved" }] };
}

/**
 * Why a stored page can't be replaced: it's gone, or, with `baseVersion`, it was saved
 * by someone else since that version. Undefined if it can.
 */
function checkVersion(id: number, baseVersion: unknown): SaveOutcome | undefined {
  const current = queryOne<{ version: number }>("SELECT version FROM pages WHERE id = ?", id);
  if (!current) {
    return { errors: [{ message: "Page not found" }] };
  }
  if (baseVersion != null && current.version !== Number(baseVersion)) {
    return { conflict: true, errors: [{ message: "The page was changed by someone else" }] };
  }
  return undefined;
}

/** The columns a save writes, in the order of the SQL below. */
const COLUMNS = ["type", "slug", "title", "status", "content"] as const;

const columnValues = (values: PageValues) => COLUMNS.map((column) => values[column]);

function insertPage(values: PageValues): number {
  return insert(
    `INSERT INTO pages (${COLUMNS.join(", ")}) VALUES (${COLUMNS.map(() => "?").join(", ")})`,
    ...columnValues(values),
  );
}

/**
 * Replaces an existing page and keeps the replaced version as a revision. Saving it
 * unchanged changes nothing: no revision, same version and time of the last change.
 */
function updatePage(id: number, values: PageValues): number {
  const stored = queryOne<PageValues>(`SELECT ${COLUMNS.join(", ")} FROM pages WHERE id = ?`, id);
  if (stored && COLUMNS.every((column) => stored[column] === values[column])) {
    return id;
  }
  // the replaced version is kept by the trigger "pages_revision", updated_at is set by
  // "pages_updated" (schema.ts)
  execute(
    `UPDATE pages SET ${COLUMNS.map((column) => `${column} = ?`).join(", ")},
     version = version + 1 WHERE id = ?`,
    ...columnValues(values),
    id,
  );
  return id;
}

/** A page referencing a file or page in its current content. */
export interface Usage {
  id: number;
  title: string;
  slug: string;
}

/** Escapes LIKE wildcards (with `ESCAPE '\\'`). */
const likeLiteral = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Other pages linking to `slug` in their current content. Matches the stored JSON: a field holding the path ("/blog",
 * optionally followed by #… or ?…) or a rich text link to it ([label](/blog)).
 * The end of the link is part of each pattern, so "/blog" doesn't match "/blog/post".
 */
export function pageUsage(slug: string, excludeId: number): Usage[] {
  const path = likeLiteral(slug);
  const patterns = [
    ['"', '"'],
    ["](", ")"],
  ].flatMap(([start, end]) => [end, "#", "?"].map((after) => `%${start}${path}${after}%`));
  const match = patterns.map((_, i) => `content LIKE ?${i + 2} ESCAPE '\\'`).join(" OR ");
  return queryAll<Usage>(
    `SELECT id, title, slug FROM pages WHERE id <> ?1 AND (${match}) ORDER BY slug`,
    excludeId,
    ...patterns,
  );
}

/**
 * Deletes a page unless other pages link to it. Returns those pages, which keep the
 * page; empty if it was deleted.
 * @param force deletes the page even if other pages link to it
 */
export function deleteUnlinkedPage(page: StoredPage, force: boolean): Usage[] {
  const usage = page.slug ? pageUsage(page.slug, page.id) : [];
  if (usage.length && !force) {
    return usage;
  }
  deletePage(page.id);
  return [];
}

export function deletePage(id: number | null): boolean {
  return execute("DELETE FROM pages WHERE id = ?", id) > 0;
}

/**
 * A draft copy: "… (copy)" title, never published. Its path is the original's plus
 * "-copy" ("/blog/post" → "/blog/post-copy"), so it stays in the same section and next
 * to the original in the path-sorted page list. Returns the new id.
 */
export function duplicatePage(id: number | null): number | undefined {
  const page = getPage(id);
  if (!page) {
    return undefined;
  }
  const title = `${page.title || "Untitled page"} (copy)`;
  const taken = new Set(queryAll<{ slug: string }>("SELECT slug FROM pages").map((r) => r.slug));
  const base = normalizeSlug(`${page.slug}-copy`);
  let slug = base;
  for (let n = 2; taken.has(slug); n++) {
    slug = `${base}-${n}`;
  }
  const { id: _id, version: _version, updatedAt: _updatedAt, ...content } = page;
  const { page: copy, errors } = savePage({ ...content, title, slug, status: "draft" });
  if (!copy) {
    console.error(errors);
    return undefined;
  }
  return copy.id;
}
