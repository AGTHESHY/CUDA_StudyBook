import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  cleanAnimation,
  cleanTutorResponse,
} from "../server/chat-api.mjs";

const server = await readFile(
  new URL("../server/chat-api.mjs", import.meta.url),
  "utf8",
);
const tutor = await readFile(
  new URL("../src/components/LlmTutor.vue", import.meta.url),
  "utf8",
);
const animation = await readFile(
  new URL("../src/components/LearningAnimation.vue", import.meta.url),
  "utf8",
);
const animationTypes = await readFile(
  new URL("../src/animations/types.ts", import.meta.url),
  "utf8",
);
const generated = await readFile(
  new URL("../src/tutorials/generated-weeks.ts", import.meta.url),
  "utf8",
);
const curated = await readFile(
  new URL("../src/tutorials/weeks-two-to-eight.ts", import.meta.url),
  "utf8",
);

test("DeepSeek tutor requests and validates JSON output", () => {
  assert.match(server, /response_format: \{ type: "json_object" \}/);
  assert.match(server, /你必须输出一个合法 json 对象/);
  assert.match(server, /const cleanTutorResponse/);
  assert.match(server, /const cleanAnimation/);
  assert.match(server, /不得输出 JavaScript、Three\.js 代码/);
  assert.match(server, /animation_offer/);

  assert.deepEqual(
    cleanTutorResponse(
      JSON.stringify({
        kind: "animation_offer",
        message: "需要动画吗？",
        animation: null,
      }),
    ),
    {
      kind: "animation_offer",
      message: "需要动画吗？",
    },
  );
});

test("animation output is limited to fixed scene templates", () => {
  for (const template of [
    "pointer-memory",
    "memory-coalescing",
    "thread-grid",
    "warp-divergence",
    "collective-ring",
    "tensor-layout",
  ]) {
    assert.match(server, new RegExp(`"${template}"`));
    assert.match(animationTypes, new RegExp(`"${template}"`));
  }
  assert.doesNotMatch(tutor, /eval\(|new Function|innerHTML\s*=/);
  assert.match(tutor, /parseLearningAnimation/);
  assert.match(tutor, /需要，用动画展示/);
  assert.equal(
    cleanAnimation({
      template: "arbitrary-javascript",
      title: "危险场景",
      caption: "不应通过",
    }),
    undefined,
  );
  assert.deepEqual(
    cleanAnimation({
      template: "pointer-memory",
      title: "指针与地址",
      caption: "逐步观察对象地址。",
    }),
    {
      template: "pointer-memory",
      title: "指针与地址",
      caption: "逐步观察对象地址。",
    },
  );
});

test("learning animation provides controls and reduced-motion support", () => {
  assert.match(animation, /WebGLRenderer/);
  assert.match(animation, /prefers-reduced-motion/);
  assert.match(animation, /ResizeObserver/);
  assert.match(animation, /暂停动画/);
  assert.match(animation, /上一步/);
  assert.match(animation, /下一步/);
  assert.match(animation, /disposeRoot/);
});

test("tutorial prose uses concise concept headings and adds minimum examples", () => {
  assert.doesNotMatch(generated, /先用通俗的话讲明白/);
  assert.doesNotMatch(curated, /先把概念说清楚/);
  assert.match(generated, /title: "概念"/);
  assert.match(curated, /title: "概念"/);
  assert.match(generated, /title: "最小示例"/);
  assert.match(curated, /title: "示例"/);
  assert.match(generated, /minimumExampleForTopic/);
  assert.match(generated, /理解提示/);
  assert.match(curated, /理解提示/);
});
