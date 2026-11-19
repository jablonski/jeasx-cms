import { normalizeBlocks } from "@cms/universal/block-data";
import { BLOCKS, type Block } from "@cms/universal/blocks";

/** Field helper for the public site: no inline editing attributes. */
const NO_FIELD = Object.assign(() => ({}), { editing: false });

/**
 * Renders a list of blocks with their components.
 * Container blocks receive this component as `Blocks` prop to render their children
 * (passed in instead of imported to avoid a circular import).
 * Used for the public site; the editor canvas uses render-canvas.tsx.
 */
export default function RenderBlocks({ blocks }: { blocks: unknown }) {
  // Stored data may predate the current fields of its blocks.
  return <NormalizedBlocks blocks={normalizeBlocks(blocks)} />;
}

function NormalizedBlocks({ blocks }: { blocks: Block[] }) {
  return (blocks ?? []).map((block) => {
    const def = BLOCKS[block.type];
    return def ? (
      <div class="block" data-block-id={block.id}>
        <def.Component {...block.data} Blocks={NormalizedBlocks} field={NO_FIELD} />
      </div>
    ) : null;
  });
}
