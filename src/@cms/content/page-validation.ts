/** Checks untrusted page data from the editor before it is stored (server only). */
import { sanitizeBlocks } from "@cms/universal/block-data";
import type { PageType } from "@cms/universal/blocks";
import { sanitize, type ValidationError } from "@cms/universal/fields";
import type { Page } from "@cms/content/pages";
import { normalizeSlug } from "@cms/universal/slug";
import { queryOne } from "@cms/core/db";

/** Untrusted page data from the editor; the page type's fields sit beside the others. */
export interface PageInput {
  id?: unknown;
  type?: unknown;
  slug?: unknown;
  title?: unknown;
  status?: unknown;
  blocks?: unknown;
  baseVersion?: unknown;
  [field: string]: unknown;
}

/** Validated columns of a page. */
export interface PageValues {
  type: string;
  slug: string;
  title: string;
  status: Page["status"];
  /** JSON of the page fields with the blocks under "blocks" (see pageContent) */
  content: string;
}

/** The stored JSON of a page: its fields, flat, with the blocks under "blocks". */
export const pageContent = (fields: Record<string, unknown>, blocks: unknown[]) =>
  JSON.stringify({ ...fields, blocks });

/** The page fields and blocks of stored page JSON (see pageContent). */
export function parsePageContent(content: string): Pick<Page, "blocks"> & Record<string, unknown> {
  const { blocks = [], ...fields } = JSON.parse(content);
  return { ...fields, blocks };
}

/** Problems of a path built from `source`, except clashes with other pages. */
function slugProblems(source: string, slug: string): ValidationError[] {
  const errors: ValidationError[] = [];
  // Text without Latin letters or digits normalizes to "/": it must not become the homepage.
  if (source && slug === "/" && !/^\/+$/.test(source)) {
    errors.push({
      message: `No path can be built from »${source}«. Please enter a path with Latin letters or digits.`,
      path: "slug",
    });
  }
  return errors;
}

/** Coerces the input into storable columns and collects everything wrong with it. */
export function validatePage(
  input: PageInput,
  typeName: string,
  type: PageType,
  id: number | null,
): { values: PageValues; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const title = String(input.title ?? "").trim();
  if (!title) {
    errors.push({ message: "Title is required", path: "title" });
  }
  const slugSource = String(input.slug || title).trim();
  const slug = normalizeSlug(slugSource);
  errors.push(...slugProblems(slugSource, slug));
  // only the page type's fields are kept (unknown keys are dropped)
  const fields = sanitize(type.fields, input);
  const blocks = sanitizeBlocks(input.blocks, type.blocks);
  errors.push(...fields.errors, ...blocks.errors);

  const slugTaken = queryOne("SELECT id FROM pages WHERE slug = ? AND id IS NOT ?", slug, id);
  if (slugTaken && !errors.some((e) => e.path === "slug")) {
    errors.push({ message: `Path ${slug} is already used by another page`, path: "slug" });
  }
  const values: PageValues = {
    type: typeName,
    slug,
    title,
    status: input.status === "published" ? "published" : "draft",
    content: pageContent(fields.value, blocks.value),
  };
  return { values, errors };
}
