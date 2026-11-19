import { normalizeBlocks } from "@cms/content/block-data";
import { type BlockLists, indexBlockLists, isContainer } from "@cms/content/block-tree";
import { BLOCKS, type Block, type BlockDefinition } from "@cms/content/blocks";
import type { Field, Fields } from "@cms/content/fields";
import { BlockBar, EmptyList, InsertButton, UnknownBlock } from "@cms/render/canvas-controls";
import { jsxToString } from "jsx-async-runtime";

/** Field types that can be edited directly on the page. */
const INLINE = new Set(["text", "textarea", "richtext"]);

/** Resolves a field definition by a name relative to the block data, e.g. "items.0.title". */
function resolveField(fields: Fields | undefined, name: string): Field | undefined {
  let field: Field | undefined;
  for (const key of name.split(".")) {
    if (/^\d+$/.test(key)) {
      continue;
    }
    field = fields?.[key];
    fields = field?.type === "list" ? field.fields : undefined;
  }
  return field;
}

/**
 * Builds the `field(name)` helper passed to block components in the editor:
 * returns attributes that make the element editable in place.
 * @param editable "plaintext-only" where supported, else "true"
 */
function createField(def: BlockDefinition, editable: string) {
  const field = (name: string) => {
    const f = resolveField(def.fields, name);
    if (!f || !INLINE.has(f.type)) {
      return {};
    }
    return {
      "data-cms-field": name,
      "data-cms-kind": f.type,
      "data-placeholder": f.label,
      // rich text is edited as rendered HTML (formatting via the canvas' text toolbar)
      contenteditable: f.type === "richtext" ? "true" : editable,
      spellcheck: "true",
    };
  };
  field.editing = true;
  return field;
}

/**
 * Visual editor: renders the page with the real block components and wraps
 * every block (also nested ones) with an icon bar and insert buttons.
 *
 * Container components render children via their `Blocks` prop. Here that is
 * `NestedBlocks`, which looks up the path of the child list in `this.lists`
 * (a WeakMap from block arrays to their path, built before rendering).
 */
function EditableBlocks(
  this: { lists: BlockLists; editable: string },
  { blocks, path }: { blocks: Block[]; path: string },
) {
  const list = blocks ?? [];
  if (!list.length) {
    return <EmptyList path={path} />;
  }
  return list.map((block, index) => {
    const def = BLOCKS[block.type];
    const at = { "data-path": path, "data-index": index };
    if (!def) {
      return <UnknownBlock block={block} at={at} />;
    }
    return (
      <div
        class={isContainer(block.type) ? "block cms-block cms-container" : "block cms-block"}
        role="group"
        {...at}
        data-block-id={block.id}
        data-label={def.label}
        tabindex="0"
        aria-label={`${def.label} block`}
      >
        <BlockBar
          label={def.label}
          at={at}
          isFirst={index === 0}
          isLast={index === list.length - 1}
        />
        <InsertButton side="before" path={path} index={index} label={def.label} />
        <InsertButton side="after" path={path} index={index + 1} label={def.label} />
        <def.Component
          {...block.data}
          Blocks={NestedBlocks}
          field={createField(def, this.editable)}
        />
      </div>
    );
  });
}

function NestedBlocks(this: { lists: BlockLists }, { blocks }: { blocks: Block[] }) {
  const info = this.lists.get(blocks);
  return info ? <EditableBlocks blocks={blocks} path={info.path} /> : null;
}

/**
 * Renders a draft page's blocks as editor canvas HTML (server side). The data is
 * normalized first, so drafts from the browser can't break the site's components.
 *
 * @param editable contenteditable mode of the browser
 * @param context extra `this` context for components (e.g. request, reply)
 */
export function renderCanvas(
  page: { type: string; blocks: unknown },
  editable: "plaintext-only" | "true",
  context: object = {},
): string | Promise<string> {
  const blocks = normalizeBlocks(page.blocks);
  return jsxToString.call(
    { ...context, lists: indexBlockLists(blocks), editable },
    <EditableBlocks blocks={blocks} path="blocks" />,
  );
}
