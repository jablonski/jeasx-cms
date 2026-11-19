/**
 * The composition root of the core: connects the site's configuration to the block registry.
 * The site calls it in src/[...guard].ts; the core never imports site code.
 */
import { registerBlocks } from "@cms/content/blocks";
import { assertValid, validateBlocks, validateSite } from "@cms/content/config-validation";
import { SITE, type SiteConfig } from "@cms/core/site";

/**
 * Applies the site's configuration including its blocks and page types (validated;
 * throws listing all problems). Call it once before using the core, also in scripts
 * (see seed/seed.ts).
 */
export function configureCms(config: SiteConfig): void {
  assertValid(validateSite(config));
  assertValid(validateBlocks(config.blocks, config.pages));
  registerBlocks(config);
  Object.assign(SITE, config);
}
