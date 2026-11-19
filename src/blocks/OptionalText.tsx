import type { FieldHelper } from "@cms/shared/blocks";

/** Text element that is hidden on the site while empty, but stays editable in the editor. */
export default function OptionalText({
  as,
  value,
  name,
  field,
  ...attributes
}: {
  as: keyof JSX.IntrinsicElements;
  value: string;
  /** field name, e.g. "text" or "items.0.title" */
  name: string;
  field: FieldHelper;
} & Record<string, unknown>) {
  // The tag is chosen by the caller, which JSX types can't express.
  const Tag = as as unknown as (props: Record<string, unknown>) => JSX.Element;
  return (
    (value || field.editing) && (
      <Tag {...attributes} {...field(name)}>
        {value}
      </Tag>
    )
  );
}
