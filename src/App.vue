<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import courseJson from "./course-data.json";
import AuthModal from "./components/AuthModal.vue";
import BookRecommendations from "./components/BookRecommendations.vue";
import ContentBlocks from "./components/ContentBlocks.vue";
import LlmTutor from "./components/LlmTutor.vue";
import TutorialModule from "./components/TutorialModule.vue";
import WeekReading from "./components/WeekReading.vue";
import { tutorialByWeek } from "./tutorial-data";
import type {
  CourseData,
  CourseSection,
  CourseWeek,
  StudyProgress,
  UserSession,
} from "./types";

const course = courseJson as CourseData;
const ThreeHero = defineAsyncComponent(() => import("./components/ThreeHero.vue"));
const API_BASE = (import.meta.env.VITE_SCRIPT_STORE_URL || "/store-api").replace(
  /\/$/,
  "",
);
const SESSION_KEY = "cuda52:session:v1";
const ANON_PROGRESS_KEY = "cuda52:anonymous-progress:v1";
const READING_PAGE_ID = "recommended-reading";
const WEEKLY_PAGE_ID = "weekly-roadmap";

const createProgress = (): StudyProgress => ({
  version: 3,
  completedWeeks: [],
  completedLessons: [],
  quizScores: {},
  currentWeek: 1,
  currentPage: "",
  notes: {},
  checklist: {},
  updatedAt: new Date().toISOString(),
});

