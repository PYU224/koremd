<template>
  <div 
    class="markdown-preview"
    :style="{
      fontSize: `${fontSize}px`,
      fontFamily: fontFamily,
    }"
    v-html="renderedContent"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { renderMarkdown } from '@/utils/markdown';

interface Props {
  content: string;
  fontSize: number;
  fontFamily: string;
}

const props = defineProps<Props>();

const renderedContent = computed(() => renderMarkdown(props.content));
</script>

<style scoped>
.markdown-preview {
  height: 100%;
  width: 100%;
  padding: 16px;
  overflow-y: auto;
  line-height: 1.6;
}

.markdown-preview :deep(h1) {
  font-size: 2em;
  font-weight: bold;
  margin: 0.67em 0;
  border-bottom: 1px solid var(--ion-color-light);
}

.markdown-preview :deep(h2) {
  font-size: 1.5em;
  font-weight: bold;
  margin: 0.75em 0;
  border-bottom: 1px solid var(--ion-color-light);
}

.markdown-preview :deep(h3) {
  font-size: 1.17em;
  font-weight: bold;
  margin: 0.83em 0;
}

.markdown-preview :deep(h4) {
  font-size: 1em;
  font-weight: bold;
  margin: 1.12em 0;
}

.markdown-preview :deep(h5) {
  font-size: 0.83em;
  font-weight: bold;
  margin: 1.5em 0;
}

.markdown-preview :deep(h6) {
  font-size: 0.75em;
  font-weight: bold;
  margin: 1.67em 0;
}

.markdown-preview :deep(p) {
  margin: 1em 0;
}

.markdown-preview :deep(code) {
  background-color: var(--ion-color-light);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.markdown-preview :deep(pre) {
  background-color: var(--ion-color-light);
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
}

.markdown-preview :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-preview :deep(blockquote) {
  border-left: 4px solid var(--ion-color-primary);
  padding-left: 16px;
  margin: 1em 0;
  color: var(--ion-color-medium);
}

.markdown-preview :deep(ul), 
.markdown-preview :deep(ol) {
  padding-left: 2em;
  margin: 1em 0;
}

.markdown-preview :deep(li) {
  margin: 0.5em 0;
}

.markdown-preview :deep(a) {
  color: var(--ion-color-primary);
  text-decoration: none;
}

.markdown-preview :deep(a:hover) {
  text-decoration: underline;
}

.markdown-preview :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

.markdown-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.markdown-preview :deep(th),
.markdown-preview :deep(td) {
  border: 1px solid var(--ion-color-light);
  padding: 8px 12px;
  text-align: left;
}

.markdown-preview :deep(th) {
  background-color: var(--ion-color-light);
  font-weight: bold;
}

.markdown-preview :deep(hr) {
  border: none;
  border-top: 2px solid var(--ion-color-light);
  margin: 2em 0;
}
</style>
