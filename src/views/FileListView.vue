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

    <ion-content>
      <!-- ファイルが無い場合 -->
      <div v-if="filteredFiles.length === 0" class="empty-state">
        <ion-icon :icon="documentTextOutline" class="empty-icon" />
        <p>{{ t('fileList.noFiles') }}</p>
      </div>

      <!-- リスト表示 -->
      <ion-list v-else-if="viewMode === 'list'">
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
      <div v-else class="grid-view">
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

      <!-- FAB: 新規作成 + インポート -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button>
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
        <ion-fab-list side="top">
          <ion-fab-button @click="createNewFile" color="primary">
            <ion-icon :icon="createOutline" />
          </ion-fab-button>
          <ion-fab-button @click="importFile" color="secondary">
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

async function importFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.md,.markdown,.txt';
  input.onchange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      const content = await file.text();
      const newFile = fileStore.importFile(file.name, content);
      router.push(`/editor/${newFile.id}`);
    }
  };
  input.click();
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
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  padding: 16px;
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
</style>
