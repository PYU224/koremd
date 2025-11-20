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
          :class="{ 'search-active': isSearching }"
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

      <!-- 検索結果ナビゲーション（検索中のみ表示） -->
      <div v-if="isSearching && searchMatches.length > 0" class="search-navigation">
        <ion-button size="small" fill="clear" @click="previousMatch" class="nav-button">
          <ion-icon :icon="chevronUpOutline" slot="icon-only" />
        </ion-button>
        <span class="search-info">
          {{ currentMatchIndex + 1 }} / {{ searchMatches.length }}
        </span>
        <ion-button size="small" fill="clear" @click="nextMatch" class="nav-button">
          <ion-icon :icon="chevronDownOutline" slot="icon-only" />
        </ion-button>
        <ion-button 
          size="small" 
          fill="solid" 
          @click="clearSearch" 
          color="danger"
          class="close-button"
        >
          <ion-icon :icon="closeOutline" slot="icon-only" />
        </ion-button>
      </div>

      <!-- FAB: キーワード検索（青地に虫眼鏡） -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="search-fab">
        <ion-fab-button @click="openSearchModal" color="primary">
          <ion-icon :icon="searchOutline" />
        </ion-fab-button>
      </ion-fab>
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
  IonFab,
  IonFabButton,
  alertController,
} from '@ionic/vue';
import {
  arrowBackOutline,
  eyeOutline,
  createOutline,
  shareOutline,
  searchOutline,
  chevronUpOutline,
  chevronDownOutline,
  closeOutline,
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
const searchKeyword = ref('');
const isSearching = ref(false);
const searchMatches = ref<number[]>([]);
const currentMatchIndex = ref(0);

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
  
  // 検索中の場合、検索結果を更新
  if (isSearching.value && searchKeyword.value) {
    findAllMatches(searchKeyword.value);
  }
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

// キーワード検索モーダル（改善版：ボタンを統合）
async function openSearchModal() {
  const alert = await alertController.create({
    header: t('editor.search'),
    inputs: [
      {
        name: 'keyword',
        type: 'text',
        placeholder: t('editor.searchPlaceholder'),
        value: searchKeyword.value,
      },
    ],
    buttons: [
      {
        text: t('common.cancel'),
        role: 'cancel',
        cssClass: 'secondary',
        handler: () => {
          // キャンセル時、既存の検索もクリア
          if (isSearching.value) {
            clearSearch();
          }
        },
      },
      {
        text: t('common.search'),
        handler: (data) => {
          if (data.keyword) {
            performSearch(data.keyword);
          } else {
            // キーワードが空の場合は検索をクリア
            clearSearch();
          }
        },
      },
    ],
  });

  await alert.present();
}

// すべての検索結果を見つける
function findAllMatches(keyword: string): number[] {
  const lowerContent = content.value.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const matches: number[] = [];
  
  let index = lowerContent.indexOf(lowerKeyword);
  while (index !== -1) {
    matches.push(index);
    index = lowerContent.indexOf(lowerKeyword, index + 1);
  }
  
  return matches;
}

// キーワード検索を実行
function performSearch(keyword: string) {
  if (!keyword) {
    clearSearch();
    return;
  }

  searchKeyword.value = keyword;
  isSearching.value = true;
  
  // エディターモードに切り替え
  if (editorMode.value === 'preview') {
    editorMode.value = 'edit';
  }

  // すべてのマッチを見つける
  const matches = findAllMatches(keyword);
  searchMatches.value = matches;
  currentMatchIndex.value = 0;

  if (matches.length > 0) {
    // 最初のマッチにジャンプ
    jumpToMatch(0);
    
    // 検索結果を表示
    showSearchResult(matches.length);
  } else {
    showNoResults();
    isSearching.value = false;
  }
}

// 指定したマッチにジャンプ
function jumpToMatch(index: number) {
  if (searchMatches.value.length === 0) return;
  
  currentMatchIndex.value = index;
  const matchIndex = searchMatches.value[index];
  
  setTimeout(() => {
    const textarea = editorRef.value?.$el.querySelector('textarea');
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(matchIndex, matchIndex + searchKeyword.value.length);
      
      // スクロール位置を調整
      const lineHeight = 24; // 概算の行の高さ
      const lines = content.value.substring(0, matchIndex).split('\n').length;
      textarea.scrollTop = lines * lineHeight - textarea.clientHeight / 2;
    }
  }, 100);
}

// 次のマッチへ
function nextMatch() {
  if (searchMatches.value.length === 0) return;
  const nextIndex = (currentMatchIndex.value + 1) % searchMatches.value.length;
  jumpToMatch(nextIndex);
}

// 前のマッチへ
function previousMatch() {
  if (searchMatches.value.length === 0) return;
  const prevIndex = currentMatchIndex.value === 0 
    ? searchMatches.value.length - 1 
    : currentMatchIndex.value - 1;
  jumpToMatch(prevIndex);
}

// 検索結果を表示
async function showSearchResult(count: number) {
  const alert = await alertController.create({
    header: t('editor.searchResults'),
    message: `${count} ${t('editor.matchesFound')}`,
    buttons: [t('common.confirm')],
  });
  await alert.present();
}

// 検索結果がない場合
async function showNoResults() {
  const alert = await alertController.create({
    header: t('editor.searchResults'),
    message: t('editor.noMatches'),
    buttons: [t('common.confirm')],
  });
  await alert.present();
}

// 検索をクリア
function clearSearch() {
  searchKeyword.value = '';
  isSearching.value = false;
  searchMatches.value = [];
  currentMatchIndex.value = 0;
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

/* 検索FABボタン - 青地に虫眼鏡 */
.search-fab {
  margin-bottom: 70px;
}

.search-fab ion-fab-button {
  --background: var(--ion-color-primary);
  --background-activated: var(--ion-color-primary-shade);
}

.search-fab ion-icon {
  font-size: 24px;
}

/* 検索結果ナビゲーション - 改善版 */
.search-navigation {
  position: fixed;
  top: 60px;
  right: 10px;
  background: var(--ion-color-primary);
  color: white;
  padding: 8px 12px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.search-info {
  font-size: 14px;
  font-weight: 600;
  min-width: 50px;
  text-align: center;
}

.search-navigation .nav-button {
  --color: white;
  --padding-start: 4px;
  --padding-end: 4px;
  margin: 0;
}

.search-navigation .nav-button ion-icon {
  font-size: 20px;
}

/* 閉じるボタン - 目立つデザイン */
.search-navigation .close-button {
  --background: #dc143c;
  --background-hover: #c21235;
  --background-activated: #a01030;
  --color: white;
  --padding-start: 8px;
  --padding-end: 8px;
  --border-radius: 50%;
  height: 32px;
  width: 32px;
  margin: 0 0 0 4px;
  font-weight: bold;
}

.search-navigation .close-button ion-icon {
  font-size: 24px;
  font-weight: bold;
}

/* 検索中のテキスト選択のハイライト */
.search-active :deep(textarea::selection) {
  background-color: #ffd700;
  color: #000;
}

.search-active :deep(textarea::-moz-selection) {
  background-color: #ffd700;
  color: #000;
}
</style>