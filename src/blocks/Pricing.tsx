import { defineBlock } from "@cms/content/blocks";
import Heading from "./Heading";
import OptionalText from "./OptionalText";

export default defineBlock({
  type: "pricing",
  label: "Pricing",
  icon: "€",
  description: "Comparison of plans with prices and features",
  fields: {
    heading: { type: "text", label: "Heading" },
    plans: {
      type: "list",
      label: "Plans",
      itemLabel: "name",
      fields: {
        name: { type: "text", label: "Name", required: true },
        price: { type: "text", label: "Price", required: true },
        period: { type: "text", label: "Period", help: "e.g. per month" },
        description: { type: "text", label: "Description" },
        features: { type: "textarea", label: "Features", help: "One feature per line" },
        buttonLabel: { type: "text", label: "Button label" },
        buttonUrl: { type: "url", label: "Button link" },
        highlighted: { type: "boolean", label: "Highlight this plan" },
      },
    },
  },
  Component({ heading, plans, field }) {
    return (
      <section class="block-pricing">
        <Heading text={heading} field={field} />
        <div class="plans">
          {plans.map((plan, i) => (
            <article class={plan.highlighted ? "plan highlighted" : "plan"}>
              <h3 {...field(`plans.${i}.name`)}>{plan.name}</h3>
              <p class="price">
                <strong {...field(`plans.${i}.price`)}>{plan.price}</strong>{" "}
                <span {...field(`plans.${i}.period`)}>{plan.period}</span>
              </p>
              <OptionalText
                as="p"
                value={plan.description}
                name={`plans.${i}.description`}
                field={field}
              />
              <ul>
                {plan.features
                  .split("\n")
                  .filter((line) => line.trim())
                  .map((line) => (
                    <li>{line}</li>
                  ))}
              </ul>
              {plan.buttonLabel && plan.buttonUrl && (
                <a class={plan.highlighted ? "button" : "button secondary"} href={plan.buttonUrl}>
                  {plan.buttonLabel}
                </a>
              )}
            </article>
          ))}
        </div>
      </section>
    );
  },
});
