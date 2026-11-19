/**
 * Converts the HTML of a rich text field edited on the canvas back into its stored
 * markdown (the format of src/@cms/render/rich-text.tsx): blank line = paragraph,
 * "- " = list item, line break inside a paragraph, **bold**, *italic*, [label](url).
 *
 * contenteditable produces all kinds of markup (<div>, <b>, <span style>, nested lists,
 * stray <br>), so any HTML is accepted: what the format can't express is kept as text.
 */
import { isSafeUrl } from "@cms/content/fields";

/** The part of the DOM the conversion reads (a DOM Node; plain objects in tests). */
export interface NodeLike {
  nodeType: number;
  nodeName: string;
  textContent: string | null;
  childNodes: ArrayLike<NodeLike>;
  getAttribute?(name: string): string | null;
}

const TEXT = 3;
const ELEMENT = 1;

/** Elements that start a new paragraph. */
const BLOCKS = new Set([
  "P",
  "DIV",
  "UL",
  "OL",
  "LI",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BLOCKQUOTE",
  "PRE",
  "SECTION",
  "ARTICLE",
]);

type Format = { bold: boolean; italic: boolean; link: boolean };

const tag = (node: NodeLike) => node.nodeName.toUpperCase();
const children = (node: NodeLike) => Array.from(node.childNodes);
const isBlock = (node: NodeLike) => node.nodeType === ELEMENT && BLOCKS.has(tag(node));

/** Markdown of the contents of `root` (the rich text field). */
export function htmlToMarkdown(root: NodeLike): string {
  const chunks: string[] = [];
  collectBlocks(root, chunks);
  return chunks.filter((chunk) => chunk.trim()).join("\n\n");
}

/** Splits `parent` into paragraphs and lists; loose inline content forms a paragraph. */
function collectBlocks(parent: NodeLike, chunks: string[]) {
  let run: NodeLike[] = [];
  const flush = () => {
    if (run.length) {
      chunks.push(paragraph(run));
      run = [];
    }
  };
  for (const node of children(parent)) {
    if (!isBlock(node)) {
      run.push(node);
      continue;
    }
    flush();
    const name = tag(node);
    if (name === "UL" || name === "OL") {
      const items: string[] = [];
      collectItems(node, items);
      if (items.length) {
        chunks.push(items.join("\n"));
      }
    } else if (children(node).some(isBlock)) {
      collectBlocks(node, chunks); // e.g. <div><p>…</p></div>
    } else {
      chunks.push(paragraph(children(node)));
    }
  }
  flush();
}

/** List items, nested lists flattened (the format has one level). */
function collectItems(list: NodeLike, items: string[]) {
  for (const node of children(list)) {
    const name = node.nodeType === ELEMENT ? tag(node) : "";
    if (name === "UL" || name === "OL") {
      collectItems(node, items);
      continue;
    }
    if (name !== "LI") {
      const text = inline([node]).replace(/\s+/g, " ").trim();
      if (text) {
        items.push(`- ${text}`);
      }
      continue;
    }
    const isList = (c: NodeLike) => c.nodeType === ELEMENT && ["UL", "OL"].includes(tag(c));
    // A list item is one line: its line breaks become spaces.
    const text = inline(children(node).filter((c) => !isList(c)))
      .replace(/\s+/g, " ")
      .trim();
    if (text) {
      items.push(`- ${text}`);
    }
    for (const nested of children(node).filter(isList)) {
      collectItems(nested, items);
    }
  }
}

/** A paragraph: lines separated by <br>, each trimmed, no blank lines inside. */
function paragraph(nodes: NodeLike[]) {
  return inline(nodes)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** Inline markdown of `nodes`; <br> becomes "\n". */
function inline(nodes: NodeLike[], format: Format = { bold: false, italic: false, link: false }) {
  return nodes.map((node) => inlineNode(node, format)).join("");
}

function inlineNode(node: NodeLike, format: Format): string {
  if (node.nodeType === TEXT) {
    // contenteditable keeps typed spaces as non-breaking spaces
    return (node.textContent ?? "").replace(/ /g, " ").replace(/[\r\n]+/g, " ");
  }
  if (node.nodeType !== ELEMENT) {
    return "";
  }
  const name = tag(node);
  if (name === "BR") {
    return "\n";
  }
  if (isBlock(node)) {
    // a block nested in inline content: keep its text on its own line
    return `\n${inline(children(node), format)}\n`;
  }
  if (name === "A" && !format.link) {
    return link(node, format);
  }
  const style = node.getAttribute?.("style") ?? "";
  const bold =
    name === "STRONG" ||
    name === "B" ||
    /font-weight:\s*(bold|[6-9]00)/i.test(style);
  const italic = name === "EM" || name === "I" || /font-style:\s*italic/i.test(style);
  if (format.link) {
    // link labels are plain text in the format
    return inline(children(node), format);
  }
  // bold inside italic can't be expressed: "*a **b** c*" ends the italic at "**"
  if (bold && !format.bold && !format.italic) {
    return wrap("**", inline(children(node), { ...format, bold: true }));
  }
  if (italic && !format.italic) {
    return wrap("*", inline(children(node), { ...format, italic: true }));
  }
  return inline(children(node), format);
}

/** Wraps text in a marker; surrounding whitespace stays outside, so "** b**" can't happen. */
function wrap(marker: string, text: string) {
  // the format is line based: a line break inside bold text closes it on each line
  return text
    .split("\n")
    .map((line) => {
      const [, before, core, after] = /^(\s*)([\s\S]*?)(\s*)$/.exec(line)!;
      return core ? `${before}${marker}${core}${marker}${after}` : line;
    })
    .join("\n");
}

/** [label](url) for links the format can hold; otherwise just the label. */
function link(node: NodeLike, format: Format) {
  const label = inline(children(node), { ...format, link: true }).replace(/\s+/g, " ");
  const url = (node.getAttribute?.("href") ?? "").trim();
  const fits = url && isSafeUrl(url) && !/[\s)]/.test(url) && !label.includes("]");
  if (!fits || !label.trim()) {
    return label;
  }
  return wrapLink(label, url);
}

function wrapLink(label: string, url: string) {
  const [, before, core, after] = /^(\s*)([\s\S]*?)(\s*)$/.exec(label)!;
  return `${before}[${core}](${url})${after}`;
}
