/**
 * Icon for files without an image preview: a square tile in the style of the folder icon
 * with a symbol for the kind of file. Inline SVG, colored via CSS (see styles/files.css).
 */
import type { StoredFile } from "@cms/media/files";

type Kind =
  | "pdf"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "audio"
  | "video"
  | "code"
  | "font"
  | "text"
  | "file";

const KIND_BY_EXTENSION: Record<string, Kind> = {
  doc: "document",
  docx: "document",
  odt: "document",
  rtf: "document",
  epub: "document",
  xls: "spreadsheet",
  xlsx: "spreadsheet",
  ods: "spreadsheet",
  csv: "spreadsheet",
  ppt: "presentation",
  pptx: "presentation",
  odp: "presentation",
  zip: "archive",
  gz: "archive",
  tar: "archive",
  rar: "archive",
  "7z": "archive",
  html: "code",
  htm: "code",
  css: "code",
  js: "code",
  json: "code",
  xml: "code",
  md: "text",
  txt: "text",
  ttf: "font",
  otf: "font",
  woff: "font",
  woff2: "font",
};

function kindOf({ filename, mime }: StoredFile): Kind {
  if (mime === "application/pdf") {
    return "pdf";
  }
  if (mime.startsWith("audio/")) {
    return "audio";
  }
  if (mime.startsWith("video/")) {
    return "video";
  }
  const extension = filename.split(".")[1];
  return Object.hasOwn(KIND_BY_EXTENSION, extension) ? KIND_BY_EXTENSION[extension] : "file";
}

/** Symbols drawn on the tile (32 × 32). */
const SYMBOLS: Record<Kind, string> = {
  pdf: "M10 6h8l5 5v15H10zM18 6v5h5M13.5 17h6M13.5 21h6",
  document: "M9 10h14M9 16h14M9 22h9",
  spreadsheet: "M8 9h16v14H8zM8 16h16M16 9v14",
  presentation: "M7 8h18v12H7zM16 20v4M12 24h8M12 16v-2M16 16v-4M20 16v-3",
  archive: "M16 5v2M16 10v2M16 15v2M13.5 19h5v4a2.5 2.5 0 0 1-5 0z",
  audio: "M13 22V10l10-2v12M13 22a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM23 20a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  video: "M12 9v14l11-7z",
  code: "m12 10-6 6 6 6M20 10l6 6-6 6",
  font: "m8 24 8-16 8 16M11 18.5h10",
  text: "M9 10h14M9 16h14M9 22h14",
  file: "M11 7h7l4 4v14H11zM18 7v4h4",
};

export default function FileIcon({ file }: { file: StoredFile }) {
  const kind = kindOf(file);
  return (
    <span class={`file-icon file-icon-${kind}`}>
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path d={SYMBOLS[kind]} />
      </svg>
    </span>
  );
}
