import DrawerLayout, { CancelAndDone } from "@cms/browser/editor/drawer-layout";
import FieldInput from "@cms/browser/editor/field-input";
import { PAGE_TYPES } from "@cms/content/blocks";
import type { Page } from "@cms/content/pages";

/** Side dialog with the title, the path and the page type's meta fields. */
export default function SettingsDialog({ page }: { page: Page }) {
  const type = PAGE_TYPES[page.type];
  return (
    <DrawerLayout
      icon="⚙"
      title="Page settings"
      description={type?.label ?? page.type}
      footer={
        <>
          {page.id && (
            <button type="button" class="danger" data-action="delete">
              Delete page
            </button>
          )}
          <CancelAndDone />
        </>
      }
    >
      <FieldInput
        path="title"
        field={{ type: "text", label: "Title", required: true }}
        value={page.title}
      />
      <FieldInput
        path="slug"
        field={{
          type: "text",
          label: "Path",
          help: "The address of the page. Generated from the title when empty.",
        }}
        value={page.slug}
      />
      {Object.entries(type?.fields ?? {}).map(([name, field]) => (
        <FieldInput path={`meta.${name}`} field={field} value={page.meta[name]} />
      ))}
    </DrawerLayout>
  );
}
