<template>
  <div class="markdown-toolbar">
    <div class="toolbar-scroll">
      <ion-button
        v-for="(button, index) in markdownButtons"
        :key="index"
        size="small"
        fill="clear"
        @click="$emit('insert', button)"
        class="toolbar-button"
      >
        {{ button.label }}
      </ion-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { markdownButtons } from '@/utils/markdownButtons';
import type { MarkdownToolbarButton } from '@/types';

interface Emits {
  (e: 'insert', button: MarkdownToolbarButton): void;
}

defineEmits<Emits>();
</script>

<style scoped>
.markdown-toolbar {
  background: var(--ion-color-light);
  border-top: 1px solid var(--ion-border-color);
  padding: 6px 0; /* 4px → 6px */
  width: 100%;
}

.toolbar-scroll {
  display: flex;
  overflow-x: auto;
  padding: 0 8px;
  gap: 6px; /* 4px → 6px */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.toolbar-scroll::-webkit-scrollbar {
  display: none;
}

.toolbar-button {
  --padding-start: 10px; /* 8px → 10px */
  --padding-end: 10px; /* 8px → 10px */
  flex-shrink: 0;
  font-size: 16px; /* 14px → 16px（大きく）*/
  font-weight: 700; /* 600 → 700（太く）*/
  min-width: fit-content;
  height: 36px; /* ボタンの高さも少し大きく */
}
</style>