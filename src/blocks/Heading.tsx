import type { FieldHelper } from "@cms/shared/blocks";
import OptionalText from "./OptionalText";

/** Optional block heading: hidden on the site while empty, always editable in the editor. */
export default function Heading({ text, field }: { text: string; field: FieldHelper }) {
  return <OptionalText as="h2" value={text} name="heading" field={field} />;
}
