import { defineBlock } from "@cms/shared/blocks";
import RichText from "@cms/shared/rich-text";
import Heading from "./Heading";
import OptionalText from "./OptionalText";

export default defineBlock({
  type: "timeline",
  label: "Timeline",
  icon: "⋮",
  description: "Milestones or process steps in order",
  fields: {
    heading: { type: "text", label: "Heading" },
    items: {
      type: "list",
      label: "Steps",
      itemLabel: "title",
      fields: {
        date: { type: "text", label: "Date or step" },
        title: { type: "text", label: "Title", required: true },
        text: { type: "richtext", label: "Text" },
      },
    },
  },
  Component({ heading, items, field }) {
    return (
      <section class="block-timeline">
        <Heading text={heading} field={field} />
        <ol>
          {items.map(({ date, title, text }, i) => (
            <li>
              <OptionalText
                as="span"
                class="date"
                value={date}
                name={`items.${i}.date`}
                field={field}
              />
              <h3 {...field(`items.${i}.title`)}>{title}</h3>
              <RichText text={text} {...field(`items.${i}.text`)} />
            </li>
          ))}
        </ol>
      </section>
    );
  },
});
