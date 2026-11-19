import { defineBlock } from "@cms/universal/blocks";
import RichText from "@cms/universal/rich-text";
import Heading from "./Heading";

export default defineBlock({
  type: "text",
  label: "Text",
  icon: "¶",
  description: "Heading and formatted text",
  fields: {
    heading: { type: "text", label: "Heading" },
    text: {
      type: "richtext",
      label: "Text",
      help: "Blank line = paragraph",
    },
  },
  Component({ heading, text, field }) {
    return (
      <section class="block-text">
        <Heading text={heading} field={field} />
        <RichText text={text} {...field("text")} />
      </section>
    );
  },
});
