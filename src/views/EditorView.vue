<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <ion-icon :icon="arrowBackOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
        <ion-title>
          <input
            v-model="fileName"
            @blur="updateFileName"
            class="file-name-input"
            :placeholder="t('editor.fileName')"
          />
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="toggleMode">
            <ion-icon 
              :icon="editorMode === 'edit' ? eyeOutline : createOutline" 
              slot="icon-only"
            />
          </ion-button>
          <ion-button @click="exportCurrentFile">
            <ion-icon :icon="shareOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="editor-container">
        <!-- 編集モード -->
        <MarkdownEditor
          v-show="editorMode === 'edit'"
          ref="editorRef"
          v-model="content"
          :font-size="settings.fontSize"
          :font-family="settings.fontFamily"
        />

        <!-- プレビューモード -->
        <MarkdownPreview
          v-show="editorMode === 'preview'"
          :content="content"
          :font-size="settings.fontSize"
          :font-family="settings.fontFamily"
        />
      </div>

      <!-- Markdownツールバー（編集モード時のみ） -->
      <div v-if="editorMode === 'edit'" class="toolbar-container">
        <MarkdownToolbar @insert="handleInsert" />
      </div>

      <!-- プレビューモード時の文字数表示 -->
      <div v-else class="word-count">
        {{ t('editor.wordCount') }}: {{ wordCount }}
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
} from '@ionic/vue';
import {
  arrowBackOutline,
  eyeOutline,
  createOutline,
  shareOutline,
} from 'ionicons/icons';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import MarkdownPreview from '@/components/MarkdownPreview.vue';
import MarkdownToolbar from '@/components/MarkdownToolbar.vue';
import { useFileStore } from '@/stores/fileStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getWordCount } from '@/utils/markdown';
import type { EditorMode, MarkdownToolbarButton } from '@/types';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const fileStore = useFileStore();
const settingsStore = useSettingsStore();

const editorRef = ref<InstanceType<typeof MarkdownEditor>>();
const editorMode = ref<EditorMode>('edit');
const content = ref('');
const fileName = ref('');

const settings = computed(() => settingsStore.settings);
const wordCount = computed(() => getWordCount(content.value));

// 自動保存用のタイマー
let saveTimer: NodeJS.Timeout | null = null;

onMounted(() => {
  const fileId = route.params.id as string;
  if (fileId) {
    fileStore.selectFile(fileId);
    if (fileStore.currentFile) {
      content.value = fileStore.currentFile.content;
      fileName.value = fileStore.currentFile.name;
    }
  }
});

onUnmounted(() => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveCurrentFile();
});

watch(content, () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveCurrentFile();
  }, 1000);
});

function toggleMode() {
  editorMode.value = editorMode.value === 'edit' ? 'preview' : 'edit';
}

function saveCurrentFile() {
  if (fileStore.currentFile) {
    fileStore.updateFile(
      fileStore.currentFile.id,
      content.value,
      fileName.value
    );
  }
}

function updateFileName() {
  saveCurrentFile();
}

function goBack() {
  saveCurrentFile();
  router.push('/');
}

function exportCurrentFile() {
  if (fileStore.currentFile) {
    fileStore.exportFile(fileStore.currentFile);
  }
}

function handleInsert(button: MarkdownToolbarButton) {
  editorRef.value?.insertText(
    button.insertBefore,
    button.insertAfter,
    button.placeholder
  );
}
</script>

<style scoped>
.file-name-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--ion-text-color);
  font-size: 18px;
  font-weight: 600;
  width: 100%;
  text-align: center;
}

.editor-container {
  height: calc(100% - 50px);
}

.toolbar-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.word-count {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--ion-color-light);
  padding: 12px;
  text-align: center;
  font-size: 14px;
  color: var(--ion-color-medium);
  border-top: 1px solid var(--ion-border-color);
  z-index: 10;
}
</style>
