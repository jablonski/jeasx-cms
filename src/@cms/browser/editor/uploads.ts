/** Setting image and file fields of the page, by URL or by uploading a file. */

import type { Editor } from "@cms/browser/editor/state";
import { isImageFile, uploadFile } from "@cms/browser/files/file-api";
import { lastFileFolder } from "@cms/browser/files/file-picker";
import { alertDialog } from "@cms/browser/utils/dialog";

export function createUploads({ state, setAt, fieldAt, markDirty, render }: Editor) {
  function setFileUrl(path: string, url: string) {
    setAt(path, url);
    state.errors = state.errors.filter((err) => err.path !== path);
    markDirty();
    render();
  }

  async function upload(path: string, file: File) {
    if (fieldAt(path)?.type === "image" && !isImageFile(file)) {
      await alertDialog({ title: "Not an image", message: `${file.name} is not an image.` });
      return;
    }
    const box = document.querySelector(`[data-drop-path="${CSS.escape(path)}"]`);
    box?.classList.add("uploading");
    // Same folder as the image picker used last (top level until the picker was used).
    const res = await uploadFile(file, lastFileFolder());
    box?.classList.remove("uploading");
    if (res.ok) {
      setFileUrl(path, res.data.url);
    } else {
      await alertDialog({ title: "Upload failed", message: `${file.name}: ${res.error}` });
    }
  }

  return { setFileUrl, upload };
}
