import type { FieldHelper } from "@cms/universal/blocks";
import OptionalText from "./OptionalText";

/** Optional block heading: hidden on the site while empty, always editable in the editor. */
export default function Heading({
  text,
  field,
  name = "heading",
}: {
  text: string;
  field: FieldHelper;
  /** field name, e.g. "heading" or "columns.1.heading" in a list */
  name?: string;
}) {
  return <OptionalText as="h2" value={text} name={name} field={field} />;
}
