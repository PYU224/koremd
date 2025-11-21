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

    <ion-content :fullscreen="true" class="safe-content">
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

      <!-- Markdownツールバー（編集モード時のみ）- ナビゲーションバー対応 -->
      <div v-if="editorMode === 'edit'" class="toolbar-container-safe">
        <MarkdownToolbar @insert="handleInsert" />
      </div>

      <!-- プレビューモード時の文字数表示 - ナビゲーションバー対応 -->
      <div v-else class="word-count-safe">
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

      <!-- FAB: キーワード検索 - ナビゲーションバー対応 -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="safe-search-fab">
        <ion-fab-button @click="openSearchModal" color="tertiary">
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

// ✅ watchの改善 - デバウンス処理を追加
watch(content, () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  // 自動保存のデバウンス時間を1秒に設定
  saveTimer = setTimeout(() => {
    saveCurrentFile();
  }, 1000);
  
  // ✅ 検索中の場合のみ、検索結果を更新（デバウンス付き）
  if (isSearching.value && searchKeyword.value) {
    // 検索結果更新もデバウンス
    setTimeout(() => {
      if (isSearching.value && searchKeyword.value) {
        findAllMatches(searchKeyword.value);
      }
    }, 300);
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

// キーワード検索モーダル
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
            clearSearch();
          }
        },
      },
    ],
  });

  await alert.present();
}

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

function performSearch(keyword: string) {
  if (!keyword) {
    clearSearch();
    return;
  }

  searchKeyword.value = keyword;
  isSearching.value = true;
  
  if (editorMode.value === 'preview') {
    editorMode.value = 'edit';
  }

  const matches = findAllMatches(keyword);
  searchMatches.value = matches;
  currentMatchIndex.value = 0;

  if (matches.length > 0) {
    jumpToMatch(0);
    showSearchResult(matches.length);
  } else {
    showNoResults();
    isSearching.value = false;
  }
}

// ✅ jumpToMatchの改善 - より慎重なカーソル移動
function jumpToMatch(index: number) {
  if (searchMatches.value.length === 0) return;
  
  currentMatchIndex.value = index;
  const matchIndex = searchMatches.value[index];
  
  // ✅ より長い遅延を設定してIME入力との競合を回避
  setTimeout(() => {
    const textarea = editorRef.value?.$el?.querySelector('textarea');
    if (textarea) {
      textarea.focus();
      
      // ✅ さらに遅延を追加してカーソル位置設定
      setTimeout(() => {
        if (textarea) {
          textarea.setSelectionRange(matchIndex, matchIndex + searchKeyword.value.length);
          
          // スクロール位置の調整
          const lineHeight = 24;
          const lines = content.value.substring(0, matchIndex).split('\n').length;
          textarea.scrollTop = lines * lineHeight - textarea.clientHeight / 2;
        }
      }, 50);
    }
  }, 100);
}

function nextMatch() {
  if (searchMatches.value.length === 0) return;
  const nextIndex = (currentMatchIndex.value + 1) % searchMatches.value.length;
  jumpToMatch(nextIndex);
}

function previousMatch() {
  if (searchMatches.value.length === 0) return;
  const prevIndex = currentMatchIndex.value === 0 
    ? searchMatches.value.length - 1 
    : currentMatchIndex.value - 1;
  jumpToMatch(prevIndex);
}

async function showSearchResult(count: number) {
  const alert = await alertController.create({
    header: t('editor.searchResults'),
    message: `${count} ${t('editor.matchesFound')}`,
    buttons: [t('common.confirm')],
  });
  await alert.present();
}

async function showNoResults() {
  const alert = await alertController.create({
    header: t('editor.searchResults'),
    message: t('editor.noMatches'),
    buttons: [t('common.confirm')],
  });
  await alert.present();
}

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

/* Androidナビゲーションバー対応 */
.safe-content {
  --padding-bottom: env(safe-area-inset-bottom);
}

.editor-container {
  height: calc(100% - 50px - env(safe-area-inset-bottom));
}

/* ツールバー - ナビゲーションバー対応 */
.toolbar-container-safe {
  position: fixed;
  bottom: env(safe-area-inset-bottom);
  left: 0;
  right: 0;
  z-index: 10;
  background: var(--ion-color-light);
}

/* 文字数表示 - ナビゲーションバー対応 */
.word-count-safe {
  position: fixed;
  bottom: env(safe-area-inset-bottom);
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

/* 検索FAB - ナビゲーションバー対応 */
.safe-search-fab {
  /* ツールバーの高さ50px + ナビゲーションバー + 余白 */
  margin-bottom: calc(70px + env(safe-area-inset-bottom));
  margin-right: 16px;
}

.safe-search-fab ion-fab-button {
  --background: var(--ion-color-tertiary);
  --background-hover: var(--ion-color-tertiary-shade);
  --background-activated: var(--ion-color-tertiary-shade);
  --color: #000000;
  --box-shadow: 0 6px 20px rgba(255, 215, 0, 0.5);
  width: 56px;
  height: 56px;
}

.safe-search-fab ion-fab-button ion-icon {
  font-size: 28px;
  color: #000000;
  font-weight: bold;
}

/* 検索結果ナビゲーション */
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