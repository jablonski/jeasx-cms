import { defineBlock } from "@cms/universal/blocks";
import Heading from "./Heading";

export default defineBlock({
  type: "stats",
  label: "Key figures",
  icon: "#",
  description: "Large numbers with a short label",
  fields: {
    heading: { type: "text", label: "Heading" },
    items: {
      type: "list",
      label: "Figures",
      itemLabel: "label",
      fields: {
        value: { type: "text", label: "Value", required: true },
        label: { type: "text", label: "Label", required: true },
      },
    },
  },
  Component({ heading, items, field }) {
    return (
      <section class="block-stats">
        <Heading text={heading} field={field} />
        <dl>
          {items.map(({ value, label }, i) => (
            <div>
              <dd {...field(`items.${i}.value`)}>{value}</dd>
              <dt {...field(`items.${i}.label`)}>{label}</dt>
            </div>
          ))}
        </dl>
      </section>
    );
  },
});
