import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/tutorials/week-one-book.ts", import.meta.url),
  "utf8",
);

test("week one explains every assigned Effective Modern C++ item", () => {
  const actual = [...source.matchAll(/^\s+item: (\d+),$/gm)].map((match) =>
    Number(match[1]),
  );
  assert.deepEqual(actual, [
    1, 2, 3, 4, 5, 6, 7, 8, 17, 18, 19, 20, 21, 22, 23, 37, 38, 39,
  ]);
});

test("book recommendations are consolidated outside item lessons", async () => {
  assert.doesNotMatch(source, /readingNote:/);
  const recommendations = await readFile(
    new URL("../src/components/BookRecommendations.vue", import.meta.url),
    "utf8",
  );
  assert.match(recommendations, /推荐书籍/);
  assert.match(recommendations, /Effective Modern C\+\+/);
});

test("week one includes six engineering foundation lessons", async () => {
  const foundations = await readFile(
    new URL("../src/tutorials/week-one-foundations.ts", import.meta.url),
    "utf8",
  );
  assert.equal(
    [...foundations.matchAll(/^\s+"w01-foundation-[a-z-]+",$/gm)].length,
    6,
  );
  assert.doesNotMatch(foundations, /科班/);
});
