/** Page repository (server only). Input checks: page-validation.ts, history: revisions.ts. */
import { createBlock, normalizeBlocks } from "@cms/universal/block-data";
import { type Block, PAGE_TYPES } from "@cms/universal/blocks";
import { defaults, sanitize, type ValidationError } from "@cms/universal/fields";
import {
  type PageInput,
  type PageValues,
  parsePageContent,
  validatePage,
} from "@cms/content/page-validation";
import { keepRevision } from "@cms/content/revisions";
import { normalizeSlug } from "@cms/universal/slug";
import { execute, insert, queryAll, queryOne, transaction } from "@cms/core/db";
import { parseId } from "@cms/core/id";

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

const toPage = (row: PageRow): StoredPage => ({
  id: row.id,
  type: row.type,
  slug: row.slug,
  title: row.title,
  status: row.status,
  ...parsePageContent(row.content),
  updatedAt: row.updated_at,
  version: row.version,
});

export function listPages(): PageSummary[] {
  const rows = queryAll<Pick<PageRow, "id" | "type" | "slug" | "title" | "status" | "updated_at">>(
    "SELECT id, type, slug, title, status, updated_at FROM pages ORDER BY slug",
  );
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    slug: r.slug,
    title: r.title,
    status: r.status,
    updatedAt: r.updated_at,
  }));
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

  if (id) {
    const current = queryOne<{ version: number }>("SELECT version FROM pages WHERE id = ?", id);
    if (!current) {
      return { errors: [{ message: "Page not found" }] };
    }
    if (input.baseVersion != null && current.version !== Number(input.baseVersion)) {
      return { conflict: true, errors: [{ message: "The page was changed by someone else" }] };
    }
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

function insertPage({ type, slug, title, status, content }: PageValues): number {
  return insert(
    "INSERT INTO pages (type, slug, title, status, content) VALUES (?, ?, ?, ?, ?)",
    type,
    slug,
    title,
    status,
    content,
  );
}

/**
 * Replaces an existing page and keeps the replaced version as a revision. Saving it
 * unchanged changes nothing: no revision, same version and time of the last change.
 */
function updatePage(id: number, { type, slug, title, status, content }: PageValues): number {
  const stored = queryOne<PageValues>(
    "SELECT type, slug, title, status, content FROM pages WHERE id = ?",
    id,
  );
  const values: PageValues = { type, slug, title, status, content };
  if (stored && (Object.keys(values) as (keyof PageValues)[]).every((k) => stored[k] === values[k])) {
    return id;
  }
  keepRevision(id);
  execute(
    `UPDATE pages SET type = ?, slug = ?, title = ?, status = ?, content = ?,
     version = version + 1, updated_at = datetime('now') WHERE id = ?`,
    type,
    slug,
    title,
    status,
    content,
    id,
  );
  return id;
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
  const taken = new Set(
    queryAll<{ slug: string }>("SELECT slug FROM pages").map((r) => r.slug),
  );
  const base = normalizeSlug(`${page.slug}-copy`);
  let slug = base;
  for (let n = 2; taken.has(slug); n++) {
    slug = `${base}-${n}`;
  }
  const { id: _, version, updatedAt, ...content } = page;
  const { page: copy, errors } = savePage({ ...content, title, slug, status: "draft" });
  return copy?.id ?? (errors && console.error(errors), undefined);
}
