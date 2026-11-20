/**
 * Startup validation of the site's configuration (pure functions).
 * Problems are collected and reported together, so a broken block or page
 * type fails fast with a clear message instead of misbehaving in the editor.
 */

import { FIELD_TYPES as TYPES } from "@cms/universal/fields";

// biome-ignore lint/suspicious/noExplicitAny: this file exists to inspect values of unknown shape
type Unchecked = any;

const FIELD_TYPES = new Set<string>(TYPES);
const NAME = /^[a-z][a-zA-Z0-9_-]*$/;

/** What checking a set of fields needs to know. */
interface FieldCheck {
  /** all block types of the site */
  blockTypes: Set<string>;
  /** false for page fields: only blocks can hold nested blocks */
  allowBlocks: boolean;
  /** collects the problems */
  errors: string[];
}

function checkFields(fields: unknown, where: string, check: FieldCheck) {
  if (!fields || typeof fields !== "object") {
    check.errors.push(`${where}: "fields" must be an object`);
    return;
  }
  for (const [name, field] of Object.entries(fields as Record<string, Unchecked>)) {
    checkField(name, field, `${where} › field "${name}"`, check);
  }
}

function checkField(name: string, field: Unchecked, at: string, check: FieldCheck) {
  const { errors } = check;
  if (!NAME.test(name)) {
    errors.push(`${at}: invalid name (letters, digits, - and _, starting with a lowercase letter)`);
  }
  if (!field || typeof field !== "object") {
    errors.push(`${at}: must be an object`);
    return;
  }
  if (!FIELD_TYPES.has(field.type)) {
    errors.push(`${at}: unknown type "${field.type}" (allowed: ${[...FIELD_TYPES].join(", ")})`);
    return;
  }
  if (typeof field.label !== "string" || !field.label) {
    errors.push(`${at}: "label" is required`);
  }
  if (field.type === "select") {
    checkSelect(field, at, errors);
  }
  if (field.type === "list") {
    checkList(field, at, check);
  }
  if (field.type === "blocks") {
    checkNestedBlocks(field, at, check);
  }
}

function checkSelect(field: Unchecked, at: string, errors: string[]) {
  const valid =
    Array.isArray(field.options) &&
    field.options.length > 0 &&
    field.options.every((o: Unchecked) => typeof o?.value === "string");
  if (!valid) {
    errors.push(`${at}: select needs "options" like [{ value: "a", label: "A" }]`);
  } else if (
    field.default !== undefined &&
    !field.options.some((o: Unchecked) => o.value === field.default)
  ) {
    errors.push(`${at}: default "${field.default}" is not one of the options`);
  }
}

function checkList(field: Unchecked, at: string, check: FieldCheck) {
  checkFields(field.fields, at, check);
  if (field.itemLabel !== undefined && !field.fields?.[field.itemLabel]) {
    check.errors.push(`${at}: itemLabel "${field.itemLabel}" is not one of its fields`);
  }
}

function checkNestedBlocks(
  field: Unchecked,
  at: string,
  { blockTypes, allowBlocks, errors }: FieldCheck,
) {
  if (!allowBlocks) {
    errors.push(`${at}: "blocks" fields aren't supported in page fields`);
  }
  if (!Array.isArray(field.blocks) || field.blocks.length === 0) {
    errors.push(`${at}: "blocks" must list the allowed block types`);
  }
  for (const type of field.blocks ?? []) {
    if (!blockTypes.has(type)) {
      errors.push(`${at}: allows unknown block type "${type}"`);
    }
  }
}

/** Checks what identifies a block; valid types are added to `types`. */
function checkBlockDefinition(
  block: Unchecked,
  where: string,
  types: Set<string>,
  errors: string[],
) {
  if (!block || typeof block !== "object") {
    errors.push(`${where}: must be an object (did you forget to export it as default?)`);
    return;
  }
  if (typeof block.type !== "string" || !NAME.test(block.type)) {
    errors.push(`${where}: "type" must be a short identifier like "hero"`);
  } else if (types.has(block.type)) {
    errors.push(`${where}: type "${block.type}" is used by more than one block`);
  } else {
    types.add(block.type);
  }
  if (typeof block.label !== "string" || !block.label) {
    errors.push(`${where}: "label" is required`);
  }
  if (typeof block.Component !== "function") {
    errors.push(`${where}: "Component" must be a function`);
  }
}

