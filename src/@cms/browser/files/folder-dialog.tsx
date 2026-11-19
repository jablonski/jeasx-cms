/** The "move to folder" dialog. */

import { openModal } from "@cms/browser/shared/dialog";
import { request } from "@cms/browser/shared/http";
import type { FolderSummary } from "@cms/media/folders";

/** The folder a button of the dialog stands for; undefined if it was cancelled. */
function chosenFolder(value: string) {
  if (value === "") {
    return undefined;
  }
  return value === "root" ? null : Number(value);
}

/**
 * Lets the user choose a target folder from the whole tree.
 * Resolves the folder id (null = root), or undefined if cancelled.
 * `exclude`: a folder (and its subfolders) that can't be chosen, e.g. when moving that folder.
 */
export async function chooseFolder({
  title,
  current,
  exclude,
}: {
  title: string;
  current: number | null;
  exclude?: number;
}): Promise<number | null | undefined> {
  const res = await request<FolderSummary[]>("GET", "api/folders");
  const all = res.ok ? res.data : [];
  const children = (parent: number | null) => all.filter((f) => f.parentId === parent);
  const excluded = new Set<number>();
  const mark = (id: number) => {
    excluded.add(id);
    children(id).forEach((c) => mark(c.id));
  };
  if (exclude != null) {
    mark(exclude);
  }

  const Tree = ({ parent, depth }: { parent: number | null; depth: number }): JSX.Element[] =>
    children(parent).map((f) => (
      <>
        <button
          type="submit"
          value={String(f.id)}
          class="folder-option"
          style={`--depth: ${depth}`}
          disabled={excluded.has(f.id) || f.id === current}
        >
          <span class="folder-icon small" aria-hidden="true" /> {f.name}
          {f.id === current && <small> (current)</small>}
        </button>
        <Tree parent={f.id} depth={depth + 1} />
      </>
    ));

  return openModal({
    className: "modal folder-dialog",
    dismissValue: "",
    content: (
      <form method="dialog">
        <div class="modal-body">
          <div class="modal-field">
            <h2 id="modal-title">{title}</h2>
            <div class="folder-tree">
              <button
                type="submit"
                value="root"
                class="folder-option"
                style="--depth: 0"
                disabled={current == null}
              >
                <span class="folder-icon small" aria-hidden="true" /> Files (top level)
                {current == null && <small> (current)</small>}
              </button>
              <Tree parent={null} depth={1} />
            </div>
          </div>
        </div>
        <footer class="modal-actions">
          <button type="submit" value="">
            Cancel
          </button>
        </footer>
      </form>
    ),
    result: (dialog) => chosenFolder(dialog.returnValue),
  });
}
