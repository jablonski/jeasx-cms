import { defineBlock } from "@cms/shared/blocks";
import RichText from "@cms/shared/rich-text";

/**
 * A URL for use in CSS. URLs may be encoded already: their % signs must not be encoded a
 * second time. encodeURI throws on broken Unicode, which would take the whole page down.
 */
const cssUrl = (url: string) => encodeURI(url.toWellFormed()).replaceAll("%25", "%");

export default defineBlock({
  type: "hero",
  label: "Hero",
  icon: "✦",
  description: "Large headline with text, button and optional background image",
  fields: {
    heading: { type: "text", label: "Heading", required: true, default: "A bold headline" },
    text: { type: "richtext", label: "Text" },
    image: { type: "image", label: "Background image" },
    ctaLabel: { type: "text", label: "Button label" },
    ctaUrl: { type: "url", label: "Button link" },
    align: {
      type: "select",
      label: "Alignment",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
      ],
    },
  },
  Component({ heading, text, image, ctaLabel, ctaUrl, align, field }) {
    return (
      <section
        class={`block-hero align-${align}`}
        style={image ? `--hero-image: url("${cssUrl(image)}")` : undefined}
      >
        <h1 {...field("heading")}>{heading}</h1>
        {(text || field.editing) && <RichText text={text} {...field("text")} />}
        {((ctaLabel && ctaUrl) || field.editing) && (
          <a class="button" href={ctaUrl || "#"} {...field("ctaLabel")}>
            {ctaLabel}
          </a>
        )}
      </section>
    );
  },
});
