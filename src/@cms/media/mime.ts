/** Detects the type of uploaded files (server only). */

/** Types recognized by their content: a matching file name alone is not trusted for these. */
const SIGNATURES: Record<string, { mime: string; test: (b: Buffer) => boolean }> = {
  jpg: { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  png: {
    mime: "image/png",
    test: (b) => b.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")),
  },
  gif: { mime: "image/gif", test: (b) => b.subarray(0, 4).toString("latin1") === "GIF8" },
  webp: {
    mime: "image/webp",
    test: (b) =>
      b.subarray(0, 4).toString("latin1") === "RIFF" &&
      b.subarray(8, 12).toString("latin1") === "WEBP",
  },
  avif: {
    mime: "image/avif",
    test: (b) =>
      b.subarray(4, 8).toString("latin1") === "ftyp" &&
      /^avi[fs]$/.test(b.subarray(8, 12).toString("latin1")),
  },
  pdf: { mime: "application/pdf", test: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
};

/**
 * Content types of other common files by extension; all others are sent as binary data.
 * JavaScript stays binary on purpose: the site's policy allows scripts from its own origin.
 */
const MIME_TYPES: Record<string, string> = {
  "7z": "application/x-7z-compressed",
  avi: "video/x-msvideo",
  bmp: "image/bmp",
  css: "text/css",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  epub: "application/epub+zip",
  flac: "audio/flac",
  gz: "application/gzip",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  json: "application/json",
  m4a: "audio/mp4",
  md: "text/markdown",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  odp: "application/vnd.oasis.opendocument.presentation",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odt: "application/vnd.oasis.opendocument.text",
  ogg: "audio/ogg",
  otf: "font/otf",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  rar: "application/vnd.rar",
  rtf: "application/rtf",
  svg: "image/svg+xml",
  tar: "application/x-tar",
  tif: "image/tiff",
  tiff: "image/tiff",
  ttf: "font/ttf",
  txt: "text/plain",
  wav: "audio/wav",
  webm: "video/webm",
  woff: "font/woff",
  woff2: "font/woff2",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xml: "application/xml",
  zip: "application/zip",
};

/** Extension and content type of an upload; the content wins over the file name. */
export function detectType(buffer: Buffer, name: string): { ext: string; mime: string } {
  const detected = Object.keys(SIGNATURES).find((k) => SIGNATURES[k].test(buffer));
  if (detected) {
    return { ext: detected, mime: SIGNATURES[detected].mime };
  }
  const ext = /\.([a-z0-9]{1,16})$/i.exec(name)?.[1].toLowerCase() ?? "bin";
  // Extensions come from the upload: "constructor" must not find the object's inherited method.
  const mime = Object.hasOwn(MIME_TYPES, ext) ? MIME_TYPES[ext] : "application/octet-stream";
  return { ext, mime };
}