const parseStored = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeProgress = (value: unknown): StudyProgress => {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<StudyProgress>;
  return {
    version: 3,
    completedWeeks: Array.isArray(raw.completedWeeks)
      ? raw.completedWeeks
          .map(Number)
          .filter((week) => Number.isInteger(week) && week >= 1 && week <= 52)
      : [],
    completedLessons: Array.isArray(raw.completedLessons)
      ? raw.completedLessons.filter((id): id is string => typeof id === "string")
      : [],
    quizScores:
      raw.quizScores && typeof raw.quizScores === "object"
        ? Object.fromEntries(
            Object.entries(raw.quizScores).filter(
              ([id, score]) =>
                typeof id === "string" &&
                typeof score === "number" &&
                score >= 0 &&
                score <= 100,
            ),
          )
        : {},
    currentWeek:
      Number.isInteger(raw.currentWeek) &&
      Number(raw.currentWeek) >= 1 &&
      Number(raw.currentWeek) <= 52
        ? Number(raw.currentWeek)
        : 1,
    currentPage: typeof raw.currentPage === "string" ? raw.currentPage : "",
    notes:
      raw.notes && typeof raw.notes === "object"
        ? (raw.notes as Record<string, string>)
        : {},
    checklist:
      raw.checklist && typeof raw.checklist === "object"
        ? (raw.checklist as Record<string, string[]>)
        : {},
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
};

const session = ref<UserSession | null>(null);
const progress = ref<StudyProgress>(createProgress());
const hydrated = ref(false);
const currentView = ref<"home" | "week">("home");
const selectedWeekNumber = ref(1);
const selectedTutorialPageId = ref("");
const collapsedTutorialWeeks = ref(new Set<number>());
const query = ref("");
const searchFocused = ref(false);
const sidebarOpen = ref(false);
const authOpen = ref(false);
const authMode = ref<"login" | "register">("login");
const authBusy = ref(false);
const authError = ref("");
const toast = ref("");
const syncing = ref(false);
let saveTimer: number | undefined;
let toastTimer: number | undefined;

const selectedWeek = computed(
  () =>
    course.weeks.find((item) => item.week === selectedWeekNumber.value) ??
    course.weeks[0],
);
const selectedStage = computed(() =>
  course.stages.find((item) => item.id === selectedWeek.value.stageId),
);
const selectedTutorial = computed(() =>
  tutorialByWeek.get(selectedWeekNumber.value),
);
const isReadingPage = computed(
  () =>
    Boolean(selectedTutorial.value) &&
    selectedTutorialPageId.value === READING_PAGE_ID,
);
const isWeeklyRoadmapPage = computed(
  () =>
    Boolean(selectedTutorial.value) &&
    selectedTutorialPageId.value === WEEKLY_PAGE_ID,
);
const selectedTutorialLesson = computed(() =>
  selectedTutorial.value?.lessons.find(
    (item) => item.id === selectedTutorialPageId.value,
  ),
);
const articleLead = computed(() => {
  if (selectedTutorialLesson.value) {
    return `当前小节「${selectedTutorialLesson.value.title}」：${selectedTutorialLesson.value.summary}`;
  }
  if (isReadingPage.value) {
    return selectedWeekNumber.value === 1
      ? "按类型推导、所有权、移动语义和并发主题回读本周书目，并把新增的边界条件整理成笔记与测试。"
      : "结合本周问题查阅官方资料，核对概念定义、API 约束和实现边界。";
  }
  if (isWeeklyRoadmapPage.value) {
    return "汇总本周需要完成的实现、测试、性能分析与验收标准，用工程证据决定是否进入下一周。";
  }
  return `本周围绕「${selectedWeek.value.title}」完成概念学习、工程实现和结果验证。`;
});
const stringifySections = (sections: CourseSection[]) =>
  sections
    .map((section) => {
      const body = section.blocks
        .flatMap((block) =>
          block.type === "list" ? block.items : block.text ? [block.text] : [],
        )
        .join("\n");
      return `## ${section.title}\n${body}`;
    })
    .join("\n\n");
const tutorConfig = computed(() => {
  if (!selectedTutorial.value || isWeeklyRoadmapPage.value) {
    return {
      scope: "week" as const,
      scopeId: WEEKLY_PAGE_ID,
      scopeTitle: `${selectedWeek.value.title} · 本周课程表与验收`,
      context: "",
    };
  }
  if (isReadingPage.value) {
    const readingSections = selectedWeek.value.sections.filter((section) =>
      /阅读|资料/.test(section.title),
    );
    return {
      scope: "lesson" as const,
      scopeId: READING_PAGE_ID,
      scopeTitle: "推荐书籍与阅读方法",
      context:
        selectedWeekNumber.value === 1
          ? [
              "本节是第 1 周的推荐阅读页。",
              "主读《Effective Modern C++》Item 1—8、17—23、37—39。",
              "补充阅读《深入理解计算机系统》第 3、5、6 章与第 7 章前半。",
              "阅读原则：先完成教程和练习，再按薄弱点阅读对应章节，并把新增边界条件记入学习笔记。",
            ].join("\n")
          : [
              `本节是第 ${selectedWeekNumber.value} 周的推荐阅读页。`,
              stringifySections(readingSections),
              "阅读原则：带着具体问题查官方资料，把答案转成代码注释、测试或性能实验。",
            ].join("\n\n"),
    };
  }
  const lesson = selectedTutorialLesson.value;
  return {
    scope: "lesson" as const,
    scopeId: lesson?.id ?? selectedTutorialPageId.value,
    scopeTitle: lesson?.title ?? selectedWeek.value.title,
    context: lesson
      ? [
          lesson.summary,
          `学习目标：\n${lesson.objectives.join("\n")}`,
          stringifySections(lesson.sections),
          `练习：\n${lesson.exercises.map((item) => item.prompt).join("\n")}`,
        ].join("\n\n")
      : "",
  };
});
const completedTutorialLessons = computed(
  () =>
    selectedTutorial.value?.lessons.filter((item) =>
      progress.value.completedLessons.includes(item.id),
    ).length ?? 0,
);
const completedCount = computed(() => new Set(progress.value.completedWeeks).size);
const percentComplete = computed(() =>
  Math.round((completedCount.value / course.weeks.length) * 100),
);
const homeStart = computed(() => {
  if (!session.value) return { week: 1, page: "", label: "从第 1 周开始" };
  const week = Math.min(52, Math.max(1, progress.value.currentWeek || 1));
  return {
    week,
    page: progress.value.currentPage || "",
    label: `继续第 ${week} 周`,
  };
});
const filteredWeeks = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return [];
  return course.weeks
    .filter(
      (week) =>
        week.searchText.includes(needle) ||
        tutorialByWeek
          .get(week.week)
          ?.lessons.some(
            (lesson) =>
              lesson.title.toLowerCase().includes(needle) ||
              lesson.summary.toLowerCase().includes(needle) ||
              lesson.sections.some((section) =>
                section.blocks.some((block) =>
                  ("text" in block ? block.text : "items" in block ? block.items.join(" ") : "")
                    .toLowerCase()
                    .includes(needle),
                ),
              ),
          ) ||
        `第 ${week.week} 周`.includes(needle),
    )
    .slice(0, 10);
});
const currentTasks = computed(() => {
  const taskSections = selectedWeek.value.sections.filter((section) =>
    /任务|实现|实验|验收|项目|要求/.test(section.title),
  );
  return taskSections.flatMap((section) =>
    section.blocks.flatMap((block, blockIndex) => {
      if (block.type !== "list") return [];
      return block.items.map((text, itemIndex) => ({
        key: `${section.id}:${blockIndex}:${itemIndex}`,
        text,
        section: section.title,
      }));
    }),
  );
});
const weekChecklist = computed(
  () => progress.value.checklist[String(selectedWeekNumber.value)] ?? [],
);
const isWeekComplete = computed(() =>
  progress.value.completedWeeks.includes(selectedWeekNumber.value),
);

