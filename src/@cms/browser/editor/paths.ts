/**
 * Data paths into a page being edited, e.g. "blocks.0.data.columns.1.blocks.2.data.title"
 * or "meta.description". Pure functions without DOM access: the page is always passed in.
 */
import { newId } from "@cms/universal/block-data";
import { indexBlockLists, isBlock } from "@cms/universal/block-tree";
import { BLOCKS, type Block, PAGE_TYPES } from "@cms/universal/blocks";
import type { BlocksField, Field, Fields } from "@cms/universal/fields";

/** The parts of a page the editor works on. */
export interface DraftPage {
  type: string;
  blocks: Block[];
  meta?: Record<string, unknown>;
}

/** Position of a block: the data path of its list and its index there. */
export interface BlockPosition {
  path: string;
  index: number;
}

/** "blocks.0.data" → ["blocks", 0, "data"] */
const parsePath = (path: string): (string | number)[] =>
  path.split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p));

/** The value under a key of an object or array, if there is one. */
const child = (node: unknown, key: string | number): unknown =>
  node && typeof node === "object" ? (node as Record<string | number, unknown>)[key] : undefined;

export function getAt(page: DraftPage, path: string): unknown {
  return parsePath(path).reduce<unknown>(child, page);
}

/** The list at a path; empty if there is none. */
const listAt = <T>(page: DraftPage, path: string): T[] => {
  const list = getAt(page, path);
  return Array.isArray(list) ? list : [];
};

/** The block list at a path, e.g. "blocks" or "blocks.0.data.blocks". */
export const blocksAt = (page: DraftPage, path: string) => listAt<Block>(page, path);

/** The items of a "list" field at a path. */
export const itemsAt = (page: DraftPage, path: string) =>
  listAt<Record<string, unknown>>(page, path);

/** The text at a path; empty if there is none. */
export function textAt(page: DraftPage, path: string): string {
  const text = getAt(page, path);
  return typeof text === "string" ? text : "";
}

export function setAt(page: DraftPage, path: string, value: unknown): void {
  const keys = parsePath(path);
  const last = keys.pop()!;
  const parent = keys.reduce<unknown>(child, page) as Record<string | number, unknown>;
  parent[last] = value;
}

/** Finds the current path and index of a block by id (indices change when blocks move). */
export function locate(page: DraftPage, blockId: string): BlockPosition | null {
  const lists = indexBlockLists(page.blocks);
  let found: BlockPosition | null = null;
  const visit = (value: unknown): void => {
    if (found || !value || typeof value !== "object") {
      return;
    }
    if (Array.isArray(value)) {
      const info = lists.get(value);
      if (info) {
        const i = value.findIndex((b) => b.id === blockId);
        if (i >= 0) {
          return void (found = { path: info.path, index: i });
        }
      }
      value.forEach(visit);
    } else {
      Object.values(value).forEach(visit);
    }
  };
  visit(page.blocks);
  return found;
}

/**
 * Resolves the field definition for a path, walking through meta fields, lists
 * and (nested) blocks, e.g. "blocks.0.data.columns.1.blocks.2.data.items".
 * The page-level "blocks" resolves to a virtual blocks field of the page type.
 */
export function fieldAt(page: DraftPage, path: string): Field | undefined {
  const keys = parsePath(path);
  const type = PAGE_TYPES[page.type];
  if (!type) {
    return undefined; // the page type is gone from the site's configuration
  }
  let node: unknown;
  let fields: Fields | undefined;
  let field: Field | undefined;
  if (keys[0] === "blocks") {
    field = { type: "blocks", label: "Blocks", blocks: type.blocks } satisfies BlocksField;
    node = page.blocks;
  } else if (keys[0] === "meta") {
    fields = type.fields;
    node = page.meta;
  } else {
    return undefined;
  }

  for (let i = 1; i < keys.length; i++) {
    const key = keys[i];
    if (field?.type === "blocks") {
      const block = child(node, key) as Block | undefined;
      i++; // skip "data"
      fields = BLOCKS[block?.type ?? ""]?.fields ?? {};
      node = block?.data;
      field = undefined;
    } else if (field?.type === "list") {
      node = child(node, key); // item
      fields = field.fields;
      field = undefined;
    } else {
      field = fields?.[key];
      node = child(node, key);
      if (!field) {
        return undefined;
      }
    }
  }
  return field;
}

/** The block types allowed in the list at a path. */
export function allowedBlocksAt(page: DraftPage, path: string): readonly string[] {
  const field = fieldAt(page, path);
  return field?.type === "blocks" ? field.blocks : [];
}

/**
 * The block a field path belongs to:
 * "blocks.0.data.columns.1.blocks.2.data.title" → { path: "blocks.0.data.columns.1.blocks", index: 2 }
 */
export function blockOfPath(path: string | undefined): BlockPosition | null {
  if (!path?.startsWith("blocks.")) {
    return null;
  }
  // the path is a block itself, or the innermost "<list>.<index>.data" segment belongs to the block
  const match = /^(.*)\.(\d+)$/.exec(path) ?? /^(.*)\.(\d+)\.data(?:\.|$)/.exec(path);
  return match && { path: match[1], index: Number(match[2]) };
}

/** Gives a copied block (and all nested blocks) fresh ids. */
export function renewIds<T>(value: T): T {
  if (Array.isArray(value)) {
    value.forEach(renewIds);
  } else if (value && typeof value === "object") {
    if (isBlock(value)) {
      value.id = newId();
    }
    Object.values(value as object).forEach(renewIds);
  }
  return value;
}

/** Moves a list entry by position; out-of-range targets are ignored. */
export function move(list: unknown[], from: number, to: number): void {
  if (to < 0 || to >= list.length) {
    return;
  }
  list.splice(to, 0, list.splice(from, 1)[0]);
}
