/** Generates the demo files and stores them like uploads. */

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { filesDir } from "@cms/core/storage";
import { fileUrl } from "@cms/shared/file-url";
import config from "../src/cms.config";
import { type GradientOptions, gradientPng, pdf, zip } from "./formats";

export type SeedAssets = ReturnType<typeof seedFiles>;

/** Generates the demo files, stores them like uploads and returns their URLs by name. */
export function seedFiles(db: DatabaseSync) {
  const folder = (name: string, parent: number | null = null) =>
    Number(
      db.prepare("INSERT INTO folders (name, parent_id) VALUES (?, ?)").run(name, parent)
        .lastInsertRowid,
    );
  const backgrounds = folder("Backgrounds");
  const illustrations = folder("Illustrations");
  const nature = folder("Nature", illustrations);
  const team = folder("Team");
  const brands = folder("Logos");
  const documents = folder("Documents");

  mkdirSync(filesDir(), { recursive: true });
  const insert = db.prepare(
    "INSERT OR IGNORE INTO files (filename, name, mime, size, folder_id) VALUES (?, ?, ?, ?, ?)",
  );
  /** Stores a file and returns its public URL. */
  const store = (name: string, mime: string, content: string | Buffer, folderId: number) => {
    const buffer = Buffer.from(content);
    const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    const filename = `${hash}.${name.split(".").pop()}`;
    writeFileSync(join(filesDir(), filename), buffer);
    insert.run(filename, name, mime, buffer.length, folderId);
    return fileUrl(config.files, filename, name);
  };

  const images: Record<string, [number, GradientOptions]> = {
    aurora: [
      backgrounds,
      { colors: ["#1e1b4b", "#4338ca", "#22d3ee"], glow: [0.75, 0.25], waves: 3 },
    ],
    ocean: [
      backgrounds,
      { colors: ["#082f49", "#0369a1", "#67e8f9"], glow: [0.5, 0.15], waves: 5 },
    ],
    sunset: [nature, { colors: ["#7c2d12", "#f97316", "#fde68a"], glow: [0.3, 0.7], waves: 2 }],
    forest: [nature, { colors: ["#052e16", "#15803d", "#bef264"], glow: [0.2, 0.3], waves: 4 }],
    studio: [
      illustrations,
      { colors: ["#2e1065", "#7c3aed", "#f0abfc"], glow: [0.65, 0.55], waves: 0 },
    ],
    team: [
      illustrations,
      { colors: ["#450a0a", "#e11d48", "#fdba74"], glow: [0.85, 0.8], waves: 2 },
    ],
  };
  const img = Object.fromEntries(
    Object.entries(images).map(([name, [folderId, options]]) => [
      name,
      store(`${name}.png`, "image/png", gradientPng(1280, 720, options), folderId),
    ]),
  );

  const avatar = (name: string, initials: string, from: string, to: string) => [
    name,
    store(
      `${name}.svg`,
      "image/svg+xml",
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="240" height="240" fill="url(#g)"/><text x="120" y="146" fill="#fff" font-family="system-ui,sans-serif" font-size="84" font-weight="600" text-anchor="middle">${initials}</text></svg>`,
      team,
    ),
  ];
  const people = Object.fromEntries([
    avatar("sam", "SL", "#4338ca", "#22d3ee"),
    avatar("jordan", "JK", "#7c3aed", "#f0abfc"),
    avatar("maya", "MO", "#15803d", "#bef264"),
    avatar("leo", "LM", "#c2410c", "#fde68a"),
  ]);

  const logo = (name: string, label: string, width: number) => [
    name,
    store(
      `${name}.svg`,
      "image/svg+xml",
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 40"><circle cx="18" cy="20" r="12" fill="#8b8b98"/><text x="40" y="29" fill="#8b8b98" font-family="system-ui,sans-serif" font-size="26" font-weight="700">${label}</text></svg>`,
      brands,
    ),
  ];
  const logos = Object.fromEntries([
    logo("northwind", "Northwind", 180),
    logo("fieldnote", "Fieldnote", 170),
    logo("harbor", "Harbor &amp; Co", 200),
    logo("lumen", "Lumen Labs", 190),
    logo("orbit", "Orbit Works", 200),
  ]);

  const blockRows = config.blocks.map((b) => `"${b.label}","${b.type}","${b.description ?? ""}"`);
  const docs = {
    guide: store(
      "getting-started-guide.pdf",
      "application/pdf",
      pdf("Getting started guide", [
        "1. Open the admin and choose a page.",
        "2. Click any text on the page to change it.",
        "3. Use the + button to add a new block.",
        "4. Drag blocks by their handle to arrange them.",
        "5. Save your work and publish the page.",
      ]),
      documents,
    ),
    sheet: store(
      "product-sheet.pdf",
      "application/pdf",
      pdf("Jeasx CMS product sheet", [
        "Visual editing directly on the page.",
        `${config.blocks.length} content blocks, ready to use.`,
        "File library with folders for all kinds of files.",
        "Page history with preview and restore.",
        "Server-rendered pages from a single SQLite file.",
      ]),
      documents,
    ),
    blocks: store(
      "block-overview.csv",
      "text/csv",
      `Label,Type,Description\n${blockRows.join("\n")}\n`,
      documents,
    ),
    notes: store(
      "release-notes.txt",
      "text/plain",
      "Release notes\n\n- New content blocks for complete websites\n- File library for all file types\n- Page history with preview\n",
      documents,
    ),
    press: store(
      "press-kit.zip",
      "application/zip",
      zip({
        "README.txt":
          "Jeasx CMS press kit\n\nJeasx CMS is a small, fast, block-based content management system.\n",
        "logo.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#4f46e5"/></svg>`,
      }),
      documents,
    ),
  };
  return { img, people, logos, docs };
}
