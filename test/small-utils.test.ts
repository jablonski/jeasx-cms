import { formatTime } from "@cms/browser/utils/format-time";
import { resultOf } from "@cms/core/result";
import assert from "node:assert/strict";
import { test } from "node:test";

test("resultOf names the item or explains what is missing", () => {
  assert.deepEqual(resultOf("page", { id: 1 }, "gone"), { page: { id: 1 } });
  assert.deepEqual(resultOf("page", undefined, "gone"), { error: "gone" });
  // Falsy items are still items.
  assert.deepEqual(resultOf("count", 0, "gone"), { count: 0 });
});

test("formatTime reads SQLite times as UTC and keeps text it can't parse", () => {
  const expected = new Date(Date.UTC(2026, 10, 17, 15, 12, 44)).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  assert.equal(formatTime("2026-11-17 15:12:44"), expected);
  assert.equal(formatTime("not a date"), "not a date");
  assert.equal(formatTime(""), "");
});
