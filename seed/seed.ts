/**
 * Complete demo website for an empty database: home, product, pricing, about, resources,
 * blog with articles, FAQ, contact and legal pages, using every block type, plus a draft.
 *
 * A standalone script, run before starting the project: `npm run seed`
 * (bundled with esbuild, so it can import the site config and the core).
 * Does nothing if the database already contains pages.
 *
 * All files (images, avatars, logos, PDF, CSV, ZIP) are generated here, so the demo
 * needs neither network access nor binary files in the repository.
 */

import { configureCms } from "@cms/configure";
import { pageContent } from "@cms/content/page-validation";
import { open, transaction } from "@cms/core/db";
import { dbPath } from "@cms/core/storage";
import env from "jeasx/env.js";
import type { DatabaseSync } from "node:sqlite";
import config from "../src/cms.config";
import { seedFiles } from "./assets";
import { pages } from "./content";

function seed(db: DatabaseSync) {
  if (Number(db.prepare("SELECT COUNT(*) AS n FROM pages").get()!.n) > 0) {
    return false;
  }

  transaction(() => {
    const assets = seedFiles(db);
    const insert = db.prepare(
      "INSERT INTO pages (type, slug, title, status, content) VALUES (?, ?, ?, ?, ?)",
    );
    for (const page of pages(assets)) {
      // only some pages set a status (published by default); the rest are page fields
      const {
        type,
        slug,
        title,
        status = "published",
        blocks,
        ...fields
      }: Record<string, unknown> & typeof page = page;
      insert.run(type, slug, title, status as string, pageContent(fields, blocks));
    }
  }, db);
  return true;
}

env(); // storage locations from .env, like the server
configureCms(config);
const db = open();
console.log(seed(db) ? `Seeded ${dbPath()}` : `${dbPath()} already has pages, nothing to do`);
db.close();
