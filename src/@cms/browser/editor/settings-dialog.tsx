import DrawerLayout, { CancelAndDone } from "@cms/browser/editor/drawer-layout";
import FieldInput from "@cms/browser/editor/field-input";
import type { Page } from "@cms/content/pages";
import { PAGE_TYPES } from "@cms/universal/blocks";
import { SlidersIcon } from "@cms/universal/icons";

/** Side dialog with the title, the path and the page type's fields. */
export default function SettingsDialog({ page }: { page: Page }) {
  const type = PAGE_TYPES[page.type];
  return (
    <DrawerLayout
      icon={<SlidersIcon />}
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
        <FieldInput path={name} field={field} value={page[name]} />
      ))}
    </DrawerLayout>
  );
}
