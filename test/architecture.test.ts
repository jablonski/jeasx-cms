/** Keeps the layers of the core apart; README.md ("Architecture") explains the rules. */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const CORE = "src/@cms";

/**
 * The layers each layer may use at runtime (imports of types are always fine).
 * `universal` holds everything used by both server and browser code: only from there may
 * browser code take runtime code, and it depends on nothing but itself.
 */
const ALLOWED_LAYERS: Record<string, string[]> = {
  core: ["core", "universal"],
  content: ["content", "core", "universal"],
  auth: ["auth", "core", "universal"],
  media: ["media", "core", "universal"],
  render: ["render", "content", "core", "universal"],
  browser: ["browser", "universal"],
  universal: ["universal"],
};

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
      .filter((target) => !allowed.includes(target.split("/")[0]))
      .map((target) => `${file} imports ${target}`);
  });
  assert.deepEqual(violations, []);
});

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
    .map(({ file }) => `${file} keeps state per route bundle: use shared() from universal/global`);
  assert.deepEqual(violations, []);
});

test("universal modules use neither Node.js nor packages", () => {
  const violations = sources
    .filter(({ file }) => file.split("/")[0] === "universal")
    .flatMap(({ file, code }) =>
      runtimeImports(code)
        .filter((specifier) => !specifier.startsWith("@cms/universal/"))
        .map((specifier) => `${file} imports ${specifier}`),
    );
  assert.deepEqual(violations, []);
});
