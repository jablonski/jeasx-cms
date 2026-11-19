/** The editor's controls around the blocks on the canvas (rendered on the server). */
import type { Block } from "@cms/content/blocks";

/** Position of a block in its list, as attributes for the controls acting on it. */
export type BlockAt = { "data-path": string; "data-index": number };

/** Placeholder of a block list without blocks. */
export function EmptyList({ path }: { path: string }) {
  const isPage = path === "blocks";
  return (
    <button
      type="button"
      class={isPage ? "cms-empty cms-empty-page" : "cms-empty"}
      data-action="insert-block"
      data-path={path}
      data-index="0"
    >
      <span>＋</span> {isPage ? "Add your first block" : "Add block"}
    </button>
  );
}

/** A block whose type is gone from the site's configuration: shown, so it can be removed. */
export function UnknownBlock({ block, at }: { block: Block; at: BlockAt }) {
  return (
    <div
      class="block cms-block cms-unknown"
      role="group"
      {...at}
      data-block-id={block.id}
      data-label={block.type}
      tabindex="0"
      aria-label={`Unknown block ${block.type}`}
    >
      <div class="cms-bar">
        <span class="cms-label">Unknown block</span>
        <button type="button" data-action="remove-block" {...at} title="Delete">
          <TrashIcon />
        </button>
      </div>
      <p>
        The block type <code>{block.type}</code> no longer exists. Remove this block to save the
        page.
      </p>
    </div>
  );
}

/** The icon bar of a block. */
export function BlockBar({
  label,
  at,
  isFirst,
  isLast,
}: {
  label: string;
  at: BlockAt;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div class="cms-bar">
      <span class="cms-grip" draggable="true" {...at} title="Drag to move">
        ⠿
      </span>
      <span class="cms-label">{label}</span>
      <button type="button" data-action="edit-block" {...at} title="Edit (double-click)">
        ✎ Edit
      </button>
      <button
        type="button"
        data-action="move-block"
        {...at}
        data-dir="-1"
        disabled={isFirst}
        title="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        data-action="move-block"
        {...at}
        data-dir="1"
        disabled={isLast}
        title="Move down"
      >
        ↓
      </button>
      <button type="button" data-action="duplicate-block" {...at} title="Duplicate">
        ⧉
      </button>
      <button type="button" data-action="remove-block" {...at} title="Delete">
        <TrashIcon />
      </button>
    </div>
  );
}

/** Button inserting a new block above or below another one. */
export function InsertButton({
  side,
  path,
  index,
  label,
}: {
  side: "before" | "after";
  path: string;
  index: number;
  label: string;
}) {
  return (
    <button
      type="button"
      class={`cms-insert cms-insert-${side}`}
      data-action="insert-block"
      data-path={path}
      data-index={index}
      title={`Add block ${side === "before" ? "above" : "below"} ${label}`}
    >
      ＋
    </button>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      style="vertical-align: -0.125em"
      aria-hidden="true"
    >
      <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.75 7v3.5M9.25 7v3.5" />
    </svg>
  );
}
