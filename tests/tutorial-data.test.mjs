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

test("every book item ends with a reading note", () => {
  assert.match(source, /readingNote:/);
  assert.match(source, /讲完本页再读《Effective Modern C\+\+》Item/);
});
