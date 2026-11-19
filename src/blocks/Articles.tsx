import { defineBlock } from "@cms/universal/blocks";
import { latestArticles } from "../queries";
import Heading from "./Heading";

export default defineBlock({
  type: "articles",
  label: "Latest articles",
  icon: "✎",
  description: "Published articles, newest first (updates automatically)",
  fields: {
    heading: { type: "text", label: "Heading" },
    limit: { type: "number", label: "Number of articles", default: 6 },
  },
  Component({ heading, limit, field }) {
    const articles = latestArticles(limit);
    return (
      <section class="block-articles">
        <Heading text={heading} field={field} />
        <ul>
          {articles.map(({ slug, title, meta }) => (
            <li>
              {meta.image && <img src={meta.image} alt="" loading="lazy" />}
              <div>
                {meta.date && <time datetime={meta.date}>{formatDate(meta.date)}</time>}
                <h3>
                  <a href={slug}>{title}</a>
                </h3>
                <p>{meta.description}</p>
                {meta.author && <small>By {meta.author}</small>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  },
});

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(date);
};
