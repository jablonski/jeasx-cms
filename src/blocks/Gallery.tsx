import { defineBlock } from "@cms/content/blocks";
import Heading from "./Heading";
import OptionalText from "./OptionalText";

export default defineBlock({
  type: "gallery",
  label: "Gallery",
  icon: "▤",
  description: "Grid of images with captions",
  fields: {
    heading: { type: "text", label: "Heading" },
    columns: {
      type: "select",
      label: "Columns",
      default: "3",
      options: [
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" },
      ],
    },
    images: {
      type: "list",
      label: "Images",
      itemLabel: "caption",
      fields: {
        src: { type: "image", label: "Image", required: true },
        alt: { type: "text", label: "Alternative text" },
        caption: { type: "text", label: "Caption" },
      },
    },
  },
  Component({ heading, columns, images, field }) {
    return (
      <section class="block-gallery">
        <Heading text={heading} field={field} />
        <ul style={`--columns: ${columns}`}>
          {images.map(({ src, alt, caption }, i) => (
            <li>
              <figure>
                {src && <img src={src} alt={alt} loading="lazy" />}
                <OptionalText
                  as="figcaption"
                  value={caption}
                  name={`images.${i}.caption`}
                  field={field}
                />
              </figure>
            </li>
          ))}
        </ul>
      </section>
    );
  },
});
