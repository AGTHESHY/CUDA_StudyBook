<script setup lang="ts">
import { ref } from "vue";
import type { ContentBlock } from "../types";

defineProps<{ blocks: ContentBlock[] }>();
const copiedBlock = ref<number | null>(null);

const copyCode = async (text: string, blockIndex: number) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  } catch {
    return;
  }
  copiedBlock.value = blockIndex;
  window.setTimeout(() => {
    if (copiedBlock.value === blockIndex) copiedBlock.value = null;
  }, 1600);
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const inline = (value: string) => {
  let output = escapeHtml(value);
  output = output.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  );
  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return output;
};
</script>

<template>
  <template v-for="(block, blockIndex) in blocks" :key="blockIndex">
    <p
      v-if="block.type === 'paragraph'"
      class="content-paragraph"
      v-html="inline(block.text)"
    />
    <blockquote v-else-if="block.type === 'quote'" v-html="inline(block.text)" />
    <div v-else-if="block.type === 'code'" class="code-example">
      <div>
        <span>{{ block.language || "code" }}</span>
        <button @click="copyCode(block.text, blockIndex)">
          {{ copiedBlock === blockIndex ? "已复制 ✓" : "复制代码" }}
        </button>
      </div>
      <pre><code>{{ block.text }}</code></pre>
    </div>
    <component
      :is="block.ordered ? 'ol' : 'ul'"
      v-else-if="block.type === 'list'"
      class="content-list"
    >
      <li
        v-for="(item, itemIndex) in block.items"
        :key="itemIndex"
        v-html="inline(item)"
      />
    </component>
    <h4 v-else class="content-subheading" v-html="inline(block.text)" />
  </template>
</template>
