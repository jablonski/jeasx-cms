/** The folder browser, shared by the library page and the picker dialog. */
import { GripIcon, XIcon } from "@cms/universal/icons";

import type { FolderView } from "@cms/browser/files/file-api";
import FileIcon from "@cms/browser/files/file-icon";
import type { StoredFile } from "@cms/media/files";
import type { Folder, FolderSummary } from "@cms/media/folders";
import { formatSize, plural } from "@cms/universal/text";

/** Breadcrumb; every crumb is a drop target for moving files and folders. */
export function Breadcrumb({ path }: { path: Folder[] }) {
  return (
    <nav class="file-breadcrumb" aria-label="Folder">
      <button
        type="button"
        data-open-folder=""
        data-drop-folder=""
        title="All files"
        aria-label="All files"
      >
        <svg
          class="crumb-home"
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M1.5 7.5 8 2l6.5 5.5" />
          <path d="M3.5 6.8V14h9V6.8" />
          <path d="M6.5 14V9.5h3V14" />
        </svg>
      </button>
      {path.map((f, i) => (
        <>
          <span aria-hidden="true">/</span>
          {i === path.length - 1 ? (
            <strong data-drop-folder={f.id}>{f.name}</strong>
          ) : (
            <button type="button" data-open-folder={f.id} data-drop-folder={f.id}>
              {f.name}
            </button>
          )}
        </>
      ))}
    </nav>
  );
}

/** Folders and files of one folder. */
export function FileBrowser({
  listing,
  mode,
  imagesOnly = true,
}: {
  listing: FolderView;
  mode: "pick" | "manage";
  /** pick mode: offer images only */
  imagesOnly?: boolean;
}) {
  const manage = mode === "manage";
  const { folders } = listing;
  const files = manage || !imagesOnly ? listing.files : listing.files.filter(isImage);
  if (listing.error) {
    return null; // not known to be empty
  }
  if (!folders.length && !files.length) {
    return <p class="empty">{emptyMessage(manage, imagesOnly)}</p>;
  }
  return (
    <ul class="file-grid">
      {folders.map((f) => (
        <FolderItem folder={f} manage={manage} />
      ))}
      {files.map((file) => (
        <FileItem file={file} manage={manage} />
      ))}
    </ul>
  );
}

function emptyMessage(manage: boolean, imagesOnly: boolean) {
  if (manage) {
    return "This folder is empty. Upload or drop files here, or create a folder.";
  }
  return imagesOnly ? "No images in this folder." : "No files in this folder.";
}

function FolderItem({ folder: f, manage }: { folder: FolderSummary; manage: boolean }) {
  return (
    <li
      class="file-item file-folder"
      data-drop-folder={f.id}
      draggable={manage ? "true" : undefined}
      data-drag-folder={manage ? f.id : undefined}
    >
      {manage && <DragHandle name={f.name} />}
      <button
        type="button"
        class="file-thumb folder-thumb"
        data-open-folder={f.id}
        title={`Open ${f.name}`}
      >
        <span class="folder-icon" aria-hidden="true" />
      </button>
      <div class="file-meta">
        <span class="file-name" title={f.name}>
          {f.name}
        </span>
        <small>{folderContents(f)}</small>
      </div>
      {manage && (
        <div class="tools">
          <button type="button" data-move-folder={f.id} title="Move to folder">
            Move
          </button>
          <button type="button" data-rename-folder={f.id} title="Rename">
            Rename
          </button>
        </div>
      )}
      {manage && (
        <button
          type="button"
          class="file-delete"
          data-delete-folder={f.id}
          title="Delete folder"
          aria-label={`Delete folder ${f.name}`}
        >
          <XIcon />
        </button>
      )}
    </li>
  );
}

function FileItem({ file, manage }: { file: StoredFile; manage: boolean }) {
  return (
    <li
      class="file-item"
      draggable={manage ? "true" : undefined}
      data-drag-file={manage ? file.id : undefined}
    >
      {manage && <DragHandle name={file.name} />}
      {manage ? (
        <a
          class="file-thumb"
          href={file.url}
          target="_blank"
          rel="noopener"
          title="Open"
          draggable="false"
        >
          <FilePreview file={file} />
        </a>
      ) : (
        <button type="button" class="file-thumb" data-pick={file.url} title={file.name}>
          <FilePreview file={file} />
        </button>
      )}
      <div class="file-meta">
        <FileName name={file.name} />
        <small>{formatSize(file.size)}</small>
      </div>
      {manage && (
        <div class="tools">
          <button type="button" data-move={file.id} title="Move to folder">
            Move
          </button>
          <button type="button" data-rename-file={file.id} title="Rename">
            Rename
          </button>
        </div>
      )}
      {manage && (
        <button
          type="button"
          class="file-delete"
          data-delete={file.id}
          title="Delete"
          aria-label={`Delete ${file.name}`}
        >
          <XIcon />
        </button>
      )}
    </li>
  );
}

/** Grip in the card's corner: always starts a drag, whatever the card contains. */
function DragHandle({ name }: { name: string }) {
  return (
    <span class="drag-handle" draggable="true" title="Drag to a folder" aria-label={`Move ${name}`}>
      <GripIcon />
    </span>
  );
}

const isImage = (f: StoredFile) => f.mime.startsWith("image/");

/** Thumbnail of an image; other files show an icon for their kind. */
function FilePreview({ file }: { file: StoredFile }) {
  if (isImage(file)) {
    return <img src={file.url} alt="" loading="lazy" draggable="false" />;
  }
  return <FileIcon file={file} />;
}

/** File name that is shortened before its extension, so the extension stays visible. */
function FileName({ name }: { name: string }) {
  const ext = /\.[^.\s]{1,16}$/.exec(name)?.[0] ?? "";
  return (
    <span class="file-name file-name-split" title={name}>
      <span class="file-stem">{name.slice(0, name.length - ext.length)}</span>
      <span class="file-ext">{ext}</span>
    </span>
  );
}

/** "2 folders, 5 files" */
const folderContents = (f: FolderSummary) => {
  const parts: string[] = [];
  if (f.folderCount) {
    parts.push(plural(f.folderCount, "folder"));
  }
  parts.push(plural(f.fileCount, "file"));
  return parts.join(", ");
};
