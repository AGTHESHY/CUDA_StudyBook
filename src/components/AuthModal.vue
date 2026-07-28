<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  busy: boolean;
  error: string;
  initialMode?: "login" | "register";
}>();

const emit = defineEmits<{
  close: [];
  submit: [
    payload: {
      mode: "login" | "register";
      username: string;
      password: string;
    },
  ];
}>();

const mode = ref<"login" | "register">(props.initialMode ?? "login");
const username = ref("");
const password = ref("");
const canSubmit = computed(
  () => username.value.trim().length >= 2 && password.value.length >= 4,
);

watch(
  () => props.open,
  (next) => {
    if (next) mode.value = props.initialMode ?? "login";
  },
);
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <section class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button class="icon-button modal-close" aria-label="关闭登录窗口" @click="emit('close')">
        ×
      </button>
      <div class="auth-kicker">SYNC YOUR JOURNEY</div>
      <h2 id="auth-title">{{ mode === "login" ? "继续你的学习进度" : "创建学习账号" }}</h2>
      <p>
        登录后，完成周次、任务清单和学习笔记会同步到服务器，换设备也能继续。
      </p>

      <div class="auth-tabs" role="tablist" aria-label="账号操作">
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</button>
      </div>

      <form
        @submit.prevent="
          emit('submit', {
            mode,
            username: username.trim(),
            password,
          })
        "
      >
        <label>
          用户名
          <input
            v-model="username"
            autocomplete="username"
            placeholder="2–24 个字符"
            autofocus
          />
        </label>
        <label>
          密码
          <input
            v-model="password"
            type="password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            placeholder="至少 4 位"
          />
        </label>
        <div v-if="error" class="auth-error" role="alert">{{ error }}</div>
        <button class="primary-button auth-submit" :disabled="!canSubmit || busy">
          {{ busy ? "正在连接…" : mode === "login" ? "登录并同步" : "注册并开始" }}
        </button>
      </form>
      <small>本项目使用 Test ScriptStore 保存测试账号和学习进度。</small>
    </section>
  </div>
</template>
