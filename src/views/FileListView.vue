<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('app.name') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="toggleViewMode">
            <ion-icon 
              :icon="viewMode === 'list' ? gridOutline : listOutline" 
              slot="icon-only"
            />
          </ion-button>
          <ion-button router-link="/settings">
            <ion-icon :icon="settingsOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          :placeholder="t('fileList.searchPlaceholder')"
          @ionInput="handleSearch"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-bottom">
      <!-- ファイルが無い場合 -->
      <div v-if="filteredFiles.length === 0" class="empty-state">
        <ion-icon :icon="documentTextOutline" class="empty-icon" />
        <p>{{ t('fileList.noFiles') }}</p>
      </div>

      <!-- リスト表示 -->
      <ion-list v-else-if="viewMode === 'list'" class="safe-list">
        <ion-item
          v-for="file in filteredFiles"
          :key="file.id"
          button
          @click="openFile(file.id)"
        >
          <ion-icon :icon="documentTextOutline" slot="start" />
          <ion-label>
            <h2>{{ file.name }}</h2>
            <p>{{ formatDate(file.updatedAt) }}</p>
          </ion-label>
          <ion-button
            fill="clear"
            slot="end"
            @click.stop="deleteFileConfirm(file)"
          >
            <ion-icon :icon="trashOutline" slot="icon-only" color="danger" />
          </ion-button>
        </ion-item>
      </ion-list>

      <!-- グリッド表示 -->
      <div v-else class="grid-view safe-grid">
        <div
          v-for="file in filteredFiles"
          :key="file.id"
          class="grid-item"
          @click="openFile(file.id)"
        >
          <div class="grid-item-content">
            <ion-icon :icon="documentTextOutline" class="grid-icon" />
            <div class="grid-info">
              <h3>{{ file.name }}</h3>
              <p>{{ formatDate(file.updatedAt) }}</p>
            </div>
          </div>
          <ion-button
            fill="clear"
            size="small"
            class="delete-btn"
            @click.stop="deleteFileConfirm(file)"
          >
            <ion-icon :icon="trashOutline" slot="icon-only" color="danger" />
          </ion-button>
        </div>
      </div>

      <!-- FAB: 新規作成 + インポート（ナビゲーションバー対応） -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="safe-fab">
        <ion-fab-button color="tertiary">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
        <ion-fab-list side="top">
          <ion-fab-button @click="createNewFile" color="primary" class="sub-fab">
            <ion-icon :icon="createOutline" />
          </ion-fab-button>
          <ion-fab-button @click="importFile" color="secondary" class="sub-fab">
            <ion-icon :icon="downloadOutline" />
          </ion-fab-button>
        </ion-fab-list>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
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
  IonList,
  IonItem,
  IonLabel,
  IonSearchbar,
  IonFab,
  IonFabButton,
  IonFabList,
  alertController,
} from '@ionic/vue';
import {
  settingsOutline,
  listOutline,
  gridOutline,
  documentTextOutline,
  trashOutline,
  addOutline,
  createOutline,
  downloadOutline,
} from 'ionicons/icons';
import { useFileStore } from '@/stores/fileStore';
import type { MarkdownFile } from '@/types';

const router = useRouter();
const { t } = useI18n();
const fileStore = useFileStore();

const searchQuery = ref('');
const viewMode = computed(() => fileStore.viewMode);
const filteredFiles = computed(() => fileStore.filteredFiles);

function handleSearch(event: CustomEvent) {
  fileStore.searchQuery = event.detail.value || '';
}

function toggleViewMode() {
  fileStore.viewMode = viewMode.value === 'list' ? 'grid' : 'list';
}

function openFile(id: string) {
  fileStore.selectFile(id);
  router.push(`/editor/${id}`);
}

function createNewFile() {
  const file = fileStore.createFile();
  router.push(`/editor/${file.id}`);
}

