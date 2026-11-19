/** Configures the core with a small site and an in-memory database for the tests. */

import { configureCms } from "@cms/configure";
import type { BlockDefinition } from "@cms/universal/blocks";
import { open } from "@cms/core/db";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Uploads of the tests never reach the project's data folder.
const filesDir = mkdtempSync(join(tmpdir(), "cms-test-"));
process.env.CMS_FILES = filesDir;
process.on("exit", () => rmSync(filesDir, { recursive: true, force: true }));

const text: BlockDefinition = {
  type: "text",
  label: "Text",
  fields: {
    heading: { type: "text", label: "Heading", required: true },
    link: { type: "url", label: "Link" },
  },
  Component: () => null,
};

const section: BlockDefinition = {
  type: "section",
  label: "Section",
  fields: { blocks: { type: "blocks", label: "Content", blocks: ["text"] } },
  Component: () => null,
};

configureCms({
  stylesheets: ["/site.css"],
  files: "/files",
  blocks: [text, section],
  pages: {
    page: {
      label: "Page",
      fields: { description: { type: "textarea", label: "Description" } },
      blocks: ["text", "section"],
    },
  },
});

globalThis.__cmsDb = open(":memory:");
