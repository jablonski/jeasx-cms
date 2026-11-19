import { defineBlock } from "@cms/shared/blocks";
import Heading from "./Heading";
import OptionalText from "./OptionalText";

const cells = (line: string) => line.split("|").map((cell) => cell.trim());

export default defineBlock({
  type: "table",
  label: "Table",
  icon: "▦",
  description: "Data table with a header row",
  fields: {
    heading: { type: "text", label: "Heading" },
    rows: {
      type: "textarea",
      label: "Rows",
      required: true,
      default: "Name | Value\nExample | 1",
      help: "One row per line, cells separated by |. The first row is the header.",
    },
    caption: { type: "text", label: "Caption" },
  },
  Component({ heading, rows, caption, field }) {
    const [head = "", ...body] = rows.split("\n").filter((line) => line.trim());
    return (
      <section class="block-table">
        <Heading text={heading} field={field} />
        <div class="scroll">
          <table>
            <OptionalText as="caption" value={caption} name="caption" field={field} />
            <thead>
              <tr>
                {cells(head).map((cell) => (
                  <th scope="col">{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((line) => (
                <tr>
                  {cells(line).map((cell) => (
                    <td>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  },
});
