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

test("week one roadmap is a final standalone page", async () => {
  const app = await readFile(
    new URL("../src/App.vue", import.meta.url),
    "utf8",
  );

  assert.match(app, /const WEEKLY_PAGE_ID = "weekly-roadmap"/);
  assert.match(app, /!selectedTutorial \|\| isWeeklyRoadmapPage/);
  assert.match(app, /本周课程表与验收 →/);
});

test("tutor switches between lesson and weekly scope", async () => {
  const tutor = await readFile(
    new URL("../src/components/LlmTutor.vue", import.meta.url),
    "utf8",
  );

  assert.match(tutor, /props\.scope === "week"/);
  assert.match(tutor, /"本周" : "本节"/);
  assert.match(tutor, /props\.scopeId/);
});

test("all 52 weeks receive tutorial modules and final pages", async () => {
  const generated = await readFile(
    new URL("../src/tutorials/generated-weeks.ts", import.meta.url),
    "utf8",
  );
  const tutorialData = await readFile(
    new URL("../src/tutorial-data.ts", import.meta.url),
    "utf8",
  );
  const app = await readFile(
    new URL("../src/App.vue", import.meta.url),
    "utf8",
  );

  assert.match(generated, /course\.weeks\.map/);
  assert.match(generated, /buildGeneratedTutorialModule/);
  assert.match(generated, /Online Softmax/);
  assert.match(generated, /CUTLASS 把 GEMM 分解/);
  assert.match(generated, /NCCL Collective/);
  assert.match(tutorialData, /generatedTutorialModules\.map/);
  assert.match(app, /:final-page-id="READING_PAGE_ID"/);
  assert.match(app, /selectTutorialPage\(WEEKLY_PAGE_ID\)/);
});

test("logged-in learners resume the last page while guests start at week one", async () => {
  const app = await readFile(
    new URL("../src/App.vue", import.meta.url),
    "utf8",
  );
  const types = await readFile(
    new URL("../src/types.ts", import.meta.url),
    "utf8",
  );

  assert.match(app, /if \(!session\.value\) return \{ week: 1, page: ""/);
  assert.match(app, /progress\.value\.currentPage = pageId/);
  assert.match(types, /currentPage: string/);
});

test("article header describes the current page instead of tutorial boilerplate", async () => {
  const app = await readFile(
    new URL("../src/App.vue", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(app, /本周已提供教材级深度教程/);
  assert.match(app, /selectedTutorialLesson\.value\.summary/);
  assert.match(app, /汇总本周需要完成的实现、测试、性能分析与验收标准/);
});
