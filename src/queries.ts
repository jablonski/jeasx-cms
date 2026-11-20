/** Database queries of this site's own templates and blocks (server only). */
import type { FieldValues } from "@cms/universal/blocks";
import { queryAll } from "@cms/core/db";
import type config from "./cms.config";

interface NavLink {
  slug: string;
  title: string;
}

/** Published pages with the page field `inNav`, by `navOrder`. */
export const navigation = () =>
  queryAll<NavLink>(/* sql */ `SELECT slug, title, content ->> '$.navOrder' AS navOrder FROM pages
     WHERE status = 'published' AND content ->> '$.inNav' = 1 ORDER BY navOrder, title`);

/** Published pages with the page field `inFooter`. */
export const footerNavigation = () =>
  queryAll<NavLink>(/* sql */ `SELECT slug, title FROM pages
     WHERE status = 'published' AND content ->> '$.inFooter' = 1 ORDER BY title`);

/** The page fields of an article, as stored. */
type ArticleMeta = FieldValues<(typeof config)["pages"]["article"]["fields"]>;

/**
 * The latest published articles, newest first.
 * @param count as entered by editors: SQLite rejects a LIMIT that isn't a whole number
 */
export const latestArticles = (count: number): (NavLink & { meta: ArticleMeta })[] =>
  queryAll<NavLink & { meta: string }>(
    /* sql */ `SELECT slug, title, json_remove(content, '$.blocks') AS meta FROM pages
     WHERE type = 'article' AND status = 'published' ORDER BY content ->> '$.date' DESC, title LIMIT ?`,
    Math.min(Math.max(0, Math.trunc(count)), 15),
  ).map((row) => ({ ...row, meta: JSON.parse(row.meta) as ArticleMeta }));
