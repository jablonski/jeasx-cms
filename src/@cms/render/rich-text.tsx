/**
 * Minimal, safe text formatting without raw HTML:
 * blank line = paragraph, "- " = list item, **bold**, *italic*, [label](url).
 * Everything is rendered as JSX, so it is escaped by jsx-async-runtime.
 */
import { isSafeUrl } from "@cms/content/fields";

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

/** Formats a line in linear time: page content must not be able to stall the server. */
function inline(text: string): (string | JSX.Element)[] {
  const urlStop = /[)\s]/g;
  const boldEnd = nextMatch((from) => text.indexOf("**", from));
  const italicEnd = nextMatch((from) => text.indexOf("*", from));
  const labelEnd = nextMatch((from) => text.indexOf("]", from));
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
    if (text[i] === "*") {
      const bold = text[i + 1] === "*" ? boldEnd(i + 3) : -1;
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
        const label = text.slice(i + 1, close);
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
