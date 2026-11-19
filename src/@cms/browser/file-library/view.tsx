import type { FolderView } from "@cms/browser/files/file-api";
import { Breadcrumb, FileBrowser } from "@cms/browser/files/file-browser";

/** The file library page: toolbar, breadcrumb, problems and the current folder. */
export default function LibraryView({
  listing,
  messages,
  busy,
}: {
  listing: FolderView;
  messages: string[];
  busy: boolean;
}) {
  const problems = listing.error ? [listing.error, ...messages] : messages;
  return (
    <>
      <div class="toolbar">
        <h1>Files</h1>
        <div class="inline-form">
          <button type="button" data-new-folder>
            New folder
          </button>
          <button type="button" class="primary" data-upload disabled={busy}>
            {busy
              ? "Uploading…"
              : listing.folder
                ? `Upload to »${listing.folder.name}«`
                : "Upload files"}
          </button>
        </div>
      </div>
      <Breadcrumb path={listing.path} />
      {problems.length > 0 && (
        <ul class="errors" role="alert">
          {problems.map((m) => (
            <li>{m}</li>
          ))}
        </ul>
      )}
      <div class="dropzone">
        <FileBrowser listing={listing} mode="manage" />
      </div>
    </>
  );
}
