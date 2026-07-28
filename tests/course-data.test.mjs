import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const course = JSON.parse(
  await readFile(new URL("../src/course-data.json", import.meta.url), "utf8"),
);

test("contains the complete 52-week curriculum", () => {
  assert.equal(course.weeks.length, 52);
  assert.deepEqual(
    course.weeks.map((week) => week.week),
    Array.from({ length: 52 }, (_, index) => index + 1),
  );
});

test("all weeks belong to a stage and contain material", () => {
  assert.equal(course.stages.length, 10);
  for (const week of course.weeks) {
    assert.ok(week.stageId);
    assert.ok(week.sections.length > 0, `week ${week.week} has no sections`);
  }
});