const showToast = (message: string) => {
  toast.value = message;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.value = "";
  }, 2800);
};

const api = async <T,>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
  } = {},
): Promise<T> => {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message =
      data?.detail?.message ?? data?.message ?? `连接失败（${response.status}）`;
    throw new Error(message);
  }
  return data as T;
};

const saveRemote = async () => {
  if (!session.value) return;
  syncing.value = true;
  try {
    const payload = {
      ...progress.value,
      updatedAt: new Date().toISOString(),
    };
    await api(`/api/collections/cuda_progress/docs/${encodeURIComponent(session.value.userKey)}`, {
      method: "PUT",
      body: payload,
      token: session.value.token,
    });
  } catch (error) {
    showToast(error instanceof Error ? `同步失败：${error.message}` : "同步失败");
  } finally {
    syncing.value = false;
  }
};

const scheduleSave = () => {
  if (!hydrated.value) return;
  if (!session.value) {
    localStorage.setItem(
      ANON_PROGRESS_KEY,
      JSON.stringify({
        ...progress.value,
        updatedAt: new Date().toISOString(),
      }),
    );
    return;
  }
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveRemote, 500);
};

watch(progress, scheduleSave, { deep: true });

const loadUserProgress = async () => {
  if (!session.value) return;
  syncing.value = true;
  try {
    const response = await api<{
      data: StudyProgress | null;
      missing?: boolean;
    }>(
      `/api/collections/cuda_progress/docs/${encodeURIComponent(session.value.userKey)}`,
      { token: session.value.token },
    );
    if (response.data) {
      progress.value = normalizeProgress(response.data);
    } else {
      await saveRemote();
    }
  } catch (error) {
    if (error instanceof Error && /token|登录|401/.test(error.message)) {
      logout(false);
    }
    throw error;
  } finally {
    syncing.value = false;
  }
};

const submitAuth = async (payload: {
  mode: "login" | "register";
  username: string;
  password: string;
}) => {
  authBusy.value = true;
  authError.value = "";
  try {
    const auth = await api<UserSession & { createdAt: string }>(
      `/api/auth/${payload.mode}`,
      {
        method: "POST",
        body: {
          username: payload.username,
          password: payload.password,
        },
      },
    );
    session.value = {
      username: auth.username,
      userKey: auth.userKey,
      token: auth.token,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session.value));
    await loadUserProgress();
    authOpen.value = false;
    showToast(payload.mode === "login" ? "已登录，学习进度已同步" : "账号已创建，开始学习吧");
  } catch (error) {
    authError.value = error instanceof Error ? error.message : "登录失败";
  } finally {
    authBusy.value = false;
  }
};

function logout(notify = true) {
  session.value = null;
  localStorage.removeItem(SESSION_KEY);
  progress.value = normalizeProgress(
    parseStored(ANON_PROGRESS_KEY, createProgress()),
  );
  if (notify) showToast("已退出登录");
}

const openAuth = (mode: "login" | "register" = "login") => {
  authMode.value = mode;
  authError.value = "";
  authOpen.value = true;
};

