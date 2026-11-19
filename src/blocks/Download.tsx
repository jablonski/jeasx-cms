import { defineBlock } from "@cms/content/blocks";
import { formatSize } from "@cms/core/text";
import { getFileByUrl } from "@cms/media/files";
import Heading from "./Heading";
import OptionalText from "./OptionalText";

export default defineBlock({
  type: "download",
  label: "Downloads",
  icon: "⤓",
  description: "List of files to download with type and size",
  fields: {
    heading: { type: "text", label: "Heading" },
    items: {
      type: "list",
      label: "Files",
      itemLabel: "title",
      fields: {
        title: { type: "text", label: "Title", required: true },
        description: { type: "text", label: "Description" },
        file: { type: "file", label: "File", required: true },
      },
    },
  },
  Component({ heading, items, field }) {
    return (
      <section class="block-download">
        <Heading text={heading} field={field} />
        <ul>
          {items.map(({ title, description, file }, i) => {
            const stored = getFileByUrl(file);
            const type = stored?.filename.split(".")[1];
            return (
              <li>
                <span class="type">{type && type !== "bin" ? type.toUpperCase() : "FILE"}</span>
                <div class="info">
                  <strong {...field(`items.${i}.title`)}>{title}</strong>
                  <OptionalText
                    as="span"
                    value={description}
                    name={`items.${i}.description`}
                    field={field}
                  />
                </div>
                {stored && <small>{formatSize(stored.size)}</small>}
                {file && (
                  <a
                    class="button secondary"
                    href={`${file}?download`}
                    download={stored?.downloadName ?? ""}
                  >
                    Download<span class="visually-hidden"> {title}</span>
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    );
  },
});
