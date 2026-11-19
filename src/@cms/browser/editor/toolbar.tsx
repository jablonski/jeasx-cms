import type { EditorState } from "@cms/browser/editor/state";
import { SlidersIcon } from "@cms/shared/icons";
import { plural } from "@cms/core/text";

/** Top bar of the editor: page title (opens settings), status, save/publish. */
export default function Toolbar({ state }: { state: EditorState }) {
  const { page } = state;
  return (
    <>
      <div class="editor-toolbar">
        <div class="status">
          <button
            type="button"
            class="page-title"
            data-action="page-settings"
            title="Page settings"
          >
            <span class="gear" aria-hidden="true">
              <SlidersIcon />
            </span>
            <span class="page-title-text">{page.title || "Untitled page"}</span>
            <code>{page.slug || "/…"}</code>
          </button>
          <span class={`badge ${page.status}`}>{page.status}</span>
          <span class="dirty" hidden={!state.dirty}>
            Unsaved
          </span>
          {state.message && <span class="message">{state.message}</span>}
        </div>

        <div class="actions">
          <button
            type="button"
            class={state.dirty ? "save unsaved" : "save"}
            data-action="save"
            disabled={state.busy}
            title={state.dirty ? "Save unsaved changes (Ctrl/⌘ + S)" : "Ctrl/⌘ + S"}
          >
            Save
          </button>
          {page.id && (
            <button type="button" data-action="history" disabled={state.busy}>
              History
            </button>
          )}
          {page.status === "draft" ? (
            <button type="button" class="primary" data-action="publish" disabled={state.busy}>
              Publish
            </button>
          ) : (
            <button type="button" data-action="unpublish" disabled={state.busy}>
              Unpublish
            </button>
          )}
          {page.id && page.status === "published" && (
            <a class="button" href={page.slug} target="_blank" rel="noopener">
              View ↗
            </a>
          )}
        </div>
      </div>
      {state.errors.length > 0 && (
        <div class="errors editor-errors" role="alert">
          <strong>{plural(state.errors.length, "problem")} to fix before saving:</strong>
          <ul>
            {state.errors.map((e) => (
              <li>
                {e.path ? (
                  <button
                    type="button"
                    class="error-link"
                    data-action="goto-error"
                    data-path={e.path}
                    title="Show"
                  >
                    {e.message} <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  e.message
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
