import { defineBlock } from "@cms/universal/blocks";
import Heading from "./Heading";

export default defineBlock({
  type: "logos",
  label: "Logos",
  icon: "◇",
  description: "Row of customer or partner logos",
  fields: {
    heading: { type: "text", label: "Heading" },
    logos: {
      type: "list",
      label: "Logos",
      itemLabel: "alt",
      fields: {
        src: { type: "image", label: "Logo", required: true },
        alt: { type: "text", label: "Name", required: true },
        url: { type: "url", label: "Link" },
      },
    },
  },
  Component({ heading, logos, field }) {
    return (
      <section class="block-logos">
        <Heading text={heading} field={field} />
        <ul>
          {logos.map(({ src, alt, url }) => {
            const image = src ? <img src={src} alt={alt} loading="lazy" /> : alt;
            return <li>{url && !field.editing ? <a href={url}>{image}</a> : image}</li>;
          })}
        </ul>
      </section>
    );
  },
});
