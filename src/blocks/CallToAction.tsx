import { defineBlock } from "@cms/universal/blocks";
import OptionalText from "./OptionalText";

export default defineBlock({
  type: "cta",
  label: "Call to action",
  icon: "➜",
  description: "Highlighted panel with buttons",
  fields: {
    heading: { type: "text", label: "Heading", required: true, default: "Ready to start?" },
    text: { type: "textarea", label: "Text" },
    buttons: {
      type: "list",
      label: "Buttons",
      itemLabel: "label",
      fields: {
        label: { type: "text", label: "Label", required: true },
        url: { type: "url", label: "Link", required: true },
        primary: { type: "boolean", label: "Primary", default: true },
      },
    },
  },
  Component({ heading, text, buttons, field }) {
    return (
      <section class="block-cta">
        <h2 {...field("heading")}>{heading}</h2>
        <OptionalText as="p" value={text} name="text" field={field} />
        <p class="buttons">
          {buttons.map(({ label, url, primary }, i) => (
            <a
              class={primary ? "button" : "button secondary"}
              href={url}
              {...field(`buttons.${i}.label`)}
            >
              {label}
            </a>
          ))}
        </p>
      </section>
    );
  },
});
