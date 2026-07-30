import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/tutorials/week-one-book.ts", import.meta.url),
  "utf8",
);
const curatedWeeksSource = await readFile(
  new URL("../src/tutorials/weeks-two-to-eight.ts", import.meta.url),
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

test("weekly roadmap separates reading and groups the plan into cards", async () => {
  const app = await readFile(
    new URL("../src/App.vue", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../src/styles.css", import.meta.url),
    "utf8",
  );

  assert.match(app, /const weeklyReviewLessons = computed/);
  assert.match(app, /weeklyEngineeringTasks/);
  assert.match(app, /weeklyAcceptanceTasks/);
  assert.match(app, /class="article-section weekly-roadmap-card"/);
  assert.match(app, /class="weekly-brief-stats"/);
  assert.match(app, /id="weekly-course-review"/);
  assert.match(app, /id="weekly-acceptance-review"/);
  assert.match(styles, /\.weekly-roadmap-grid/);
  assert.match(styles, /\.weekly-roadmap-card\.acceptance/);
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
  assert.match(generated, /const cohesiveUnits/);
  assert.match(generated, /Math\.min\(7/);
  assert.match(generated, /launch error 与异步执行错误/);
  assert.match(generated, /opcheck\/gradcheck/);
  assert.match(generated, /预热、同步与重复统计/);
  assert.match(generated, /Collective 次序、count、dtype/);
  assert.match(tutorialData, /generatedTutorialModules\.map/);
  assert.match(app, /:final-page-id="READING_PAGE_ID"/);
  assert.match(app, /selectTutorialPage\(WEEKLY_PAGE_ID\)/);
});

test("every week begins with a chapter overview and removes repeated chapter names", async () => {
  const generated = await readFile(
    new URL("../src/tutorials/generated-weeks.ts", import.meta.url),
    "utf8",
  );
  const tutorialData = await readFile(
    new URL("../src/tutorial-data.ts", import.meta.url),
    "utf8",
  );

  assert.match(generated, /export const organizeTutorialModule/);
  assert.match(generated, /title: "本周导读"/);
  assert.match(generated, /removeChapterName\(lesson\.title, week\.title\)/);
  assert.match(generated, /title: "后续会学什么"/);
  assert.match(generated, /不新增未经来源支持的性能结论/);
  assert.match(tutorialData, /return organizeTutorialModule\(selected\)/);
});

test("lesson pages use the lesson title without repeating the chapter heading", async () => {
  const app = await readFile(
    new URL("../src/App.vue", import.meta.url),
    "utf8",
  );
  const tutorial = await readFile(
    new URL("../src/components/TutorialModule.vue", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../src/styles.css", import.meta.url),
    "utf8",
  );

  assert.match(app, /if \(selectedTutorialLesson\.value\) return selectedTutorialLesson\.value\.title/);
  assert.match(app, /<h1>\{\{ articleTitle \}\}<\/h1>/);
  assert.doesNotMatch(tutorial, /<h2>\{\{ selectedLesson\.title \}\}<\/h2>/);
  assert.match(
    styles,
    /\.weekly-roadmap-grid > \.weekly-roadmap-card:first-child/,
  );
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

test("home page states prerequisites and the complete course outcome", async () => {
  const app = await readFile(
    new URL("../src/App.vue", import.meta.url),
    "utf8",
  );

  assert.match(app, /一条可执行的路径<\/em>/);
  assert.doesNotMatch(app, /一条可执行的路径。<\/em>/);
  assert.match(app, /C\+\+17 基础/);
  assert.match(app, /不要求已有\s*CUDA 开发经验/);
  assert.match(app, /PyTorch 扩展、Triton、FlashAttention/);
  assert.match(app, /最终独立实现、验证并集成大模型 CUDA Kernel/);
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

test("weeks two through eight use compact hand-written lesson sequences", () => {
  const lessonCounts = new Map([
    ["Two", 8],
    ["Four", 6],
    ["Five", 6],
    ["Six", 7],
    ["Seven", 7],
    ["Eight", 6],
  ]);
  const weekNames = [...lessonCounts.keys()];

  for (const [index, weekName] of weekNames.entries()) {
    const start = curatedWeeksSource.indexOf(`const week${weekName}`);
    const end =
      index + 1 < weekNames.length
        ? curatedWeeksSource.indexOf(`const week${weekNames[index + 1]}`, start)
        : curatedWeeksSource.indexOf("export const curatedWeeks", start);
    const weekSource = curatedWeeksSource.slice(start, end);

    assert.notEqual(start, -1);
    assert.equal(
      [...weekSource.matchAll(/makeLesson\(\{/g)].length,
      lessonCounts.get(weekName),
    );
  }
});

test("new technical lessons cite only NVIDIA and PyTorch documentation", () => {
  const allowedHosts = new Set(["docs.nvidia.com", "docs.pytorch.org"]);
  const urls = [...curatedWeeksSource.matchAll(/url: "([^"]+)"/g)].map(
    (match) => match[1],
  );

  assert.ok(urls.length >= 10);
  for (const value of urls) {
    assert.ok(
      allowedHosts.has(new URL(value).hostname),
      `unexpected reference host: ${value}`,
    );
  }
  assert.match(curatedWeeksSource, /性能结论完全由记录环境中的实测证据决定/);
});

test("curated weeks replace generated pages without changing week one", async () => {
  const tutorialData = await readFile(
    new URL("../src/tutorial-data.ts", import.meta.url),
    "utf8",
  );

  assert.match(tutorialData, /curatedWeeksTwoToEight/);
  assert.match(
    tutorialData,
    /\[\.\.\.curatedTutorialModules, \.\.\.curatedWeeksTwoToEight\]/,
  );
  assert.match(
    tutorialData,
    /generated\.week === 1\s+\? weekOneBookModule/,
  );
});
