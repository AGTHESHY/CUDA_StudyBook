<script setup lang="ts">
import { computed } from "vue";
import type { CourseWeek } from "../types";
import { referencesForWeek } from "../tutorials/generated-weeks";
import ContentBlocks from "./ContentBlocks.vue";

const props = defineProps<{ week: CourseWeek }>();

const readingSections = computed(() =>
  props.week.sections.filter((section) => /阅读|资料/.test(section.title)),
);
const references = computed(() => referencesForWeek(props.week.week));
</script>

<template>
  <section id="recommended-reading" class="book-page">
    <div class="book-page-kicker">
      WEEK {{ String(week.week).padStart(2, "0") }} · READING NOTES
    </div>
    <h2>推荐阅读</h2>
    <p class="book-page-lead">
      先完成本周教程与最小实验，再回到官方资料核对定义、边界和 API。
      阅读的产出应是可执行的笔记、反例或测试，不是只留下“看过”。
    </p>

    <section
      v-for="section in readingSections"
      :key="section.id"
      class="article-section reading-source-section"
    >
      <h2>{{ section.title }}</h2>
      <ContentBlocks :blocks="section.blocks" />
    </section>

    <article v-if="!readingSections.length" class="secondary-book">
      <div>
        <span>本周读法</span>
        <h3>先查定义，再对照实现</h3>
      </div>
      <ul>
        <li>从下方官方文档找到本周概念的定义与约束；</li>
        <li>对照自己的实现，记录一个此前忽略的边界条件；</li>
        <li>把边界条件补成测试，并在右侧笔记写下结果。</li>
      </ul>
    </article>

    <div class="reading-links">
      <a
        v-for="reference in references"
        :key="reference.url"
        :href="reference.url"
        target="_blank"
        rel="noreferrer"
      >
        <small>{{ reference.source }}</small>
        <strong>{{ reference.label }}</strong>
        <span>↗</span>
      </a>
    </div>

    <aside class="reading-method">
      <strong>推荐读法</strong>
      <p>
        带着一个具体问题进入文档，例如“这个 API 是否异步”“非连续 Tensor
        是否允许”“误差该如何定义”。找到答案后，立刻把它变成代码注释、测试或性能实验。
      </p>
    </aside>
  </section>
</template>

