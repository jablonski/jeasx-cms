/** Creating blocks and coercing untrusted block data. Keep this file free of Node.js imports. */
import { MAX_DEPTH } from "@cms/universal/block-tree";
import { BLOCKS, type Block } from "@cms/universal/blocks";
import { defaults, sanitize, type ValidationError } from "@cms/universal/fields";

/** Where walking the blocks of a page starts. */
const PAGE_LEVEL = { prefix: "", depth: 0, at: "blocks" };

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createBlock(type: string): Block {
  return { id: newId(), type, data: defaults(BLOCKS[type].fields) };
}

/**
 * Coerces untrusted block data into the shape of the block definitions (like saving
 * does: types, defaults, safe URLs), but keeps every block, so positions stay the
 * same. Used to render stored pages and drafts in the editor.
 */
export function normalizeBlocks(blocks: unknown): Block[] {
  return walkBlocks(blocks, { ...PAGE_LEVEL, strict: false, allowed: [] }).value;
}

/** Validates a page's blocks (recursively) against their definitions and the allowed types. */
export function sanitizeBlocks(blocks: unknown, allowed: string[]) {
  return walkBlocks(blocks, { ...PAGE_LEVEL, strict: true, allowed });
}

/** A block from untrusted input: any of this may be missing or of another type. */
type RawBlock = { id?: unknown; type?: unknown; data?: unknown } | null | undefined;

interface WalkOptions {
  /** saving: blocks that can't be stored are errors; otherwise they are kept for rendering */
  strict: boolean;
  /** block types allowed in this list (strict only) */
  allowed: readonly string[];
  /** readable location for messages */
  prefix: string;
  /** nesting level of this list (page level = 0) */
  depth: number;
  /** data path of this list, e.g. "blocks" or "blocks.0.data.blocks" */
  at: string;
}

/**
 * Walks a list of blocks. Strict (saving): blocks that can't be stored are errors, never
 * dropped silently, and error paths use the original indices (as in the editor). Lenient
 * (rendering): unknown and disallowed blocks are kept, so positions stay the same.
 */
function walkBlocks(
  blocks: unknown,
  { strict, allowed, prefix, depth, at }: WalkOptions,
): { value: Block[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const list: RawBlock[] = Array.isArray(blocks) ? blocks : [];
  if (depth > MAX_DEPTH) {
    return {
      value: [],
      errors: list.length ? [{ message: `${prefix}blocks nested too deeply`, path: at }] : [],
    };
  }
  const value: Block[] = [];
  list.forEach((raw, i) => {
    const type = String(raw?.type ?? "");
    const def = !strict || allowed.includes(type) ? BLOCKS[type] : undefined;
    if (!def && strict) {
      const name = BLOCKS[type]?.label ?? `Unknown block type "${type}"`;
      errors.push({
        message: `${prefix}Block ${i + 1} (${name}) isn't allowed here. Remove it to save this page.`,
        path: `${at}.${i}`,
      });
      return;
    }
    const id =
      typeof raw?.id === "string" && (!strict || /^[a-z0-9]{1,16}$/.test(raw.id))
        ? raw.id
        : newId();
    if (!def) {
      value.push({ id, type, data: {} });
      return;
    }
    const data = sanitize(def.fields, raw?.data, {
      prefix: `${prefix}Block ${i + 1} (${def.label}) › `,
      nested: (nested, nestedAllowed, nestedPrefix, nestedAt) =>
        walkBlocks(nested, {
          strict,
          allowed: nestedAllowed,
          prefix: nestedPrefix,
          depth: depth + 1,
          at: nestedAt,
        }),
      at: `${at}.${i}.data`,
    });
    errors.push(...data.errors);
    value.push({ id, type, data: data.value });
  });
  return { value, errors };
}
