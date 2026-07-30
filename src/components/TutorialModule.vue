<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from "vue";
import { animationForLesson } from "../animations/types";
import type { TutorialModule } from "../types";
import ContentBlocks from "./ContentBlocks.vue";

const LearningAnimation = defineAsyncComponent(
  () => import("./LearningAnimation.vue"),
);

const props = defineProps<{
  module: TutorialModule;
  lessonId: string;
  finalPageId?: string;
  finalPageLabel?: string;
  quizScores: Record<string, number>;
}>();

const emit = defineEmits<{
  saveQuiz: [lessonId: string, score: number];
  selectLesson: [lessonId: string];
}>();

const revealedHints = ref<Record<string, boolean>>({});
const revealedAnswers = ref<Record<string, boolean>>({});
const quizAnswers = ref<Record<string, number>>({});
const quizSubmitted = ref(false);

watch(
  () => props.lessonId,
  () => {
    quizAnswers.value = {};
    quizSubmitted.value = false;
  },
);

const selectedLesson = computed(
  () =>
    props.module.lessons.find((item) => item.id === props.lessonId) ??
    props.module.lessons[0],
);

const currentIndex = computed(() =>
  props.module.lessons.findIndex((item) => item.id === selectedLesson.value.id),
);
const animationPlacement = computed(() => {
  const spec = animationForLesson(
    selectedLesson.value.title,
    [
      selectedLesson.value.summary,
      ...selectedLesson.value.objectives,
    ].join("\n"),
  );
  if (!spec) return undefined;

  const codeSections = selectedLesson.value.sections.flatMap((section) =>
    section.blocks.flatMap((block) =>
      block.type === "code" ? [{ section, block }] : [],
    ),
  );
  const example =
    codeSections.find(({ section }) =>
      /示例|代码|实验|实现/.test(section.title),
    ) ?? codeSections[0];
  if (!example) return undefined;

  return {
    spec,
    sectionId: example.section.id,
    code: example.block.text,
    language: example.block.language,
  };
});

const quizScore = computed(() => {
  if (!quizSubmitted.value) return null;
  const questions = selectedLesson.value.quiz;
  if (!questions.length) return 100;
  const correct = questions.filter(
    (question) => quizAnswers.value[question.id] === question.answer,
  ).length;
  return Math.round((correct / questions.length) * 100);
});

const submitQuiz = () => {
  if (
    selectedLesson.value.quiz.some(
      (question) => quizAnswers.value[question.id] === undefined,
    )
  ) {
    return;
  }
  quizSubmitted.value = true;
  emit("saveQuiz", selectedLesson.value.id, quizScore.value ?? 0);
};

const selectRelative = (offset: number) => {
  const next = props.module.lessons[currentIndex.value + offset];
  if (next) emit("selectLesson", next.id);
  else if (offset > 0 && props.finalPageId) emit("selectLesson", props.finalPageId);
};
</script>

<template>
  <section id="deep-tutorial" class="tutorial-module">
    <article class="lesson-document">
      <div class="lesson-meta">
        <span>LESSON {{ String(currentIndex + 1).padStart(2, "0") }}</span>
        <span>{{ selectedLesson.duration }}</span>
        <span>{{ selectedLesson.level }}</span>
      </div>

      <div class="lesson-objectives">
        <strong>学完你能做到</strong>
        <ul>
          <li v-for="objective in selectedLesson.objectives" :key="objective">
            {{ objective }}
          </li>
        </ul>
      </div>

      <section
        v-for="section in selectedLesson.sections"
        :id="section.id"
        :key="section.id"
        class="article-section lesson-section"
      >
        <h2>{{ section.title }}</h2>
        <ContentBlocks :blocks="section.blocks" />
        <LearningAnimation
          v-if="animationPlacement?.sectionId === section.id"
          :spec="animationPlacement.spec"
          :example-code="animationPlacement.code"
          :example-language="animationPlacement.language"
        />
      </section>

      <section class="practice-section">
        <div class="practice-heading">
          <span>练习</span>
          <h2>先作答，再看提示和答案</h2>
        </div>
        <article
          v-for="(exercise, index) in selectedLesson.exercises"
          :key="exercise.id"
          class="exercise-card"
        >
          <div class="exercise-number">{{ index + 1 }}</div>
          <p>{{ exercise.prompt }}</p>
          <div class="exercise-actions">
            <button
              @click="
                revealedHints[exercise.id] = !revealedHints[exercise.id]
              "
            >
              {{ revealedHints[exercise.id] ? "收起提示" : "显示提示" }}
            </button>
            <button
              @click="
                revealedAnswers[exercise.id] = !revealedAnswers[exercise.id]
              "
            >
              {{ revealedAnswers[exercise.id] ? "收起答案" : "核对答案" }}
            </button>
          </div>
          <div v-if="revealedHints[exercise.id]" class="exercise-reveal hint">
            <strong>提示</strong>{{ exercise.hint }}
          </div>
          <div v-if="revealedAnswers[exercise.id]" class="exercise-reveal">
            <strong>参考答案</strong>{{ exercise.answer }}
          </div>
        </article>
      </section>

      <section class="quiz-section">
        <div class="practice-heading">
          <span>测验</span>
          <h2>检查是否真的理解</h2>
        </div>
        <fieldset
          v-for="(question, questionIndex) in selectedLesson.quiz"
          :key="question.id"
          class="quiz-card"
        >
          <legend>{{ questionIndex + 1 }}. {{ question.question }}</legend>
          <label
            v-for="(option, optionIndex) in question.options"
            :key="option"
            :class="{
              correct: quizSubmitted && optionIndex === question.answer,
              wrong:
                quizSubmitted &&
                quizAnswers[question.id] === optionIndex &&
                optionIndex !== question.answer,
            }"
          >
            <input
              v-model="quizAnswers[question.id]"
              type="radio"
              :name="question.id"
              :value="optionIndex"
              :disabled="quizSubmitted"
            />
            <span>{{ option }}</span>
          </label>
          <p v-if="quizSubmitted">{{ question.explanation }}</p>
        </fieldset>
        <div class="quiz-submit">
          <button
            :disabled="
              quizSubmitted ||
              selectedLesson.quiz.some(
                (question) => quizAnswers[question.id] === undefined,
              )
            "
            @click="submitQuiz"
          >
            {{ quizSubmitted ? "已提交" : "提交测验" }}
          </button>
          <strong v-if="quizScore !== null">得分 {{ quizScore }}%</strong>
          <small v-else-if="quizScores[selectedLesson.id] !== undefined">
            历史最佳 {{ quizScores[selectedLesson.id] }}%
          </small>
        </div>
      </section>

      <section class="lesson-references">
        <div>
          <span>资料与校验</span>
          <h2>继续阅读</h2>
          <p>{{ selectedLesson.verification }}</p>
        </div>
        <a
          v-for="reference in selectedLesson.references"
          :key="reference.url"
          :href="reference.url"
          target="_blank"
          rel="noreferrer"
        >
          <small>{{ reference.source }}</small>
          <strong>{{ reference.label }}</strong>
          <span>↗</span>
        </a>
      </section>

      <div class="lesson-footer">
        <div>
          <button :disabled="currentIndex === 0" @click="selectRelative(-1)">
            ← 上一节
          </button>
          <button
            :disabled="
              currentIndex === module.lessons.length - 1 && !finalPageId
            "
            @click="selectRelative(1)"
          >
            {{
              currentIndex === module.lessons.length - 1 && finalPageId
                ? `${finalPageLabel || "推荐阅读"} →`
                : "下一节 →"
            }}
          </button>
        </div>
      </div>
    </article>
  </section>
</template>
