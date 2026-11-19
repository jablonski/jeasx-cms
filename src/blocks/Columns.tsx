import { defineBlock } from "@cms/universal/blocks";

export default defineBlock({
  type: "columns",
  label: "Columns",
  icon: "◫",
  description: "Place blocks side by side",
  fields: {
    ratio: {
      type: "select",
      label: "Column widths",
      options: [
        { value: "equal", label: "Equal" },
        { value: "wide-left", label: "Wide left (2:1)" },
        { value: "wide-right", label: "Wide right (1:2)" },
      ],
    },
    align: {
      type: "select",
      label: "Vertical alignment",
      options: [
        { value: "start", label: "Top" },
        { value: "center", label: "Center" },
      ],
    },
    columns: {
      type: "list",
      label: "Columns",
      default: [{ blocks: [] }, { blocks: [] }],
      fields: {
        blocks: {
          type: "blocks",
          label: "Content",
          blocks: [
            "text",
            "image",
            "quote",
            "cta",
            "features",
            "stats",
            "notice",
            "accordion",
            "download",
            "table",
            "timeline",
          ],
        },
      },
    },
  },
  Component({ ratio, align, columns, Blocks }) {
    const template =
      columns.length === 2 && ratio === "wide-left"
        ? "2fr 1fr"
        : columns.length === 2 && ratio === "wide-right"
          ? "1fr 2fr"
          : `repeat(${columns.length || 1}, 1fr)`;
    return (
      <section class={`block-columns align-${align}`} style={`--template: ${template}`}>
        {columns.map((column) => (
          <div class="column">
            <Blocks blocks={column.blocks} />
          </div>
        ))}
      </section>
    );
  },
});
