/** The site's configuration as the core sees it (server only); filled by `configureCms()`. */
import type { Block, BlockDefinition, PageType } from "@cms/universal/blocks";
import { shared } from "@cms/universal/global";

export interface SiteConfig {
  /** stylesheets of the site, shown in the editor canvas (URLs starting with "/") */
  stylesheets: string[];
  /** public path of the route serving uploaded files, e.g. "/files" (saved in page content) */
  files: string;
  /**
   * class of the element wrapping each rendered block, on the site and in the editor
   * canvas: a string or a function of the block (default "cms-block")
   */
  blockClass?: string | ((block: Block) => string);
  /** the site's blocks (order = block picker) */
  blocks: BlockDefinition[];
  /** page types with their fields and allowed blocks */
  pages: Record<string, PageType>;
}

/** The configured class of a block's wrapper element. */
export function blockClass(block: Block): string {
  const c = SITE.blockClass ?? "cms-block";
  return typeof c === "function" ? c(block) : c;
}

/** The configured site, shared by all route bundles. */
export const SITE = shared("__cmsSite", () => ({}) as SiteConfig);
