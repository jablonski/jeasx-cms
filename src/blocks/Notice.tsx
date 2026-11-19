import { defineBlock } from "@cms/content/blocks";
import RichText from "@cms/render/rich-text";
import OptionalText from "./OptionalText";

export default defineBlock({
  type: "notice",
  label: "Notice",
  icon: "ℹ",
  description: "Highlighted note, tip or warning",
  fields: {
    kind: {
      type: "select",
      label: "Kind",
      options: [
        { value: "info", label: "Info" },
        { value: "success", label: "Success" },
        { value: "warning", label: "Warning" },
      ],
    },
    title: { type: "text", label: "Title" },
    text: { type: "richtext", label: "Text", required: true, default: "A short note." },
  },
  Component({ kind, title, text, field }) {
    return (
      <aside class={`block-notice ${kind}`}>
        <OptionalText as="strong" value={title} name="title" field={field} />
        <RichText text={text} {...field("text")} />
      </aside>
    );
  },
});
