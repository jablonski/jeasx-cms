/** The site's configuration as the core sees it (server only); filled by `configureCms()`. */
import type { BlockDefinition, PageType } from "@cms/shared/blocks";
import { shared } from "@cms/shared/global";

export interface SiteConfig {
  /** stylesheets of the site, shown in the editor canvas (URLs starting with "/") */
  stylesheets: string[];
  /** public path of the route serving uploaded files, e.g. "/files" (saved in page content) */
  files: string;
  /** the site's blocks (order = block picker) */
  blocks: BlockDefinition[];
  /** page types with their fields and allowed blocks */
  pages: Record<string, PageType>;
}

/** The configured site, shared by all route bundles. */
export const SITE = shared("__cmsSite", () => ({}) as SiteConfig);
