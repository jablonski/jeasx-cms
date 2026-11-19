/** Opens the side dialogs for a block's fields and the page settings. */
import BlockDialog from "@cms/browser/editor/block-dialog";
import type { DrawerController } from "@cms/browser/editor/drawer";
import SettingsDialog from "@cms/browser/editor/settings-dialog";
import type { Editor } from "@cms/browser/editor/state";
import { BLOCKS } from "@cms/universal/blocks";

export function createSideDialogs(
  { state, blocksAt, locate, select }: Editor,
  drawer: DrawerController,
) {
  function editBlock(blockId: string) {
    /** The block where it is now: positions change while the dialog is open. */
    const current = () => {
      const pos = locate(blockId);
      return pos && { ...pos, block: blocksAt(pos.path)[pos.index] };
    };
    const found = current();
    if (!found) {
      return;
    }
    select(blockId, true);
    if (!BLOCKS[found.block.type]) {
      return; // unknown type: no fields to edit
    }
    drawer.open({
      snapshot: () => {
        const at = current();
        return at && structuredClone(at.block);
      },
      view: () => {
        const at = current();
        return at && <BlockDialog path={at.path} index={at.index} block={at.block} />;
      },
      restore: (copy) => {
        const pos = locate(blockId);
        if (pos && copy) {
          blocksAt(pos.path)[pos.index] = copy;
        }
      },
    });
  }

  function editSettings() {
    drawer.open({
      snapshot: () =>
        structuredClone({
          title: state.page.title,
          slug: state.page.slug,
          meta: state.page.meta,
        }),
      view: () => <SettingsDialog page={state.page} />,
      restore: (copy) => Object.assign(state.page, copy),
    });
  }

  return { editBlock, editSettings };
}
