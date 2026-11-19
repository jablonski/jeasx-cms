import DrawerLayout, { CancelAndDone } from "@cms/browser/editor/drawer-layout";
import FieldInput from "@cms/browser/editor/field-input";
import { BLOCKS, type Block } from "@cms/content/blocks";

/** Side dialog to edit the fields of one block. Inputs update the page live. */
export default function BlockDialog({
  path,
  index,
  block,
}: {
  path: string;
  index: number;
  block: Block;
}) {
  const def = BLOCKS[block.type];
  return (
    <DrawerLayout
      icon={def.icon ?? "▢"}
      title={def.label}
      description={def.description}
      footer={
        <>
          <button
            type="button"
            class="danger"
            data-action="remove-block"
            data-path={path}
            data-index={index}
          >
            Delete block
          </button>
          <CancelAndDone />
        </>
      }
    >
      {Object.entries(def.fields).map(([name, field]) => (
        <FieldInput path={`${path}.${index}.data.${name}`} field={field} value={block.data[name]} />
      ))}
    </DrawerLayout>
  );
}
