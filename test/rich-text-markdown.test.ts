import assert from "node:assert/strict";
import { test } from "node:test";
import { htmlToMarkdown, type NodeLike } from "@cms/browser/editor/rich-text-markdown";
import RichText from "@cms/render/rich-text";
import { jsxToString } from "jsx-async-runtime";

/** Minimal HTML parser for the tests (no DOM in Node): elements, attributes, text. */
function parse(html: string): NodeLike {
  const decode = (s: string) =>
    s
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&");
  const element = (name: string, attrs: Record<string, string> = {}) => ({
    nodeType: 1,
    nodeName: name.toUpperCase(),
    childNodes: [] as NodeLike[],
    get textContent(): string {
      return this.childNodes.map((c) => c.textContent).join("");
    },
    getAttribute: (key: string) => attrs[key] ?? null,
  });
  const root = element("div");
  const stack = [root];
  for (const [, close, name, attrText, text] of html.matchAll(
    /<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi,
  )) {
    const top = stack[stack.length - 1];
    if (text !== undefined) {
      top.childNodes.push({ nodeType: 3, nodeName: "#text", textContent: decode(text), childNodes: [] });
    } else if (close) {
      stack.pop();
    } else {
      const attrs = Object.fromEntries(
        [...attrText.matchAll(/([a-z-]+)="([^"]*)"/g)].map(([, k, v]) => [k, decode(v)]),
      );
      const el = element(name, attrs);
      top.childNodes.push(el);
      if (!/^(br|img)$/i.test(name) && !attrText.endsWith("/")) {
        stack.push(el);
      }
    }
  }
  return root;
}

const toMarkdown = (html: string) => htmlToMarkdown(parse(html));
const render = async (text: string) => jsxToString(RichText({ text }) as any) as Promise<string>;

test("markdown survives the round trip through the rendered HTML", async () => {
  for (const text of [
    "plain",
    "**bold** and *italic* text",
    "first paragraph\n\nsecond paragraph",
    "one line\nnext line",
    "- one\n- two with **bold**\n- [link](/about)",
    "intro\n\n- a\n- b\n\noutro",
    "see [the docs](https://example.com/docs?a=1&b=2) now",
    "**bold with [a link](/x) inside**",
    "aos***apo***sdi",
    "**a***b* c",
    "***a* b**",
    "*a* ***b*** *c*",
    "2 \\* 3 \\[not a link\\](/x) C:\\\\temp",
    "\\- not a list",
    "[label \\[1\\]](/x)",
    "**bold and *italic***",
    "mail [us](mailto:team@example.com)",
    "<script>stays text</script> & more",
  ]) {
    assert.equal(toMarkdown(await render(text)), text, text);
  }
});

test("markup from contenteditable becomes the format", () => {
  assert.equal(toMarkdown("<div>one</div><div>two</div>"), "one\n\ntwo");
  assert.equal(toMarkdown("loose text<p>para</p>"), "loose text\n\npara");
  assert.equal(toMarkdown("<p><b>b</b> <i>i</i></p>"), "**b** *i*");
  assert.equal(
    toMarkdown('<p><span style="font-weight: 700;">b</span><span style="font-style: italic">i</span></p>'),
    "**b***i*",
  );
  assert.equal(toMarkdown("<p>a&nbsp;b</p>"), "a b");
  assert.equal(toMarkdown("<p>line<br></p><p><br></p>"), "line");
  assert.equal(toMarkdown("<p><strong> b </strong>x</p>"), "**b** x");
  assert.equal(toMarkdown("<p><strong>a<br>b</strong></p>"), "**a**\n**b**");
  assert.equal(toMarkdown("<p><strong><strong>x</strong></strong></p>"), "**x**");
  assert.equal(toMarkdown("<div><p>nested</p><p>blocks</p></div>"), "nested\n\nblocks");
  assert.equal(toMarkdown("<h2>Heading</h2>"), "Heading");
  // bold inside italic is split into italic and bold italic runs
  assert.equal(toMarkdown("<p><em>a <b>b</b> c</em></p>"), "*a* ***b*** *c*");
  assert.equal(toMarkdown("<p>x <i><b>SQLite</b></i>.</p>"), "x ***SQLite***.");
});

test("typed markers are escaped, so they stay text", () => {
  assert.equal(toMarkdown("<p>2 * 3 = 6</p>"), "2 \\* 3 = 6");
  assert.equal(toMarkdown("<p>[x](/y)</p>"), "\\[x\\](/y)");
  assert.equal(toMarkdown("<p>C:\\temp</p>"), "C:\\\\temp");
  assert.equal(toMarkdown("<p>- not a list<br>- again</p>"), "\\- not a list\n\\- again");
  assert.equal(toMarkdown("<ul><li>- item</li></ul>"), "- - item");
  assert.equal(toMarkdown("<p><b>*</b></p>"), "**\\***");
});

test("lists are flattened to one level of single lines", () => {
  assert.equal(toMarkdown("<ol><li>a</li><li>b</li></ol>"), "- a\n- b");
  assert.equal(toMarkdown("<ul><li>a<ul><li>b</li></ul></li></ul>"), "- a\n- b");
  assert.equal(toMarkdown("<ul><li>a<br>b</li><li><br></li></ul>"), "- a b");
});

test("links the format can't hold keep their label only", () => {
  assert.equal(toMarkdown('<p><a href="javascript:alert(1)">x</a></p>'), "x");
  assert.equal(toMarkdown('<p><a href="/a b">x</a></p>'), "x");
  assert.equal(toMarkdown('<p><a href="/x">[x]</a></p>'), "[\\[x\\]](/x)");
  assert.equal(toMarkdown('<p><a href="/x"><b>bold</b> label</a></p>'), "[bold label](/x)");
  assert.equal(toMarkdown('<p>go <a href="/x"> here </a>!</p>'), "go [here](/x) !");
});
