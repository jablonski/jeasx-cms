/** Asks before deleting something that pages still use (a 409 with `usage` from the API). */
import { confirmDialog } from "@cms/browser/utils/dialog";
import { request } from "@cms/browser/utils/http";
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

/**
 * Sends a DELETE; if pages still use the target (409), lists them and, once confirmed,
 * deletes it anyway (`&force=1`). Resolves null if the editor kept it.
 * @param url the API URL with its query (e.g. "api/files?id=3")
 */
export async function deleteWithUsageCheck(
  url: string,
  prompt: { title: string; intro: string },
) {
  const res = await request("DELETE", url);
  if (res.ok || res.status !== 409) {
    return res;
  }
  const force = await confirmUsage({ ...prompt, usage: res.usage ?? [] });
  return force ? request("DELETE", `${url}&force=1`) : null;
}
