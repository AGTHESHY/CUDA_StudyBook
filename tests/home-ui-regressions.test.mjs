import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styles = await readFile(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);
const threeHero = await readFile(
  new URL("../src/components/ThreeHero.vue", import.meta.url),
  "utf8",
);

test("wide topbar keeps its actions aligned to the right edge", () => {
  assert.match(
    styles,
    /grid-template-columns:\s*minmax\(220px, 1fr\)\s+minmax\(260px, 640px\)\s+minmax\(220px, 1fr\)/,
  );
  assert.match(styles, /\.top-actions\s*\{[^}]*justify-self:\s*end/s);
});

test("home sphere does not catch up time accumulated while hidden", () => {
  assert.match(threeHero, /document\.addEventListener\("visibilitychange"/);
  assert.match(threeHero, /document\.hidden/);
  assert.match(threeHero, /lastFrameTime = undefined/);
  assert.match(threeHero, /Math\.min\(\(frameTime - lastFrameTime\) \/ 1000, 0\.05\)/);
  assert.doesNotMatch(threeHero, /getElapsedTime/);
});
