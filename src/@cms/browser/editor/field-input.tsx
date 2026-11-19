import type { Field, ListField } from "@cms/shared/fields";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "@cms/shared/icons";
import { plural } from "@cms/shared/text";
import RichText from "@cms/shared/rich-text";

/** A field being edited: `path` points into the page state, e.g. "blocks.0.data.heading". */
interface FieldProps<F extends Field = Field> {
  path: string;
  field: F;
  value: unknown;
}

/** Renders an editor control for a field definition (see src/@cms/shared/fields.ts). */
export default function FieldInput({ path, field, value }: FieldProps) {
  switch (field.type) {
    case "boolean":
      return (
        <label class="field checkbox">
          <input type="checkbox" name={path} data-kind="boolean" checked={!!value} />
          {field.label}
        </label>
      );
    case "blocks":
      return <NestedBlocksHint label={field.label} value={value} />;
    case "list":
      return <ListInput path={path} field={field} value={value} />;
    default:
      return <LabelledInput path={path} field={field} value={value} />;
  }
}

/** Nested blocks are edited directly on the page. */
function NestedBlocksHint({ label, value }: { label: string; value: unknown }) {
  const count = Array.isArray(value) ? value.length : 0;
  return (
    <div class="field">
      <span class="field-label">{label}</span>
      <p class="hint">{plural(count, "block")} · edit this content directly on the page.</p>
    </div>
  );
}

function ListInput({ path, field, value }: FieldProps<ListField>) {
  const items: Record<string, unknown>[] = Array.isArray(value) ? value : [];
  return (
    <fieldset class="field list">
      <legend>{field.label}</legend>
      {items.map((item, i) => (
        <div class="list-item">
          <div class="list-item-header">
            <strong>{(field.itemLabel && item[field.itemLabel]) || `#${i + 1}`}</strong>
            <ListItemTools path={path} index={i} count={items.length} />
          </div>
          {Object.entries(field.fields).map(([name, itemField]) => (
            <FieldInput path={`${path}.${i}.${name}`} field={itemField} value={item[name]} />
          ))}
        </div>
      ))}
      <button type="button" class="add-item" data-action="add-item" data-path={path}>
        + Add item
      </button>
    </fieldset>
  );
}

function ListItemTools({ path, index, count }: { path: string; index: number; count: number }) {
  const at = { "data-path": path, "data-index": index };
  return (
    <span class="tools">
      <button
        type="button"
        data-action="move-item"
        {...at}
        data-dir="-1"
        disabled={index === 0}
        title="Move up"
      >
        <ChevronUpIcon />
      </button>
      <button
        type="button"
        data-action="move-item"
        {...at}
        data-dir="1"
        disabled={index === count - 1}
        title="Move down"
      >
        <ChevronDownIcon />
      </button>
      <button type="button" data-action="remove-item" {...at} title="Remove">
        <XIcon />
      </button>
    </span>
  );
}

function LabelledInput({ path, field, value }: FieldProps) {
  const id = `f-${path.replaceAll(".", "-")}`;
  return (
    <div class="field">
      <label for={id} id={`${id}-label`}>
        {field.label}
        {field.required && <span class="required"> *</span>}
      </label>
      <Control id={id} path={path} field={field} value={String(value ?? "")} />
      {field.help && <small class="help">{field.help}</small>}
    </div>
  );
}

function Control({
  id,
  path,
  field,
  value,
}: {
  id: string;
  path: string;
  field: Field;
  value: string;
}) {
  switch (field.type) {
    case "textarea":
      return (
        <textarea id={id} name={path} rows={5}>
          {value}
        </textarea>
      );
    case "richtext":
      // formatted like on the page; edited with the formatting toolbar (rich-text-editing.ts)
      return (
        <div
          id={id}
          class="richtext-input"
          contenteditable="true"
          role="textbox"
          aria-multiline="true"
          aria-labelledby={`${id}-label`}
          data-richtext={path}
          data-placeholder={field.label}
        >
          <RichText text={value} />
        </div>
      );
    case "number":
      return <input id={id} type="number" name={path} data-kind="number" value={value} />;
    case "date":
      return <input id={id} type="date" name={path} value={value} />;
    case "select":
      return (
        <select id={id} name={path}>
          {field.options.map((option) => (
            <option value={option.value} selected={option.value === value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "image":
      return (
        <div class="image-input" data-drop-path={path} title="Drop an image here to upload">
          <img class="thumb" src={value || undefined} alt="" hidden={!value} />
          <FileUrlInput id={id} path={path} value={value} kind="image" />
        </div>
      );
    case "file":
      return (
        <div class="image-input" data-drop-path={path} title="Drop a file here to upload">
          <FileUrlInput id={id} path={path} value={value} kind="file" />
        </div>
      );
    case "url":
      return (
        <input id={id} type="text" name={path} value={value} placeholder="/path or https://…" />
      );
    default:
      return <input id={id} type="text" name={path} value={value} />;
  }
}

/** URL of an image or file, with buttons to upload one or choose it from the library. */
function FileUrlInput({
  id,
  path,
  value,
  kind,
}: {
  id: string;
  path: string;
  value: string;
  kind: "image" | "file";
}) {
  return (
    <>
      <input
        id={id}
        type="text"
        name={path}
        data-kind={kind === "image" ? "image" : undefined}
        value={value}
        placeholder="Upload, choose or paste URL"
      />
      <button type="button" data-action={`upload-${kind}`} data-path={path}>
        Upload
      </button>
      <button type="button" data-action={`pick-${kind}`} data-path={path}>
        Library
      </button>
    </>
  );
}
