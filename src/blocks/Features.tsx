import { defineBlock } from "@cms/shared/blocks";
import RichText from "@cms/shared/rich-text";
import Heading from "./Heading";
import OptionalText from "./OptionalText";

export default defineBlock({
  type: "features",
  label: "Features",
  icon: "▦",
  description: "Grid of cards with icon, title and text",
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
    items: {
      type: "list",
      label: "Items",
      itemLabel: "title",
      fields: {
        icon: { type: "text", label: "Icon (emoji)" },
        title: { type: "text", label: "Title", required: true },
        text: { type: "richtext", label: "Text" },
        url: { type: "url", label: "Link" },
      },
    },
  },
  Component({ heading, columns, items, field }) {
    return (
      <section class="block-features">
        <Heading text={heading} field={field} />
        <ul class="grid" style={`--columns: ${columns}`}>
          {items.map(({ icon, title, text, url }, i) => (
            <li class="card">
              <OptionalText
                as="span"
                class="icon"
                value={icon}
                name={`items.${i}.icon`}
                field={field}
              />
              <h3>
                {url && !field.editing ? (
                  <a href={url}>{title}</a>
                ) : (
                  <span {...field(`items.${i}.title`)}>{title}</span>
                )}
              </h3>
              <RichText text={text} {...field(`items.${i}.text`)} />
            </li>
          ))}
        </ul>
      </section>
    );
  },
});
