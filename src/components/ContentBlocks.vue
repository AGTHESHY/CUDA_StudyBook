<script setup lang="ts">
import type { ContentBlock } from "../types";

defineProps<{ blocks: ContentBlock[] }>();

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
    <pre v-else-if="block.type === 'code'"><span v-if="block.language" class="code-language">{{ block.language }}</span><code>{{ block.text }}</code></pre>
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
