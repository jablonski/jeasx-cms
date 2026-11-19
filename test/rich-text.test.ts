import assert from "node:assert/strict";
import { test } from "node:test";
import RichText from "@cms/render/rich-text";
import { jsxToString } from "jsx-async-runtime";

const render = (text: string) => jsxToString(RichText({ text }) as any);

test("RichText formats paragraphs, lists and inline styles", async () => {
  assert.equal(
    await render("**b** and *i*\n\nnext"),
    "<p><strong>b</strong> and <em>i</em></p><p>next</p>",
  );
  assert.equal(await render("- one\n- two"), "<ul><li>one</li><li>two</li></ul>");
  assert.equal(await render("[site](/about)"), '<p><a href="/about">site</a></p>');
});

test("RichText never outputs raw HTML or unsafe links", async () => {
  assert.equal(await render("<script>x</script>"), "<p>&lt;script&gt;x&lt;/script&gt;</p>");
  assert.doesNotMatch(await render("[click](javascript:alert(1))"), /href/);
});

test("a backslash keeps markers as text", async () => {
  assert.equal(await render("2 \\* 3 \\*x\\*"), "<p>2 * 3 *x*</p>");
  assert.equal(await render("\\[a\\](/b)"), "<p>[a](/b)</p>");
  assert.equal(await render("**a \\** b**"), "<p><strong>a ** b</strong></p>");
  assert.equal(await render("\\- one\n\\- two"), "<p>- one<br>- two</p>");
  assert.equal(await render("C:\\\\temp \\x"), "<p>C:\\temp \\x</p>");
  assert.equal(await render("[a \\] b](/c)"), '<p><a href="/c">a ] b</a></p>');
});

test("rich text with many unclosed markers renders in linear time", async () => {
  const size = 300_000;
  for (const unit of ["[", "*", "**a", "[a](", "[a]", "[a](b ", "\\*", "\\", "*\\"]) {
    const started = performance.now();
    await render(unit.repeat(Math.ceil(size / unit.length)));
    assert.ok(performance.now() - started < 3000, `too slow for ${unit}`);
  }
});

test("rich text keeps its inline formats", async () => {
  assert.equal(
    await render("**b** *i* [l](/u) ***x*** [](/u) [a](b c)"),
    '<p><strong>b</strong> <em>i</em> <a href="/u">l</a> <strong><em>x</em></strong> [](/u) [a](b c)</p>',
  );
  assert.equal(await render("[x](javascript:alert(1))"), "<p>x)</p>");
});
