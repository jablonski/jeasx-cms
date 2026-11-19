import DrawerLayout from "@cms/browser/editor/drawer-layout";
import { RevertIcon } from "@cms/universal/icons";
import { formatTime } from "@cms/browser/utils/format-time";
import type { Revision } from "@cms/content/revisions";

/**
 * Side dialog listing the versions of a page. Choosing one loads it into the editor
 * (shown live on the canvas); "Keep" leaves it as unsaved changes, Cancel goes back.
 * `selected` is the id of the loaded revision, null for the current version.
 */
export default function HistoryDialog({
  revisions,
  selected,
  updatedAt,
  loading,
}: {
  revisions: Revision[];
  selected: number | null;
  updatedAt?: string;
  loading?: boolean;
}) {
  return (
    <DrawerLayout
      icon={<RevertIcon />}
      title="History"
      description="Every save keeps the version it replaces. Choose one to preview it on the page."
      closeAction="drawer-cancel"
      footer={
        <>
          <span class="spacer" />
          <button type="button" data-action="drawer-cancel">
            Cancel
          </button>
          <button
            type="button"
            class="primary"
            data-action="drawer-done"
            disabled={selected === null}
            title="Keep this version as unsaved changes; save to apply it"
          >
            Restore this version
          </button>
        </>
      }
    >
      <ol class="revisions" aria-busy={loading ? "true" : undefined}>
        <li>
          <button
            type="button"
            class={selected === null ? "revision current selected" : "revision current"}
            data-action="load-revision"
            data-revision=""
            aria-pressed={selected === null ? "true" : "false"}
          >
            <strong>Current version</strong>
            <small>{updatedAt ? `Saved ${formatTime(updatedAt)}` : "Not saved yet"}</small>
          </button>
        </li>
        {revisions.map((r) => (
          <li>
            <button
              type="button"
              class={selected === r.id ? "revision selected" : "revision"}
              data-action="load-revision"
              data-revision={r.id}
              aria-pressed={selected === r.id ? "true" : "false"}
            >
              <strong>{formatTime(r.createdAt)}</strong>
              <small>
                {r.title} <code>{r.slug}</code> <span class={`badge ${r.status}`}>{r.status}</span>
              </small>
            </button>
          </li>
        ))}
      </ol>
      {revisions.length === 0 && <p class="empty">No earlier versions yet.</p>}
    </DrawerLayout>
  );
}
