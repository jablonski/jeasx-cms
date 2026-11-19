import { openModal } from "@cms/browser/shared/dialog";
import { XIcon } from "@cms/shared/icons";
import { BLOCKS } from "@cms/content/blocks";

/** Grid of block types to insert. */
function BlockPicker({ allowed }: { allowed: readonly string[] }) {
  return (
    <form method="dialog">
      <header class="picker-header">
        <h2 id="picker-title">Add a block</h2>
        <button type="submit" value="" class="drawer-close" title="Close">
          <XIcon />
        </button>
      </header>
      <div class="picker-grid">
        {allowed.map((type) => {
          const def = BLOCKS[type];
          return (
            <button type="submit" value={type} class="picker-item">
              <span class="picker-icon" aria-hidden="true">
                {def.icon ?? "▢"}
              </span>
              <strong>{def.label}</strong>
              {def.description && <small>{def.description}</small>}
            </button>
          );
        })}
      </div>
    </form>
  );
}

/** Modal grid of block types. Resolves the chosen type or null. */
export function pickBlockType(allowed: readonly string[]): Promise<string | null> {
  return openModal({
    content: <BlockPicker allowed={allowed} />,
    className: "picker",
    labelledBy: "picker-title",
    dismissValue: "",
    result: (dialog) => dialog.returnValue || null,
  });
}
