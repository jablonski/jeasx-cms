/** Reading the structure of nested blocks. Keep this file free of Node.js imports. */
import { BLOCKS, type Block } from "@cms/content/blocks";
import type { Fields } from "@cms/content/fields";

/**
 * Safety limit for nested blocks (page level = 0). Nesting is defined by the content
 * model (which blocks a `blocks` field allows); this only stops absurdly deep data,
 * e.g. from a crafted request, before it overflows the stack.
 */
export const MAX_DEPTH = 8;

/** Every (nested) block array with its data path. */
export type BlockLists = WeakMap<Block[], { path: string }>;

/**
 * Maps every (nested) block array to its path, e.g. page.blocks → { path: "blocks" }.
 * Arrays are keys (identity).
 */
export function indexBlockLists(blocks: Block[]): BlockLists {
  const lists: BlockLists = new WeakMap();
  const walkBlocks = (list: Block[], path: string) => {
    lists.set(list, { path });
    list.forEach((block, i) => {
      const def = BLOCKS[block.type];
      if (def) {
        walkFields(def.fields, block.data, `${path}.${i}.data`);
      }
    });
  };
  const walkFields = (fields: Fields, data: unknown, prefix: string) => {
    for (const [name, field] of Object.entries(fields)) {
      const value = (data as Record<string, unknown> | null | undefined)?.[name];
      if (!Array.isArray(value)) {
        continue;
      }
      if (field.type === "blocks") {
        walkBlocks(value, `${prefix}.${name}`);
      } else if (field.type === "list") {
        value.forEach((item, i) => walkFields(field.fields, item, `${prefix}.${name}.${i}`));
      }
    }
  };
  walkBlocks(blocks, "blocks");
  return lists;
}

/** Is the value a block ({ id, type, data })? */
export const isBlock = (v: unknown): v is Block =>
  typeof v === "object" &&
  v !== null &&
  "type" in v &&
  typeof v.type === "string" &&
  "data" in v &&
  "id" in v;

/** Does the block type hold nested blocks (directly or in list items)? */
export const isContainer = (type: string): boolean => holdsBlocks(BLOCKS[type]?.fields ?? {});

const holdsBlocks = (fields: Fields): boolean =>
  Object.values(fields).some(
    (f) => f.type === "blocks" || (f.type === "list" && holdsBlocks(f.fields)),
  );

/** Nesting depth of the block list at a data path: blocks on the way down ("…N.data…"). */
export function listDepth(path: string): number {
  const keys = path.split(".");
  return keys.filter((key, i) => key === "data" && /^\d+$/.test(keys[i - 1])).length;
}

/** How many block-list levels a block (or value) contains; 0 for a plain block. */
export function innerLevels(value: unknown): number {
  let max = 0;
  const visit = (v: unknown) => {
    if (Array.isArray(v)) {
      const blocks = v.filter(isBlock);
      if (blocks.length) {
        max = Math.max(max, 1 + Math.max(...blocks.map(innerLevels)));
      } else {
        v.forEach(visit);
      }
    } else if (v && typeof v === "object") {
      Object.values(v).forEach(visit);
    }
  };
  visit(isBlock(value) ? value.data : value);
  return max;
}
