/** The file picker of image and file fields; image fields only offer images. */

import {
  browseFolder,
  browseFolderOrTop,
  chooseFiles,
  folderIdOf,
  isImageFile,
  uploadFile,
} from "@cms/browser/files/file-api";
import { Breadcrumb, FileBrowser } from "@cms/browser/files/file-browser";
import { toHtml } from "@cms/browser/shared/to-html";

/** The picker reopens in the folder used last (per page load). */
let lastPickerFolder: number | null = null;

/** Folder the picker was last closed in (null = top level); direct uploads go there too. */
export const lastFileFolder = () => lastPickerFolder;

/** Shows the file library as modal dialog (with folders). Resolves with the chosen URL or null. */
export async function pickFile({ imagesOnly = true } = {}): Promise<string | null> {
  const dialog = document.createElement("dialog");
  dialog.className = "file-dialog";
  document.body.append(dialog);

  let listing = await browseFolderOrTop(lastPickerFolder);

  const render = (message = "") => {
    dialog.innerHTML = toHtml(
      <>
        <header>
          <h2>{imagesOnly ? "Choose an image" : "Choose a file"}</h2>
          <span class="tools">
            <button type="button" class="primary" data-upload>
              Upload…
            </button>
            <button type="button" data-close>
              Close
            </button>
          </span>
        </header>
        <Breadcrumb path={listing.path} />
        {(message || listing.error) && <p class="errors">{message || listing.error}</p>}
        <FileBrowser listing={listing} mode="pick" imagesOnly={imagesOnly} />
      </>,
    );
  };
  render();
  dialog.showModal();

  return new Promise((resolve) => {
    const done = (value: string | null) => {
      lastPickerFolder = listing.folder?.id ?? null;
      dialog.close();
      dialog.remove();
      resolve(value);
    };
    dialog.addEventListener("cancel", () => done(null));
    dialog.addEventListener("click", async (e) => {
      const target = e.target as HTMLElement;
      if (target === dialog || target.closest("[data-close]")) {
        return done(null);
      }
      const pick = target.closest("[data-pick]");
      if (pick) {
        return done(pick.getAttribute("data-pick"));
      }
      const open = target.closest("[data-open-folder]");
      if (open) {
        listing = await browseFolder(folderIdOf(open.getAttribute("data-open-folder")));
        return render();
      }
      if (target.closest("[data-upload]")) {
        const [file] = await chooseFiles({ accept: imagesOnly ? "image/*" : "" });
        if (!file) {
          return;
        }
        if (imagesOnly && !isImageFile(file)) {
          return render(`${file.name} is not an image.`);
        }
        const res = await uploadFile(file, listing.folder?.id ?? null);
        if (res.ok) {
          done(res.data.url);
        } else {
          render(res.error);
        }
      }
    });
  });
}