// ✅ 改善されたファイルインポート機能
async function importFile() {
  const input = document.createElement('input');
  input.type = 'file';
  // より広範なファイル形式とMIMEタイプに対応
  // Android/iOSでのファイル選択の互換性を向上
  input.accept = '.md,.markdown,.txt,text/markdown,text/plain,text/x-markdown,application/octet-stream';
  input.multiple = false;
  
  input.onchange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      // ファイル名の検証
      const fileName = file.name.toLowerCase();
      const validExtensions = ['.md', '.markdown', '.txt'];
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        // サポートされていない拡張子の場合、確認ダイアログを表示
        const alert = await alertController.create({
          header: t('common.confirm'),
          message: `このファイル形式（${file.name}）はサポートされていません。.md、.markdown、.txtファイルのみインポートできます。強制的にインポートしますか？`,
          buttons: [
            {
              text: t('common.cancel'),
              role: 'cancel',
            },
            {
              text: '強制的にインポート',
              role: 'confirm',
              handler: async () => {
                await processFileImport(file);
              },
            },
          ],
        });
        await alert.present();
      } else {
        // 有効な拡張子の場合、直接インポート
        await processFileImport(file);
      }
    } catch (error) {
      console.error('Failed to import file:', error);
      const alert = await alertController.create({
        header: 'エラー / Error',
        message: 'ファイルのインポートに失敗しました。テキストファイルであることを確認してください。\nFailed to import file. Please ensure it is a text file.',
        buttons: ['OK'],
      });
      await alert.present();
    }
  };
  
  input.click();
}

// ファイルインポート処理を別関数に分離
async function processFileImport(file: File) {
  try {
    // ファイル内容を読み込む
    const content = await file.text();
    
    // ファイル名を正規化
    let fileName = file.name;
    
    // 拡張子がない場合や、.mdでない場合は.mdを追加
    if (!fileName.toLowerCase().endsWith('.md') && 
        !fileName.toLowerCase().endsWith('.markdown')) {
      // 既存の拡張子を削除して.mdを追加
      const lastDotIndex = fileName.lastIndexOf('.');
      if (lastDotIndex > 0) {
        fileName = fileName.substring(0, lastDotIndex) + '.md';
      } else {
        fileName = fileName + '.md';
      }
    }
    
    // ファイルストアにインポート
    const newFile = fileStore.importFile(fileName, content);
    
    // 成功メッセージを表示
    const alert = await alertController.create({
      header: '成功 / Success',
      message: `ファイル「${fileName}」をインポートしました。\nImported file "${fileName}".`,
      buttons: ['OK'],
    });
    await alert.present();
    
    // エディターページに遷移
    router.push(`/editor/${newFile.id}`);
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}

async function deleteFileConfirm(file: MarkdownFile) {
  const alert = await alertController.create({
    header: t('common.confirm'),
    message: t('fileList.deleteConfirm'),
    buttons: [
      {
        text: t('common.cancel'),
        role: 'cancel',
      },
      {
        text: t('common.delete'),
        role: 'confirm',
        handler: () => {
          fileStore.deleteFile(file.id);
        },
      },
    ],
  });

  await alert.present();
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}
</script>

<style scoped>
/* Androidナビゲーションバー対応 */
.ion-padding-bottom {
  --padding-bottom: calc(16px + env(safe-area-inset-bottom));
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ion-color-medium);
  padding-bottom: env(safe-area-inset-bottom);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

/* リスト表示 - ナビゲーションバー対応 */
.safe-list {
  padding-bottom: calc(100px + env(safe-area-inset-bottom));
}

/* グリッド表示 - ナビゲーションバー対応 */
.safe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  padding: 16px;
  padding-bottom: calc(100px + env(safe-area-inset-bottom));
}

.grid-item {
  background: var(--ion-color-light);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s;
}

.grid-item:hover {
  transform: translateY(-2px);
}

.grid-item-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.grid-icon {
  font-size: 48px;
  color: var(--ion-color-primary);
}

.grid-info h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.grid-info p {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin: 0;
}

.delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
}

/* FABボタン - Androidナビゲーションバー対応 */
.safe-fab {
  /* Androidのナビゲーションバーの高さ分を確保 */
  margin-bottom: calc(16px + env(safe-area-inset-bottom));
  margin-right: 16px;
}

.safe-fab ion-fab-button {
  --background: var(--ion-color-tertiary);
  --background-hover: var(--ion-color-tertiary-shade);
  --background-activated: var(--ion-color-tertiary-shade);
  --color: #000000;
  --box-shadow: 0 6px 20px rgba(255, 215, 0, 0.5);
  width: 64px;
  height: 64px;
}

.safe-fab ion-fab-button ion-icon {
  font-size: 32px;
  font-weight: bold;
  color: #000000;
}

/* サブFABボタン */
.sub-fab {
  --box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  width: 48px;
  height: 48px;
}

.sub-fab ion-icon {
  font-size: 24px;
}
</style>