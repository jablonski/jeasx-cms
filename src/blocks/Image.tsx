import { defineBlock } from "@cms/shared/blocks";
import OptionalText from "./OptionalText";

export default defineBlock({
  type: "image",
  label: "Image",
  icon: "▣",
  description: "Single image with caption",
  fields: {
    src: { type: "image", label: "Image URL", required: true },
    alt: { type: "text", label: "Alternative text" },
    caption: { type: "text", label: "Caption" },
    wide: { type: "boolean", label: "Full width" },
  },
  Component({ src, alt, caption, wide, field }) {
    if (!src && !field.editing) {
      return null;
    }
    return (
      <figure class={`block-image${wide ? " wide" : ""}`}>
        {src ? (
          <img src={src} alt={alt} loading="lazy" />
        ) : (
          <div class="image-placeholder">No image selected</div>
        )}
        <OptionalText as="figcaption" value={caption} name="caption" field={field} />
      </figure>
    );
  },
});
