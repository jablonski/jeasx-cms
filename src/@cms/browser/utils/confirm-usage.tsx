/** Asks before deleting something that pages still use (a 409 with `usage` from the API). */
import { confirmDialog } from "@cms/browser/utils/dialog";
import type { Usage } from "@cms/content/pages";

export function confirmUsage({
  title,
  intro,
  usage,
  confirmLabel = "Delete anyway",
}: {
  title: string;
  intro: string;
  usage: Usage[];
  confirmLabel?: string;
}) {
  return confirmDialog({
    title,
    message: (
      <>
        <p>{intro}</p>
        <ul>
          {usage.map((p) => (
            <li>
              <a href={`edit?id=${p.id}`}>{p.title}</a> <code>{p.slug}</code>
            </li>
          ))}
        </ul>
      </>
    ),
    confirmLabel,
    danger: true,
  });
}
