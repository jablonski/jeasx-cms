import { defineBlock } from "@cms/content/blocks";

export default defineBlock({
  type: "quote",
  label: "Quote",
  icon: "❝",
  description: "Testimonial or quote with author",
  fields: {
    quote: { type: "textarea", label: "Quote", required: true },
    author: { type: "text", label: "Author" },
    role: { type: "text", label: "Role / Company" },
  },
  Component({ quote, author, role, field }) {
    return (
      <figure class="block-quote">
        <blockquote {...field("quote")}>{quote}</blockquote>
        {(author || role || field.editing) && (
          <figcaption>
            <strong {...field("author")}>{author}</strong>
            {(role || field.editing) && (
              <>
                {" · "}
                <span {...field("role")}>{role}</span>
              </>
            )}
          </figcaption>
        )}
      </figure>
    );
  },
});
