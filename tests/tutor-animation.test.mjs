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
const tutorial = await readFile(
  new URL("../src/components/TutorialModule.vue", import.meta.url),
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
  assert.match(server, /不得输出 JavaScript、HTML 或任意可执行 Three\.js 代码/);
  assert.match(server, /animation_offer/);
  assert.match(server, /事实准确性优先于回答完整度/);
  assert.match(server, /CUDA Programming Guide: https:\/\/docs\.nvidia\.com/);
  assert.match(server, /答疑动画必须使用 template=generated-scene/);

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

test("animation output accepts fixed templates and validated generated scenes", () => {
  for (const template of [
    "pointer-memory",
    "memory-coalescing",
    "thread-grid",
    "warp-divergence",
    "collective-ring",
    "tensor-layout",
    "reduction-tree",
    "matrix-multiply",
    "pipeline-buffer",
    "attention-flow",
    "online-softmax",
    "generated-scene",
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

  const generatedScene = cleanAnimation({
    template: "generated-scene",
    title: "数值写入矩阵",
    caption: "代码和对象同步。",
    code: "int a = 8;\nmatrix[2][3] = a;",
    language: "cpp",
    objects: [
      {
        id: "matrix",
        shape: "matrix",
        label: "matrix",
        position: [0, 0, 0],
        color: "#dce7e1",
        size: [0.4, 0.4, 0.4],
        rows: 5,
        columns: 5,
      },
      {
        id: "value",
        shape: "sphere",
        label: "8",
        position: [-2, 1, 0],
        color: "#d2913d",
        size: [0.3, 0.3, 0.3],
      },
    ],
    steps: [
      {
        label: "定义",
        narration: "变量保存 8。",
        codeLines: [1],
        actions: [{ target: "value", pulse: true }],
      },
      {
        label: "写入",
        narration: "8 移入 matrix[2][3]。",
        codeLines: [2],
        actions: [{ target: "value", position: [1, 0, 0] }],
      },
    ],
  });
  assert.equal(generatedScene?.template, "generated-scene");
  assert.equal(generatedScene?.objects[0].rows, 5);
  assert.equal(generatedScene?.steps[1].actions[0].target, "value");
});

test("learning animation provides controls and reduced-motion support", () => {
  assert.match(animation, /WebGLRenderer/);
  assert.match(animation, /prefers-reduced-motion/);
  assert.match(animation, /ResizeObserver/);
  assert.match(animation, /const speed = ref\(0\.5\)/);
  assert.match(animation, /exampleCode\?: string/);
  assert.match(animation, /isActiveCodeLine/);
  assert.match(animation, /代码与场景同步/);
  assert.match(animation, /axisLabels/);
  assert.match(animation, /\["0", "1", "2", "3", "4"\]/);
  assert.match(animation, /buildMatrixMultiply/);
  assert.match(animation, /buildReductionTree/);
  assert.match(animation, /buildPipelineBuffer/);
  assert.match(animation, /buildAttentionFlow/);
  assert.match(animation, /buildOnlineSoftmax/);
  assert.match(animation, /buildGeneratedScene/);
  assert.match(animation, /generatedObject/);
  assert.match(animation, /textSprite/);
  assert.match(animation, /暂停动画/);
  assert.match(animation, /上一步/);
  assert.match(animation, /下一步/);
  assert.match(animation, /disposeRoot/);
});

test("lesson animations appear only after a matching code example", () => {
  assert.match(tutorial, /const animationPlacement = computed/);
  assert.match(tutorial, /selectedLesson\.value\.animation/);
  assert.doesNotMatch(tutorial, /animationForLesson/);
  assert.doesNotMatch(animationTypes, /animationForLesson/);
  assert.match(tutorial, /block\.type === "code"/);
  assert.match(tutorial, /\/示例\|代码\|实验\|实现\//);
  assert.match(
    tutorial,
    /animationPlacement\?\.sectionId === section\.id/,
  );
  assert.match(tutorial, /:example-code="animationPlacement\.code"/);

  const objectivesPosition = tutorial.indexOf("lesson-objectives");
  const contentPosition = tutorial.indexOf("<ContentBlocks");
  const animationPosition = tutorial.lastIndexOf("<LearningAnimation");
  assert.ok(contentPosition > objectivesPosition);
  assert.ok(animationPosition > contentPosition);
});

test("tutorial prose uses topic-specific teaching structures and worked examples", () => {
  assert.doesNotMatch(generated, /先用通俗的话讲明白/);
  assert.doesNotMatch(curated, /先把概念说清楚/);
  assert.match(curated, /title: "概念"/);
  assert.match(curated, /title: "示例"/);
  assert.match(generated, /minimumExampleForTopic/);
  assert.match(generated, /理解提示/);
  assert.match(curated, /理解提示/);
  assert.match(generated, /familySectionTitles/);
  assert.match(generated, /"数学定义与数值范围"/);
  assert.match(generated, /"地址与存储模型"/);
  assert.match(generated, /"参与者和数据变化"/);
  assert.match(generated, /cohesiveUnits/);
  assert.doesNotMatch(generated, /把问题拆成四个检查点/);
  assert.doesNotMatch(generated, /原课程要求，逐项落实/);
  assert.match(generated, /let animationAssigned = false/);
});