const openWeek = (week: number, requestedPageId = "") => {
  const resolved = Math.min(52, Math.max(1, week));
  const tutorial = tutorialByWeek.get(resolved);
  const pageExists =
    tutorial?.lessons.some((item) => item.id === requestedPageId) ||
    (Boolean(tutorial) &&
      [READING_PAGE_ID, WEEKLY_PAGE_ID].includes(requestedPageId));
  const pageId = pageExists
    ? requestedPageId
    : (tutorial?.lessons[0]?.id ?? "");
  selectedWeekNumber.value = resolved;
  selectedTutorialPageId.value = pageId;
  currentView.value = "week";
  progress.value.currentWeek = resolved;
  progress.value.currentPage = pageId;
  sidebarOpen.value = false;
  query.value = "";
  window.history.replaceState(
    null,
    "",
    pageId ? `#week-${resolved}/${pageId}` : `#week-${resolved}`,
  );
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const selectTutorialPage = (pageId: string) => {
  selectedTutorialPageId.value = pageId;
  progress.value.currentPage = pageId;
  sidebarOpen.value = false;
  window.history.replaceState(
    null,
    "",
    `#week-${selectedWeekNumber.value}/${pageId}`,
  );
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const isTutorialMenuExpanded = (week: number) =>
  week === selectedWeekNumber.value &&
  !collapsedTutorialWeeks.value.has(week);

const handleWeekNavigation = (week: number) => {
  if (
    week === selectedWeekNumber.value &&
    tutorialByWeek.has(week)
  ) {
    const collapsed = new Set(collapsedTutorialWeeks.value);
    if (collapsed.has(week)) collapsed.delete(week);
    else collapsed.add(week);
    collapsedTutorialWeeks.value = collapsed;
    return;
  }
  const collapsed = new Set(collapsedTutorialWeeks.value);
  collapsed.delete(week);
  collapsedTutorialWeeks.value = collapsed;
  openWeek(week);
};

const goHome = () => {
  currentView.value = "home";
  query.value = "";
  sidebarOpen.value = false;
  window.history.replaceState(null, "", window.location.pathname);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const toggleTask = (key: string) => {
  const weekKey = String(selectedWeekNumber.value);
  const current = new Set(progress.value.checklist[weekKey] ?? []);
  if (current.has(key)) current.delete(key);
  else current.add(key);
  progress.value.checklist[weekKey] = [...current];
};

const toggleWeekComplete = () => {
  const completed = new Set(progress.value.completedWeeks);
  if (completed.has(selectedWeekNumber.value)) {
    completed.delete(selectedWeekNumber.value);
    showToast(`第 ${selectedWeekNumber.value} 周已改为进行中`);
  } else {
    completed.add(selectedWeekNumber.value);
    showToast(`第 ${selectedWeekNumber.value} 周完成 ✓`);
  }
  progress.value.completedWeeks = [...completed].sort((a, b) => a - b);
};

const toggleLessonComplete = (lessonId: string) => {
  const completed = new Set(progress.value.completedLessons);
  if (completed.has(lessonId)) {
    completed.delete(lessonId);
    showToast("已改为进行中");
  } else {
    completed.add(lessonId);
    showToast("本节完成 ✓");
  }
  progress.value.completedLessons = [...completed];
};

const saveQuizScore = (lessonId: string, score: number) => {
  const previous = progress.value.quizScores[lessonId] ?? 0;
  progress.value.quizScores[lessonId] = Math.max(previous, score);
  showToast(score >= 80 ? `测验通过：${score}%` : `得分 ${score}%，建议复习后重试`);
};

const jumpToSearchResult = (week: CourseWeek) => {
  openWeek(week.week);
  searchFocused.value = false;
};

const closeSearchSoon = () => {
  window.setTimeout(() => {
    searchFocused.value = false;
  }, 160);
};

const onHashChange = () => {
  const match = window.location.hash.match(/^#week-(\d+)(?:\/([^/]+))?$/);
  if (match) openWeek(Number(match[1]), match[2] ?? "");
};

const onKeydown = (event: KeyboardEvent) => {
  if (
    event.key === "/" &&
    !(event.target instanceof HTMLInputElement) &&
    !(event.target instanceof HTMLTextAreaElement)
  ) {
    event.preventDefault();
    document.querySelector<HTMLInputElement>("[data-search]")?.focus();
  }
  if (event.key === "Escape") {
    authOpen.value = false;
    sidebarOpen.value = false;
    searchFocused.value = false;
  }
};

onMounted(async () => {
  session.value = parseStored<UserSession | null>(SESSION_KEY, null);
  progress.value = normalizeProgress(
    parseStored(ANON_PROGRESS_KEY, createProgress()),
  );
  hydrated.value = true;
  onHashChange();
  window.addEventListener("hashchange", onHashChange);
  window.addEventListener("keydown", onKeydown);
  if (session.value) {
    try {
      await loadUserProgress();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "进度同步失败");
    }
  }
});

onBeforeUnmount(() => {
  window.clearTimeout(saveTimer);
  window.clearTimeout(toastTimer);
  window.removeEventListener("hashchange", onHashChange);
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div class="site-shell">
    <header class="topbar">
      <button class="brand" aria-label="返回路线首页" @click="goHome">
        <span class="brand-mark">C<span>52</span></span>
        <span class="brand-copy">
          <strong>CUDA 52</strong>
          <small>KERNEL ENGINEERING HANDBOOK</small>
        </span>
      </button>

      <button
        v-if="currentView === 'week'"
        class="icon-button mobile-menu"
        aria-label="打开课程目录"
        @click="sidebarOpen = !sidebarOpen"
      >
        ☰
      </button>

      <div class="top-search">
        <span aria-hidden="true">⌕</span>
        <input
          v-model="query"
          data-search
          aria-label="搜索 52 周课程"
          placeholder="搜索类型推导、Kernel、GEMM…"
          @focus="searchFocused = true"
          @blur="closeSearchSoon"
        />
        <kbd>/</kbd>
        <div v-if="searchFocused && query" class="search-results">
          <button
            v-for="week in filteredWeeks"
            :key="week.id"
            @mousedown.prevent="jumpToSearchResult(week)"
          >
            <span class="search-week">W{{ String(week.week).padStart(2, "0") }}</span>
            <span><strong>{{ week.title }}</strong><small>{{ week.stageName }}</small></span>
          </button>
          <div v-if="!filteredWeeks.length" class="search-empty">没有匹配的课程内容</div>
        </div>
      </div>

      <div class="top-actions">
        <span class="version-chip"><i /> 2026.1</span>
        <button v-if="!session" class="text-button" @click="openAuth('login')">
          登录
        </button>
        <div v-else class="user-menu">
          <span class="user-avatar">{{ session.username.slice(0, 1).toUpperCase() }}</span>
          <span class="user-name">{{ session.username }}</span>
          <button class="logout-link" @click="logout()">退出</button>
        </div>
      </div>
    </header>

    <main v-if="currentView === 'home'" class="home">
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow"><span /> FROM CUDA KERNEL TO LLM SYSTEMS</div>
          <h1>把 52 周走成<br /><em>一条可执行的路径。</em></h1>
          <p>
            不是技术名词的堆叠，而是每周都有阅读、实现、性能分析与验收的工程课程表。
            最终独立实现大模型 CUDA Kernel，并把它接进 PyTorch 与多 GPU 训练系统。
          </p>
          <div class="hero-actions">
            <button
              class="primary-button"
              @click="openWeek(homeStart.week, homeStart.page)"
            >
              {{ homeStart.label }}
              <span>→</span>
            </button>
            <button class="secondary-button" @click="openWeek(1)">浏览完整手册</button>
          </div>
          <div class="hero-meta">
            <div><strong>52</strong><span>周完整路径</span></div>
            <div><strong>12–15h</strong><span>每周投入</span></div>
            <div><strong>10</strong><span>能力阶段</span></div>
          </div>
        </div>
        <div class="hero-visual">
          <ThreeHero />
          <div class="hero-orbit-label label-one"><i /> WARP / SIMT</div>
          <div class="hero-orbit-label label-two"><i /> TENSOR CORE</div>
          <div class="hero-orbit-label label-three"><i /> FLASH ATTENTION</div>
          <div class="hero-code-card">
            <span>WEEK 34</span>
            <code>mini_flash_attn&lt;&lt;&lt;grid, block&gt;&gt;&gt;(...)</code>
          </div>
        </div>
      </section>

      <section class="progress-strip">
        <div
          class="progress-ring"
          :style="{ '--progress': `${percentComplete * 3.6}deg` }"
        >
          <div><strong>{{ percentComplete }}%</strong><span>完成</span></div>
        </div>
        <div class="progress-copy">
          <span class="section-kicker">YOUR PROGRESS</span>
          <h2>{{ completedCount ? "保持节奏，证据比感觉更重要。" : "登录后，学习记录会跟着你走。" }}</h2>
          <p>
            已完成 {{ completedCount }} / 52 周。每一周都可以勾选任务、记录笔记，并按统一标准验收。
          </p>
        </div>
        <button v-if="!session" class="secondary-button light" @click="openAuth('register')">
          创建账号并同步
        </button>
        <div v-else class="sync-status">
          <span :class="{ active: syncing }" />{{ syncing ? "正在同步" : "进度已同步" }}
        </div>
      </section>

      <section class="section-block roadmap-section">
        <div class="section-heading">
          <div>
            <span class="section-kicker">THE ROADMAP</span>
            <h2>从基础到底层系统，十个阶段。</h2>
          </div>
          <p>每个阶段都以前一阶段的工程产物为地基，不跳过性能证据，也不只停留在“会写”。</p>
        </div>

        <div class="stage-grid">
          <button
            v-for="stage in course.stages"
            :key="stage.id"
            class="stage-card"
            :style="{ '--stage-color': stage.color }"
            @click="openWeek(stage.weekStart)"
          >
            <span class="stage-index">{{ String(stage.index).padStart(2, "0") }}</span>
            <span class="stage-line" />
            <strong>{{ stage.shortTitle }}</strong>
            <small>W{{ stage.weekStart }} — W{{ stage.weekEnd }}</small>
            <i>↗</i>
          </button>
        </div>
      </section>

      <section class="section-block standards-section">
        <div class="standards-intro">
          <span class="section-kicker">ONE STANDARD, EVERY KERNEL</span>
          <h2>不是“跑通”，而是可证明地正确与更快。</h2>
          <p>所有项目沿用同一套四维验收框架，训练工程判断力。</p>
        </div>
        <div class="standard-list">
          <article>
            <span>01</span>
            <div><h3>正确性</h3><p>边界 Shape、随机输入、极端数值与明确误差阈值。</p></div>
            <b>ATOL / RTOL</b>
          </article>
          <article>
            <span>02</span>
            <div><h3>性能测试</h3><p>20 次预热、100 次测量、5 组 Shape、Median 与 P95。</p></div>
            <b>CUDA EVENT</b>
          </article>
          <article>
            <span>03</span>
            <div><h3>性能分析</h3><p>Nsight 指标、Warp Stall、Roofline 与瓶颈判断。</p></div>
            <b>NSIGHT</b>
          </article>
          <article>
            <span>04</span>
            <div><h3>工程交付</h3><p>源码、测试、Benchmark、Profile 与完整优化记录。</p></div>
            <b>REPRODUCIBLE</b>
          </article>
        </div>
      </section>

      <section class="section-block handbook-section">
        <div class="handbook-preview">
          <div class="preview-sidebar">
            <div class="fake-search" />
            <span v-for="index in 7" :key="index" :style="{ width: `${52 + index * 5}%` }" />
          </div>
          <div class="preview-document">
            <small>WEEK 06 · MEMORY ARCHITECTURE</small>
            <h3>GPU 内存体系</h3>
            <div class="preview-rule" />
            <p />
            <p class="short" />
            <div class="preview-code">
              <i /><i /><i />
              <span>__shared__ float tile[TILE][TILE + 1];</span>
            </div>
          </div>
        </div>
        <div class="handbook-copy">
          <span class="section-kicker">DOCUMENTATION-FIRST</span>
          <h2>像查 Python 手册一样，随时找到这一周。</h2>
          <p>
            左侧阶段树用于定位，正文保留原路线的阅读、实现和深度要求，右侧把任务清单、完成状态与个人笔记放在手边。
          </p>
          <ul>
            <li><span>⌕</span>全文搜索 52 周内容</li>
            <li><span>✓</span>逐周任务清单与完成状态</li>
            <li><span>↻</span>账号级跨设备进度同步</li>
          </ul>
          <button class="primary-button" @click="openWeek(1)">打开课程手册 <span>→</span></button>
        </div>
      </section>
    </main>

    <div v-else class="docs-layout">
      <div v-if="sidebarOpen" class="sidebar-scrim" @click="sidebarOpen = false" />
      <aside class="docs-sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-progress">
          <div>
            <span>学习进度</span>
            <strong>{{ completedCount }}/52 周</strong>
          </div>
          <div class="thin-progress"><i :style="{ width: `${percentComplete}%` }" /></div>
        </div>

        <nav aria-label="课程周次目录">
          <section v-for="stage in course.stages" :key="stage.id">
            <div class="sidebar-stage">
              <i :style="{ background: stage.color }" />
              <span>{{ stage.index }} · {{ stage.shortTitle }}</span>
            </div>
            <template
              v-for="week in course.weeks.filter((item) => item.stageId === stage.id)"
              :key="week.id"
            >
              <button
                :class="{
                  active: week.week === selectedWeekNumber,
                  complete: progress.completedWeeks.includes(week.week),
                }"
                :aria-expanded="
                  tutorialByWeek.has(week.week)
                    ? isTutorialMenuExpanded(week.week)
                    : undefined
                "
                @click="handleWeekNavigation(week.week)"
              >
                <span class="week-status">
                  {{ progress.completedWeeks.includes(week.week) ? "✓" : String(week.week).padStart(2, "0") }}
                </span>
                <span class="week-title">
                  <span>{{ week.title }}</span>
                  <i v-if="tutorialByWeek.has(week.week)">
                    {{ isTutorialMenuExpanded(week.week) ? "−" : "+" }}
                  </i>
                </span>
              </button>
              <div
                v-if="
                  tutorialByWeek.get(week.week) &&
                  isTutorialMenuExpanded(week.week)
                "
                class="sidebar-lessons"
              >
                <button
                  v-for="(lesson, lessonIndex) in tutorialByWeek.get(week.week)?.lessons"
                  :key="lesson.id"
                  :class="{
                    active: selectedTutorialPageId === lesson.id,
                    complete: progress.completedLessons.includes(lesson.id),
                    'foundation-start':
                      lesson.id === 'w01-foundation-memory',
                  }"
                  @click="selectTutorialPage(lesson.id)"
                >
                  <span>{{
                    progress.completedLessons.includes(lesson.id)
                      ? "✓"
                      : String(lessonIndex + 1).padStart(2, "0")
                  }}</span>
                  <span>{{ lesson.title }}</span>
                </button>
                <button
                  class="reading-link"
                  :class="{ active: isReadingPage }"
                  @click="selectTutorialPage(READING_PAGE_ID)"
                >
                  <span>R</span>
                  <span>{{ week.week === 1 ? "推荐书籍" : "推荐阅读" }}</span>
                </button>
                <button
                  class="reading-link"
                  :class="{ active: isWeeklyRoadmapPage }"
                  @click="selectTutorialPage(WEEKLY_PAGE_ID)"
                >
                  <span>W</span>
                  <span>本周课程表与验收</span>
                </button>
              </div>
            </template>
          </section>
        </nav>
      </aside>

      <article class="docs-article">
        <div class="article-breadcrumb">
          <button @click="goHome">CUDA 52</button><span>/</span>
          <span>{{ selectedWeek.stageName }}</span><span>/</span>
          <strong>第 {{ selectedWeek.week }} 周</strong>
        </div>

        <header class="article-header">
          <div
            class="article-stage-tag"
            :style="{ '--stage-color': selectedStage?.color ?? '#22d3ee' }"
          >
            STAGE {{ String(selectedWeek.stageIndex).padStart(2, "0") }}
          </div>
          <p>第 {{ selectedWeek.week }} 周 · {{ selectedStage?.time || "每周 12–15 小时" }}</p>
          <h1>{{ selectedWeek.title }}</h1>
          <div class="article-lead">
            {{ articleLead }}
          </div>
        </header>

        <template v-if="selectedTutorial && isReadingPage">
          <BookRecommendations v-if="selectedWeekNumber === 1" />
          <WeekReading v-else :week="selectedWeek" />
          <div class="lesson-footer">
            <div>
              <button
                @click="
                  selectTutorialPage(
                    selectedTutorial.lessons[selectedTutorial.lessons.length - 1].id,
                  )
                "
              >
                ← 上一节
              </button>
              <button @click="selectTutorialPage(WEEKLY_PAGE_ID)">
                本周课程表与验收 →
              </button>
            </div>
          </div>
        </template>

        <TutorialModule
          v-else-if="selectedTutorial && !isWeeklyRoadmapPage"
          :module="selectedTutorial"
          :lesson-id="selectedTutorialPageId"
          :final-page-id="READING_PAGE_ID"
          :final-page-label="selectedWeekNumber === 1 ? '推荐书籍' : '推荐阅读'"
          :quiz-scores="progress.quizScores"
          @select-lesson="selectTutorialPage"
          @save-quiz="saveQuizScore"
        />

        <template v-if="!selectedTutorial || isWeeklyRoadmapPage">
          <div id="weekly-roadmap" class="weekly-brief-heading">
            <span>WEEKLY ROADMAP</span>
            <h2>本周课程表与验收</h2>
            <p>深度教程解决“怎么理解”，课程表负责“这一周怎样练到工程可用”。</p>
          </div>

          <section
            v-for="section in selectedWeek.sections"
            :id="section.id"
            :key="section.id"
            class="article-section"
          >
            <h2>{{ section.title }}</h2>
            <ContentBlocks :blocks="section.blocks" />
          </section>
        </template>

        <LlmTutor
          :week="selectedWeek"
          :scope="tutorConfig.scope"
          :scope-id="tutorConfig.scopeId"
          :scope-title="tutorConfig.scopeTitle"
          :context="tutorConfig.context"
        />

        <footer
          v-if="!selectedTutorial || isWeeklyRoadmapPage"
          class="week-navigation"
        >
          <button
            :disabled="selectedWeekNumber === 1"
            @click="openWeek(selectedWeekNumber - 1)"
          >
            <small>上一周</small>
            <strong>← {{ course.weeks[selectedWeekNumber - 2]?.title }}</strong>
          </button>
          <button
            class="next"
            :disabled="selectedWeekNumber === 52"
            @click="openWeek(selectedWeekNumber + 1)"
          >
            <small>下一周</small>
            <strong>{{ course.weeks[selectedWeekNumber]?.title }} →</strong>
          </button>
        </footer>
      </article>

      <aside class="docs-rail">
        <div class="rail-card week-state">
          <div class="rail-title">
            <span>本周状态</span>
            <i :class="{ done: isWeekComplete }">{{ isWeekComplete ? "✓" : "WIP" }}</i>
          </div>
          <button
            class="week-complete-button"
            :class="{ complete: isWeekComplete }"
            @click="toggleWeekComplete"
          >
            {{ isWeekComplete ? "已完成本周" : "标记本周完成" }}
          </button>
          <small v-if="session">{{ syncing ? "正在保存…" : `同步至 ${session.username}` }}</small>
          <button v-else class="rail-login" @click="openAuth('login')">登录以同步进度 →</button>
        </div>

        <div
          v-if="selectedTutorial || currentTasks.length"
          class="rail-card task-card"
        >
          <div class="rail-title">
            <span>学习任务</span>
          </div>

          <section v-if="selectedTutorial" class="rail-tutorial-progress">
            <div>
              <span>教程小节</span>
              <b>
                {{ completedTutorialLessons }}/{{ selectedTutorial.lessons.length }}
              </b>
            </div>
            <div class="rail-progress-bar">
              <i
                :style="{
                  width: `${(completedTutorialLessons / selectedTutorial.lessons.length) * 100}%`,
                }"
              />
            </div>
            <label v-if="selectedTutorialLesson" class="current-lesson-task">
              <input
                type="checkbox"
                :checked="
                  progress.completedLessons.includes(selectedTutorialLesson.id)
                "
                @change="toggleLessonComplete(selectedTutorialLesson.id)"
              />
              <span>
                <small>当前小节</small>
                {{ selectedTutorialLesson.title }}
              </span>
            </label>
          </section>

          <section v-if="currentTasks.length" class="rail-engineering-tasks">
            <div class="task-group-title">
              <span>工程任务</span>
              <b>{{ weekChecklist.length }}/{{ currentTasks.length }}</b>
            </div>
            <label v-for="task in currentTasks" :key="task.key">
              <input
                type="checkbox"
                :checked="weekChecklist.includes(task.key)"
                @change="toggleTask(task.key)"
              />
              <span>{{ task.text }}</span>
            </label>
          </section>
        </div>

        <div class="rail-card toc-card">
          <div class="rail-title"><span>本页目录</span></div>
          <a
            v-if="selectedTutorial"
            :href="
              isReadingPage
                ? '#recommended-reading'
                : isWeeklyRoadmapPage
                  ? '#weekly-roadmap'
                  : '#deep-tutorial'
            "
            @click.stop
          >
            {{
              isReadingPage
                ? "推荐书籍"
                : isWeeklyRoadmapPage
                  ? "本周课程表与验收"
                  : "当前小节教程"
            }}
          </a>
          <a
            v-for="section in isWeeklyRoadmapPage || !selectedTutorial
              ? selectedWeek.sections
              : selectedTutorialLesson?.sections ?? []"
            :key="section.id"
            :href="`#${section.id}`"
            @click.stop
          >
            {{ section.title }}
          </a>
        </div>

        <div class="rail-card notes-card">
          <div class="rail-title"><span>学习笔记</span><b>自动保存</b></div>
          <textarea
            v-model="progress.notes[String(selectedWeekNumber)]"
            rows="6"
            placeholder="记录疑问、Profiler 结论或下一步优化…"
          />
        </div>
      </aside>
    </div>

    <AuthModal
      :open="authOpen"
      :busy="authBusy"
      :error="authError"
      :initial-mode="authMode"
      @close="authOpen = false"
      @submit="submitAuth"
    />

    <div v-if="toast" class="toast" role="status">{{ toast }}</div>
  </div>
</template>
