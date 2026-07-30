<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, ref, watch } from "vue";
import {
  parseLearningAnimation,
  type LearningAnimationSpec,
} from "../animations/types";
import type { CourseWeek } from "../types";
import { renderMarkdown } from "../utils/markdown";

const LearningAnimation = defineAsyncComponent(
  () => import("./LearningAnimation.vue"),
);

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  kind?: "answer" | "animation_offer" | "animation";
  animation?: LearningAnimationSpec;
};

const props = defineProps<{
  week: CourseWeek;
  scope: "lesson" | "week";
  scopeId: string;
  scopeTitle: string;
  context?: string;
}>();

const messages = ref<ChatMessage[]>([]);
const draft = ref("");
const busy = ref(false);
const error = ref("");
const chatEnd = ref<HTMLElement | null>(null);

const storageKey = computed(
  () => `cuda52:tutor:week-${props.week.week}:${props.scopeId}:v3`,
);
const isWeekScope = computed(() => props.scope === "week");
const scopeLabel = computed(() => (isWeekScope.value ? "本周" : "本节"));
const suggestions = computed(() =>
  isWeekScope.value
    ? ["用三句话总结本周核心", "解释本周验收标准", "给我一道本周验收题"]
    : ["用三句话总结本节核心", "解释本节最容易混淆的概念", "这个概念能用动画解释吗？"],
);

const weekContext = computed(() =>
  props.week.sections
    .map((section) => {
      const content = section.blocks
        .flatMap((block) => {
          if (block.type === "list") return block.items;
          if ("text" in block) return [block.text];
          return [];
        })
        .join("\n");
      return `## ${section.title}\n${content}`;
    })
    .join("\n\n"),
);
const activeContext = computed(
  () => props.context?.trim() || weekContext.value,
);

const loadHistory = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey.value) || "[]");
    messages.value = Array.isArray(stored)
      ? stored.slice(-20).flatMap((value) => {
          if (!value || typeof value !== "object") return [];
          const role = value.role === "assistant" ? "assistant" : "user";
          const content = String(value.content || "").slice(0, 12_000);
          if (!content.trim()) return [];
          const animation = parseLearningAnimation(value.animation);
          const kind =
            value.kind === "animation" && animation
              ? "animation"
              : value.kind === "animation_offer"
                ? "animation_offer"
                : "answer";
          return [{ role, content, kind, ...(animation ? { animation } : {}) }];
        })
      : [];
  } catch {
    messages.value = [];
  }
  draft.value = "";
  error.value = "";
};

watch(storageKey, loadHistory, { immediate: true });

watch(
  messages,
  (value) => {
    localStorage.setItem(storageKey.value, JSON.stringify(value.slice(-20)));
  },
  { deep: true },
);

const scrollToEnd = async () => {
  await nextTick();
  chatEnd.value?.scrollIntoView({ behavior: "smooth", block: "nearest" });
};

const send = async (preset?: string) => {
  const content = String(preset ?? draft.value).trim();
  if (!content || busy.value) return;

  const userMessage: ChatMessage = { role: "user", content };
  messages.value.push(userMessage);
  draft.value = "";
  error.value = "";
  busy.value = true;
  await scrollToEnd();

  try {
    const response = await fetch("/llm-api/chat", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        week: props.week.week,
        title: props.scopeTitle,
        context: activeContext.value,
        messages: messages.value.slice(-12),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || `答疑服务错误（${response.status}）`);
    }
    const animation = parseLearningAnimation(data.animation);
    const kind =
      data.kind === "animation" && animation
        ? "animation"
        : data.kind === "animation_offer"
          ? "animation_offer"
          : "answer";
    messages.value.push({
      role: "assistant",
      content: String(data.message || "暂时没有得到有效回答。"),
      kind,
      ...(animation ? { animation } : {}),
    });
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "在线答疑暂时不可用";
  } finally {
    busy.value = false;
    await scrollToEnd();
  }
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    send();
  }
};

const clearHistory = () => {
  messages.value = [];
  localStorage.removeItem(storageKey.value);
  error.value = "";
};
</script>

<template>
  <section class="tutor-panel" aria-labelledby="tutor-title">
    <header class="tutor-header">
      <div class="tutor-mark">AI</div>
      <div>
        <span>WEEK {{ String(week.week).padStart(2, "0") }} · ONLINE OFFICE HOURS</span>
        <h2 id="tutor-title">{{ scopeLabel }}答疑</h2>
        <p>针对{{ scopeLabel }}内容、代码实现或不理解的概念，直接问助教。</p>
      </div>
      <div class="model-badge"><i /> deepseek-v4-pro</div>
    </header>

    <div class="tutor-body">
      <div v-if="!messages.length" class="tutor-empty">
        <strong>从一个具体问题开始。</strong>
        <p>
          我已经读过「{{ scopeTitle }}」的内容，会结合{{ scopeLabel }}知识点回答。
        </p>
        <div class="tutor-suggestions">
          <button v-for="suggestion in suggestions" :key="suggestion" @click="send(suggestion)">
            {{ suggestion }} <span>↗</span>
          </button>
        </div>
      </div>

      <div v-else class="chat-thread" aria-live="polite">
        <article
          v-for="(message, index) in messages"
          :key="index"
          :class="['chat-message', message.role]"
        >
          <span>{{ message.role === "user" ? "你" : "AI" }}</span>
          <div v-if="message.role === 'user'">{{ message.content }}</div>
          <div v-else class="assistant-response">
            <div
              class="markdown-body"
              v-html="renderMarkdown(message.content)"
            />
            <button
              v-if="message.kind === 'animation_offer'"
              class="animation-consent"
              :disabled="busy"
              @click="send('需要，请用动画展示你刚才解释的概念。')"
            >
              需要，用动画展示 →
            </button>
            <LearningAnimation
              v-if="message.animation"
              :spec="message.animation"
              compact
            />
          </div>
        </article>
        <article v-if="busy" class="chat-message assistant waiting">
          <span>AI</span>
          <div><i /><i /><i /></div>
        </article>
        <div ref="chatEnd" />
      </div>

      <div v-if="error" class="tutor-error" role="alert">
        {{ error }}
        <button @click="send(messages.at(-1)?.content)">重试</button>
      </div>

      <div class="tutor-composer">
        <textarea
          v-model="draft"
          rows="3"
          :disabled="busy"
          :placeholder="`问问${scopeLabel}「${scopeTitle}」的内容…`"
          aria-label="输入在线答疑问题"
          @keydown="onKeydown"
        />
        <div>
          <span>Enter 发送 · Shift + Enter 换行</span>
          <button v-if="messages.length" class="clear-chat" @click="clearHistory">清空</button>
          <button class="send-chat" :disabled="!draft.trim() || busy" @click="send()">
            {{ busy ? "思考中…" : "发送问题" }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
