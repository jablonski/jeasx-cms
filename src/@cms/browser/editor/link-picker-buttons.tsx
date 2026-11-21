import { FolderIcon, PageIcon } from "@cms/universal/icons";

/** The attributes a button's click is handled by, e.g. { "data-action": "pick-page" }. */
type ButtonAttributes = Record<`data-${string}`, string>;

/** Buttons that choose a link target: a page of the site or a file of the library. */
export default function LinkPickerButtons({
  page,
  file,
  class: className,
}: {
  page: ButtonAttributes;
  file: ButtonAttributes;
  class?: string;
}) {
  return (
    <>
      <button
        type="button"
        class={className}
        {...page}
        title="Link to a page"
        aria-label="Link to a page"
      >
        <PageIcon />
      </button>
      <button
        type="button"
        class={className}
        {...file}
        title="Link to a file"
        aria-label="Link to a file"
      >
        <FolderIcon />
      </button>
    </>
  );
}