/** Properties of a page that page fields can't be named like. */
const RESERVED_PAGE_FIELDS = [
  "id",
  "type",
  "slug",
  "title",
  "status",
  "blocks",
  "version",
  "updatedAt",
  "baseVersion",
];

function checkPageType(name: string, pageType: Unchecked, types: Set<string>, errors: string[]) {
  const where = `Page type "${name}"`;
  if (!NAME.test(name)) {
    errors.push(`${where}: invalid name`);
  }
  if (typeof pageType?.label !== "string" || !pageType.label) {
    errors.push(`${where}: "label" is required`);
  }
  checkFields(pageType?.fields ?? {}, where, { blockTypes: types, allowBlocks: false, errors });
  // page fields sit beside the page's own properties (page.description, page.blocks)
  for (const name of Object.keys(pageType?.fields ?? {})) {
    if (RESERVED_PAGE_FIELDS.includes(name)) {
      errors.push(`${where}: the field name "${name}" is reserved for the page itself`);
    }
  }
  if (!Array.isArray(pageType?.blocks) || !pageType.blocks.length) {
    errors.push(`${where}: "blocks" must list the allowed block types`);
  }
  for (const type of pageType?.blocks ?? []) {
    if (!types.has(type)) {
      errors.push(`${where}: allows unknown block type "${type}"`);
    }
  }
  for (const type of pageType?.initialBlocks ?? []) {
    if (!pageType.blocks?.includes(type)) {
      errors.push(`${where}: initial block "${type}" is not in its allowed blocks`);
    }
  }
}

/** Checks the site's blocks and page types. Returns the problems (empty if valid). */
export function validateBlocks(blocks: unknown, pages: unknown): string[] {
  if (!Array.isArray(blocks)) {
    return ['"blocks" must be an array of block definitions'];
  }
  const errors: string[] = [];

  // All types are collected first: fields may allow blocks defined further down.
  const types = new Set<string>();
  for (const [i, block] of blocks.entries()) {
    const where = `Block #${i + 1}${block?.type ? ` "${block.type}"` : ""}`;
    checkBlockDefinition(block, where, types, errors);
  }
  for (const [i, block] of blocks.entries()) {
    if (!block || typeof block !== "object") {
      continue;
    }
    const check = { blockTypes: types, allowBlocks: true, errors };
    checkFields(block.fields, `Block #${i + 1} "${block.type}"`, check);
  }

  if (!pages || typeof pages !== "object" || !Object.keys(pages).length) {
    errors.push('"pages" must define at least one page type');
    return errors;
  }
  for (const [name, pageType] of Object.entries(pages)) {
    checkPageType(name, pageType, types, errors);
  }
  return errors;
}

/** Checks the site's server configuration (handed to configureCms). Returns the problems. */
export function validateSite(config: unknown): string[] {
  const errors: string[] = [];
  const site = config as Unchecked;
  if (!site || typeof site !== "object") {
    return ["the configuration must be an object"];
  }
  if (
    !Array.isArray(site.stylesheets) ||
    !site.stylesheets.every((s: unknown) => typeof s === "string" && s.startsWith("/"))
  ) {
    errors.push('"stylesheets" must be a list of URLs starting with "/"');
  }
  if (typeof site.files !== "string" || !/^(\/[\w.~-]+)+$/.test(site.files)) {
    errors.push('"files" must be a path like "/files" (no trailing slash)');
  }
  if (
    site.blockClass !== undefined &&
    typeof site.blockClass !== "string" &&
    typeof site.blockClass !== "function"
  ) {
    errors.push('"blockClass" must be a class name or a function returning one');
  }
  if (
    site.reservedPaths !== undefined &&
    !(
      Array.isArray(site.reservedPaths) &&
      site.reservedPaths.every((path: unknown) => typeof path === "string" && path.startsWith("/"))
    )
  ) {
    errors.push('"reservedPaths" must be a list of paths starting with "/"');
  }
  return errors;
}

/** Throws one error listing all problems. */
export function assertValid(errors: string[]): void {
  if (errors.length) {
    throw new Error(`Invalid site configuration:\n  - ${errors.join("\n  - ")}`);
  }
}
