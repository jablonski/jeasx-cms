/** Database queries of this site's own templates and blocks (server only). */
import { queryAll } from "@cms/core/db";

interface NavLink {
  slug: string;
  title: string;
}

/** What an article list shows of an article. */
interface ArticleTeaser extends NavLink {
  description: string | null;
  image: string | null;
  author: string | null;
  date: string | null;
}

/** Published pages with the page field `inNav`, by `navOrder`. */
export const navigation = () =>
  queryAll<NavLink>(/* sql */ `SELECT slug, title, content ->> '$.navOrder' AS navOrder FROM pages
     WHERE status = 'published' AND content ->> '$.inNav' = 1 ORDER BY navOrder, title`);

/** Published pages with the page field `inFooter`. */
export const footerNavigation = () =>
  queryAll<NavLink>(/* sql */ `SELECT slug, title FROM pages
     WHERE status = 'published' AND content ->> '$.inFooter' = 1 ORDER BY title`);

/**
 * The latest published articles, newest first.
 * @param count as entered by editors: SQLite rejects a LIMIT that isn't a whole number
 */
export const latestArticles = (count: number) =>
  queryAll<ArticleTeaser>(
    /* sql */ `SELECT slug, title, content ->> '$.description' AS description,
       content ->> '$.image' AS image, content ->> '$.author' AS author,
       content ->> '$.date' AS date
     FROM pages WHERE type = 'article' AND status = 'published'
     ORDER BY date DESC, title LIMIT ?`,
    Math.min(Math.max(0, Math.trunc(count)), 15),
  );
