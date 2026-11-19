/**
 * Drag & drop of the file library: files from the desktop upload into the current folder;
 * files and folders dragged inside the library move onto a folder tile or breadcrumb.
 */
import type { Library } from "@cms/browser/file-library/library";
import { folderIdOf } from "@cms/browser/files/file-api";

export function bindLibraryDragDrop(
  root: HTMLElement,
  {
    current,
    upload,
    moveFile,
    moveFolder,
  }: Pick<Library, "current" | "upload"> & {
    moveFile: (id: string, folder: number | null) => Promise<void>;
    moveFolder: (id: string, parent: number | null) => Promise<void>;
  },
) {
  let dragging: { kind: "file" | "folder"; id: string } | null = null;

  const clearTargets = () =>
    root.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));

  /** Folder element under the pointer that accepts the current drag. */
  const dropFolder = (e: DragEvent) => {
    const el = (e.target as HTMLElement).closest?.("[data-drop-folder]");
    if (!el || !dragging) {
      return null;
    }
    const targetId = folderIdOf(el.getAttribute("data-drop-folder"));
    if (targetId === current() && !el.matches(".file-folder")) {
      return null; // already here
    }
    if (dragging.kind === "folder" && String(targetId) === dragging.id) {
      return null; // onto itself
    }
    return { el, id: targetId };
  };

  root.addEventListener("dragstart", (e) => {
    const item = (e.target as HTMLElement).closest?.("[data-drag-file], [data-drag-folder]");
    if (!item) {
      return;
    }
    const moved: typeof dragging = item.hasAttribute("data-drag-file")
      ? { kind: "file", id: item.getAttribute("data-drag-file")! }
      : { kind: "folder", id: item.getAttribute("data-drag-folder")! };
    dragging = moved;
    e.dataTransfer!.effectAllowed = "move";
    e.dataTransfer!.setData("text/plain", moved.id);
    requestAnimationFrame(() => {
      item.classList.add("dragging");
      root.classList.add("is-moving");
    });
  });

  root.addEventListener("dragend", () => {
    dragging = null;
    clearTargets();
    root.classList.remove("is-moving");
    root.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
  });

  root.addEventListener("dragover", (e) => {
    if (dragging) {
      const target = dropFolder(e);
      clearTargets();
      if (!target) {
        return;
      }
      e.preventDefault();
      e.dataTransfer!.dropEffect = "move";
      target.el.classList.add("drop-target");
      return;
    }
    if (!e.dataTransfer?.types.includes("Files")) {
      return;
    }
    e.preventDefault();
    root.classList.add("dragover");
  });

  root.addEventListener("dragleave", (e) => {
    if (!root.contains(e.relatedTarget as Node)) {
      root.classList.remove("dragover");
      clearTargets();
    }
  });

  root.addEventListener("drop", async (e) => {
    if (dragging) {
      const target = dropFolder(e);
      const item = dragging;
      dragging = null;
      clearTargets();
      if (!target) {
        return;
      }
      e.preventDefault();
      if (item.kind === "file") {
        await moveFile(item.id, target.id);
      } else {
        await moveFolder(item.id, target.id);
      }
      return;
    }
    if (!e.dataTransfer?.files.length) {
      return;
    }
    e.preventDefault();
    root.classList.remove("dragover");
    upload([...e.dataTransfer.files]);
  });
}
