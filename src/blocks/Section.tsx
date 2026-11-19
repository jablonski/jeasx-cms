import { defineBlock } from "@cms/shared/blocks";
import Heading from "./Heading";

/** Container block: groups nested blocks on a background. */
export default defineBlock({
  type: "section",
  label: "Section",
  icon: "▭",
  description: "Group blocks on a background",
  fields: {
    heading: { type: "text", label: "Heading" },
    background: {
      type: "select",
      label: "Background",
      options: [
        { value: "none", label: "None" },
        { value: "soft", label: "Soft" },
        { value: "accent", label: "Accent" },
        { value: "dark", label: "Dark" },
      ],
    },
    blocks: {
      type: "blocks",
      label: "Content",
      blocks: [
        "text",
        "image",
        "gallery",
        "features",
        "stats",
        "quote",
        "cta",
        "notice",
        "accordion",
        "download",
        "table",
        "pricing",
        "team",
        "timeline",
        "logos",
        "articles",
        "columns",
      ],
    },
  },
  Component({ heading, background, blocks, Blocks, field }) {
    return (
      <section class={`block-section bg-${background}`}>
        <Heading text={heading} field={field} />
        <Blocks blocks={blocks} />
      </section>
    );
  },
});
