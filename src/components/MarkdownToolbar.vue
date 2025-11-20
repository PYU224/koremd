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
  padding: 4px 0;
  width: 100%;
}

.toolbar-scroll {
  display: flex;
  overflow-x: auto;
  padding: 0 8px;
  gap: 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.toolbar-scroll::-webkit-scrollbar {
  display: none;
}

.toolbar-button {
  --padding-start: 8px;
  --padding-end: 8px;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  min-width: fit-content;
}
</style>
