/**
 * Block and page type registry (core). The site hands its definitions over at startup
 * via `configureCms()` in configure.ts, which validates them; the core never imports site
 * code. The admin editor in the browser only gets the blocks' schemas (fields, labels,
 * icons) as JSON via `blockSchema()` and registers those; block components only ever run
 * on the server. Keep this file free of Node.js imports.
 */
import type { Field, Fields } from "@cms/universal/fields";
import { shared } from "@cms/universal/global";

export interface BlockDefinition {
  /** unique key stored in the database */
  type: string;
  label: string;
  /** symbol shown in the block picker */
  icon?: string;
  /** short help text shown in the block picker */
  description?: string;
  fields: Fields;
  /**
   * JSX component receiving the block data as props, plus
   * - `Blocks`: the RenderBlocks component to render nested "blocks" fields
   * - `field(name)`: attributes making an element inline-editable in the visual editor
   *   (empty object on the site). `field.editing` is true in the editor, e.g. to show
   *   optional elements that are empty. Supported for text, textarea and richtext fields;
   *   names may point into lists, e.g. `field("items.0.title")`.
   */
  // biome-ignore lint/suspicious/noExplicitAny: each block declares its own props (see defineBlock)
  Component: (data: any) => any;
}

/** Helper passed to block components for inline editing (see BlockDefinition). */
export type FieldHelper = ((name: string) => Record<string, unknown>) & { editing: boolean };

/** The stored value of a field definition. */
type FieldValue<F extends Field> = F extends { type: "number" }
  ? number
  : F extends { type: "boolean" }
    ? boolean
    : F extends { type: "blocks" }
      ? Block[]
      : F extends { type: "list"; fields: infer Item extends Fields }
        ? FieldValues<Item>[]
        : F extends { type: "select"; options: readonly { value: infer Value }[] }
          ? Value
          : string;

/** The stored data of a set of field definitions. */
export type FieldValues<F extends Fields> = { -readonly [Name in keyof F]: FieldValue<F[Name]> };

/** What a block component receives: its data, `Blocks` and `field`. */
export type BlockProps<F extends Fields> = FieldValues<F> & {
  Blocks: (props: { blocks: Block[] }) => JSX.Element;
  field: FieldHelper;
};

/** Defines a block whose component props are inferred from its fields. */
export function defineBlock<const F extends Fields>(
  definition: Omit<BlockDefinition, "fields" | "Component"> & {
    fields: F;
    Component: (props: BlockProps<F>) => unknown;
  },
): BlockDefinition {
  return definition;
}

export interface Block {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface PageType {
  label: string;
  /** fields of the page itself (beside title, slug and blocks: `page.description`) */
  fields: Fields;
  /** allowed block types */
  blocks: string[];
  /** blocks added to new pages */
  initialBlocks?: string[];
}

/** The registry as plain data for the admin editor (everything except components). */
export interface Schema {
  blocks: Omit<BlockDefinition, "Component">[];
  pages: Record<string, PageType>;
}

// The registries are looked up with untrusted names: without a prototype,
// names like "constructor" are unknown as they should be.

/** Registered blocks by type (filled by registerBlocks). */
export const BLOCKS = shared<Record<string, BlockDefinition>>("__cmsBlocks", () =>
  Object.create(null),
);

/** Registered page types by name (filled by registerBlocks). */
export const PAGE_TYPES = shared<Record<string, PageType>>("__cmsPageTypes", () =>
  Object.create(null),
);

/**
 * Replaces the registry's content. The server registers the site's validated definitions,
 * the browser the schema from `blockSchema()`, whose blocks have no components.
 */
export function registerBlocks({ blocks, pages }: Schema): void {
  for (const key of Object.keys(BLOCKS)) {
    delete BLOCKS[key];
  }
  for (const key of Object.keys(PAGE_TYPES)) {
    delete PAGE_TYPES[key];
  }
  for (const block of blocks) {
    BLOCKS[block.type] = block as BlockDefinition;
  }
  Object.assign(PAGE_TYPES, pages);
}

/** The registry as plain data for the admin editor (everything except components). */
export function blockSchema(): Schema {
  return {
    blocks: Object.values(BLOCKS).map(({ Component, ...schema }) => schema),
    pages: PAGE_TYPES,
  };
}
