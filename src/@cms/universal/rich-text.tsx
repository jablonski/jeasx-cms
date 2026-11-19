/**
 * Minimal, safe text formatting without raw HTML:
 * blank line = paragraph, "- " = list item, **bold**, *italic*, [label](url).
 * A backslash keeps a marker as text: \* \[ \] \( \) \- \\ (written by the editor
 * for typed characters, so they never turn into formatting).
 * Everything is rendered as JSX, so it is escaped by jsx-async-runtime.
 */
import { isSafeUrl } from "@cms/universal/fields";

/**
 * Without extra props, renders the paragraphs only. Extra props (inline editing
 * attributes from the visual editor) wrap the output in a div carrying them.
 */
export default function RichText({ text, ...attrs }: { text: string } & Record<string, unknown>) {
  const content = format(text);
  return Object.keys(attrs).length ? (
    <div class="rich-text" {...attrs}>
      {content}
    </div>
  ) : (
    content
  );
}

/**
 * Remembers the next match of a search whose start only ever moves forward, so a line
 * with many unclosed markers is scanned once instead of once per marker.
 */
function nextMatch(search: (from: number) => number) {
  let found = -2;
  return (from: number) => {
    if (found !== -1 && found < from) {
      found = search(from);
    }
    return found;
  };
}

/** Characters a backslash keeps as text. */
const ESCAPABLE = new Set(["\\", "*", "[", "]", "(", ")", "-"]);

/** Removes the escapes of `text` (link labels are plain text). */
const unescape = (text: string) => text.replace(/\\([\\*[\]()-])/g, "$1");

/** Whether the character at `at` is escaped (an odd number of backslashes before it). */
function isEscaped(text: string, at: number) {
  let count = 0;
  for (let i = at - 1; i >= 0 && text[i] === "\\"; i--) {
    count++;
  }
  return count % 2 === 1;
}

/** Position of the next unescaped `marker` from `from`, or -1. */
function find(text: string, marker: string, from: number) {
  let at = text.indexOf(marker, from);
  while (at >= 0 && isEscaped(text, at)) {
    at = text.indexOf(marker, at + 1);
  }
  return at;
}

/** Formats a line in linear time: page content must not be able to stall the server. */
function inline(text: string): (string | JSX.Element)[] {
  const urlStop = /[)\s]/g;
  const boldEnd = nextMatch((from) => find(text, "**", from));
  const italicEnd = nextMatch((from) => find(text, "*", from));
  const labelEnd = nextMatch((from) => find(text, "]", from));
  const urlEnd = nextMatch((from) => {
    urlStop.lastIndex = from;
    return urlStop.exec(text)?.index ?? -1;
  });

  const out: (string | JSX.Element)[] = [];
  let last = 0;
  let i = 0;
  while (i < text.length) {
    let node: string | JSX.Element | undefined;
    let end = -1;
    if (text[i] === "\\" && ESCAPABLE.has(text[i + 1])) {
      node = text[i + 1];
      end = i + 2;
    } else if (text[i] === "*") {
      let bold = text[i + 1] === "*" ? boldEnd(i + 3) : -1;
      // "***x***" (italic in bold): close on the last two stars when the inner text would
      // otherwise end with an unclosed italic ("*x"), but not for "**a***b*" (bold, then
      // italic). Counts only the inner text, which is formatted next anyway: stays linear.
      if (bold >= 0 && text[bold + 2] === "*" && starCount(text, i + 2, bold) % 2 === 1) {
        bold++;
      }
      const italic = bold < 0 ? italicEnd(i + 2) : -1;
      if (bold >= 0) {
        node = <strong>{inline(text.slice(i + 2, bold))}</strong>;
        end = bold + 2;
      } else if (italic >= 0) {
        node = <em>{inline(text.slice(i + 1, italic))}</em>;
        end = italic + 1;
      }
    } else if (text[i] === "[") {
      const close = labelEnd(i + 1);
      const stop = close > i + 1 && text[close + 1] === "(" ? urlEnd(close + 2) : -1;
      if (stop > close + 2 && text[stop] === ")") {
        const label = unescape(text.slice(i + 1, close));
        const url = text.slice(close + 2, stop);
        node = isSafeUrl(url) ? <a href={url}>{label}</a> : label;
        end = stop + 1;
      }
    }
    if (end < 0) {
      i++;
      continue;
    }
    out.push(text.slice(last, i), node!);
    i = last = end;
  }
  out.push(text.slice(last));
  return out;
}

/** Unescaped stars in text[from, to). */
function starCount(text: string, from: number, to: number) {
  let count = 0;
  let escaped = false;
  for (let i = from; i < to; i++) {
    if (text[i] === "*" && !escaped) {
      count++;
    }
    escaped = text[i] === "\\" && !escaped;
  }
  return count;
}

function format(text: string) {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((chunk: string) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split("\n");
      if (lines.every((l) => /^\s*- /.test(l))) {
        return (
          <ul>
            {lines.map((l) => (
              <li>{inline(l.replace(/^\s*- /, ""))}</li>
            ))}
          </ul>
        );
      }
      return <p>{lines.flatMap((l, i) => (i ? [<br />, ...inline(l)] : inline(l)))}</p>;
    });
}
