/** The rules for moving blocks by drag & drop. Pure functions without DOM access. */
import {
  allowedBlocksAt,
  type BlockPosition,
  blocksAt,
  type DraftPage,
} from "@cms/browser/editor/paths";
import { innerLevels, listDepth, MAX_DEPTH } from "@cms/content/block-tree";
import type { Block } from "@cms/content/blocks";

/** A block being dragged: where it comes from, and the block itself. */
export interface Drag extends BlockPosition {
  block: Block;
}

/**
 * Can the dragged block be inserted into the list at `path` before `index`?
 * Returns null if not allowed, `{ noop: true }` if it would stay where it is.
 */
export function checkDrop(
  page: DraftPage,
  drag: Drag | null,
  path: string,
  index: number,
): (BlockPosition & { noop: boolean }) | null {
  if (!drag) {
    return null;
  }
  const own = `${drag.path}.${drag.index}`;
  if (path === own || path.startsWith(`${own}.`)) {
    return null; // into itself
  }
  if (!allowedBlocksAt(page, path).includes(drag.block.type)) {
    return null; // type not allowed
  }
  if (listDepth(path) + innerLevels(drag.block) > MAX_DEPTH) {
    return null; // too deep
  }
  const noop = path === drag.path && (index === drag.index || index === drag.index + 1);
  return { path, index, noop };
}

/** Moves the dragged block into the list at `path` before `index`. */
export function applyMove(page: DraftPage, drag: Drag, path: string, index: number): void {
  // Resolve both arrays before changing anything: removing the block may shift
  // indices in the target path (e.g. moving a block into a later sibling container).
  const source = blocksAt(page, drag.path);
  const destination = blocksAt(page, path);
  source.splice(drag.index, 1);
  if (source === destination && drag.index < index) {
    index--;
  }
  destination.splice(index, 0, drag.block);
}
