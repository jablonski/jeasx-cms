import { defineBlock } from "@cms/universal/blocks";
import RichText from "@cms/universal/rich-text";
import Heading from "./Heading";

export default defineBlock({
  type: "accordion",
  label: "Accordion",
  icon: "☰",
  description: "Questions and answers that expand on click",
  fields: {
    heading: { type: "text", label: "Heading" },
    items: {
      type: "list",
      label: "Items",
      itemLabel: "question",
      fields: {
        question: { type: "text", label: "Question", required: true },
        answer: { type: "richtext", label: "Answer" },
      },
    },
  },
  Component({ heading, items, field }) {
    return (
      <section class="block-accordion">
        <Heading text={heading} field={field} />
        {items.map(({ question, answer }, i) => (
          // Open in the editor, so all answers can be edited in place.
          <details open={field.editing}>
            <summary>
              <span {...field(`items.${i}.question`)}>{question}</span>
            </summary>
            <RichText text={answer} {...field(`items.${i}.answer`)} />
          </details>
        ))}
      </section>
    );
  },
});
