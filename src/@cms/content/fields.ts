/**
 * Field definitions are shared by server (validation on save) and browser (admin editor).
 * Keep this file free of Node.js imports.
 */

export const FIELD_TYPES = [
  "text",
  "textarea",
  "richtext",
  "url",
  "image",
  "file",
  "number",
  "date",
  "boolean",
  "select",
  "list",
  "blocks",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

interface BaseField {
  label: string;
  required?: boolean;
  default?: unknown;
  help?: string;
}

/** A field holding a single value, without further settings. */
export interface ValueField extends BaseField {
  type: Exclude<FieldType, "select" | "list" | "blocks">;
}

export interface SelectField extends BaseField {
  type: "select";
  options: readonly { readonly value: string; readonly label: string }[];
}

export interface ListField extends BaseField {
  type: "list";
  /** fields of each item */
  fields: Fields;
  /** item field used as label in the editor */
  itemLabel?: string;
}

/** Nested blocks. */
export interface BlocksField extends BaseField {
  type: "blocks";
  /** allowed block types */
  blocks: readonly string[];
}

export type Field = ValueField | SelectField | ListField | BlocksField;

export type Fields = Record<string, Field>;

export interface ValidationError {
  /** readable message incl. where it happened */
  message: string;
  /** data path of the field, e.g. "blocks.0.data.items.1.title" */
  path?: string;
}

/** Validator for "blocks" fields (injected by block-data.ts to avoid a circular import). */
export type NestedValidator = (
  blocks: unknown,
  allowed: readonly string[],
  prefix: string,
  at: string,
) => { value: unknown[]; errors: ValidationError[] };

function defaultValue(field: Field): unknown {
  if (field.default !== undefined) {
    return structuredClone(field.default);
  }
  switch (field.type) {
    case "number":
      return 0;
    case "boolean":
      return false;
    case "select":
      return field.options[0]?.value ?? "";
    case "list":
    case "blocks":
      return [];
    default:
      return "";
  }
}

export function defaults(fields: Fields): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([name, f]) => [name, defaultValue(f)]));
}

export interface SanitizeOptions {
  /** readable location for messages */
  prefix?: string;
  /** validator for "blocks" fields */
  nested?: NestedValidator;
  /** data path of the data, e.g. "meta" or "blocks.0.data" */
  at?: string;
}

/**
 * Coerces untrusted data into the shape described by `fields`.
 * Unknown keys are dropped. Returns a list of validation errors.
 */
export function sanitize(
  fields: Fields,
  data: unknown,
  { prefix = "", nested, at = "" }: SanitizeOptions = {},
): { value: Record<string, unknown>; errors: ValidationError[] } {
  const value: Record<string, unknown> = {};
  const errors: ValidationError[] = [];
  const input = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;

  for (const [name, field] of Object.entries(fields)) {
    // Data stored before the field existed gets its default.
    const raw = input[name] === undefined ? field.default : input[name];
    const where: FieldLocation = {
      label: prefix + (field.label || name),
      path: at ? `${at}.${name}` : name,
      nested,
      errors,
    };
    value[name] = sanitizeValue(field, raw, where);
    if (field.required && isEmpty(value[name])) {
      errors.push({ message: `${where.label} is required`, path: where.path });
    }
  }
  return { value, errors };
}

/** Where a value is being sanitized, and where its problems are collected. */
interface FieldLocation {
  label: string;
  path: string;
  nested?: NestedValidator;
  errors: ValidationError[];
}

const isEmpty = (value: unknown) =>
  (typeof value === "string" && value.trim() === "") ||
  (Array.isArray(value) && value.length === 0);

function sanitizeValue(field: Field, raw: unknown, where: FieldLocation): unknown {
  const { label, path, nested, errors } = where;
  switch (field.type) {
    case "number": {
      const number = Number(raw);
      return Number.isFinite(number) ? number : defaultValue(field);
    }
    case "boolean":
      return raw === true || raw === "true" || raw === "on";
    case "select":
      return field.options.some((o) => o.value === raw) ? raw : defaultValue(field);
    case "list":
      return (Array.isArray(raw) ? raw : []).map((item, i) => {
        const options = { prefix: `${label} #${i + 1} › `, nested, at: `${path}.${i}` };
        const result = sanitize(field.fields, item, options);
        errors.push(...result.errors);
        return result.value;
      });
    case "blocks": {
      if (!nested) {
        return [];
      }
      const result = nested(raw, field.blocks, `${label} › `, path);
      errors.push(...result.errors);
      return result.value;
    }
    case "date": {
      const date = typeof raw === "string" ? raw.trim() : "";
      if (date && !isDate(date)) {
        errors.push({ message: `${label}: invalid date (YYYY-MM-DD)`, path });
      }
      return date;
    }
    case "url":
    case "image":
    case "file": {
      const url = typeof raw === "string" ? raw.trim() : "";
      if (!url || isSafeUrl(url)) {
        return url;
      }
      errors.push({ message: `${label}: invalid URL`, path });
      return "";
    }
    default:
      return String(raw ?? "");
  }
}

/** A calendar date as stored by "date" fields: YYYY-MM-DD, and a day that exists. */
export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** Allows relative, http(s) and mailto URLs only (no javascript: etc). */
export function isSafeUrl(url: string): boolean {
  const trimmed = url.replace(/[\s\p{Cc}]/gu, "");
  return /^(https?|mailto):/i.test(trimmed) || !/^[a-z][a-z0-9+.-]*:/i.test(trimmed);
}
