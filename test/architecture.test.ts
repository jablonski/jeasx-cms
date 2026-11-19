/** Keeps the layers of the core apart; README.md ("Architecture") explains the rules. */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const CORE = "src/@cms";

/** The layers each layer may use at runtime (imports of types are always fine). */
const ALLOWED_LAYERS: Record<string, string[]> = {
  core: ["core"],
  content: ["content", "core"],
  auth: ["auth", "core"],
  media: ["media", "core"],
  render: ["render", "content", "core"],
  browser: ["browser"],
};

/** Modules free of Node.js code, which the admin's browser code may use. */
const BROWSER_SAFE = new Set([
  "auth/limits",
  "content/block-data",
  "content/block-tree",
  "content/blocks",
  "content/fields",
  "content/slug",
  "core/shared",
  "core/text",
  "media/file-url",
]);

const sources = readdirSync(CORE, { recursive: true, encoding: "utf8" })
  .filter((file) => /\.tsx?$/.test(file) && !file.endsWith(".d.ts"))
  .map((file) => ({ file, code: readFileSync(join(CORE, file), "utf8") }));

/** What a module imports at runtime: `import type` and `{ type A }` don't count. */
function runtimeImports(code: string): string[] {
  const imports = code.matchAll(/^(?:import|export)\s+(type\s+)?([^;"]*?)\s*from\s+"([^"]+)"/gm);
  return [...imports]
    .filter(([, typeOnly, names]) => !typeOnly && !/^\{(\s*type\s+\w+\s*,?)+\}$/.test(names))
    .map(([, , , specifier]) => specifier);
}

const moduleName = (file: string) => file.replace(/\.tsx?$/, "");
const coreModule = (specifier: string) => specifier.replace(/^@cms\//, "");

test("the core only imports the core, never site code", () => {
  const relative = sources.flatMap(({ file, code }) =>
    runtimeImports(code)
      .filter((specifier) => specifier.startsWith("."))
      .map((specifier) => `${file} imports ${specifier}`),
  );
  assert.deepEqual(relative, []);
});

test("layers only depend on the layers below them", () => {
  const violations = sources.flatMap(({ file, code }) => {
    const layer = file.split("/")[0];
    const allowed = ALLOWED_LAYERS[layer];
    if (!allowed) {
      return []; // routes and configure.ts may use every layer
    }
    return runtimeImports(code)
      .filter((specifier) => specifier.startsWith("@cms/"))
      .map(coreModule)
      .filter((target) => !allowed.includes(target.split("/")[0]) && !isBrowserSafe(layer, target))
      .map((target) => `${file} imports ${target}`);
  });
  assert.deepEqual(violations, []);
});

const isBrowserSafe = (layer: string, target: string) =>
  layer === "browser" && BROWSER_SAFE.has(target);

test("server code never imports browser code at runtime", () => {
  const violations = sources
    .filter(({ file }) => file.split("/")[0] !== "browser")
    .flatMap(({ file, code }) =>
      runtimeImports(code)
        .filter((specifier) => specifier.startsWith("@cms/browser/"))
        .map((specifier) => `${file} imports ${specifier}`),
    );
  assert.deepEqual(violations, []);
});

test("state of server modules is shared between the route bundles", () => {
  const violations = sources
    .filter(({ file }) => file.split("/")[0] !== "browser")
    .filter(({ code }) =>
      /^(?:export\s+)?(?:let\s|const\s+\w+[^=\n]*=\s*new (?:Weak)?Map\b)/m.test(code),
    )
    .map(({ file }) => `${file} keeps state per route bundle: use shared() from core/shared`);
  assert.deepEqual(violations, []);
});

test("browser-safe modules stay free of server code", () => {
  const violations = sources
    .filter(({ file }) => BROWSER_SAFE.has(moduleName(file)))
    .flatMap(({ file, code }) =>
      runtimeImports(code)
        .filter((specifier) => !BROWSER_SAFE.has(coreModule(specifier)))
        .map((specifier) => `${file} imports ${specifier}`),
    );
  assert.deepEqual(violations, []);
});
