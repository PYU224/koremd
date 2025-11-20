import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MarkdownFile, ViewMode } from '@/types';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const useFileStore = defineStore('files', () => {
  const files = ref<MarkdownFile[]>([]);
  const currentFile = ref<MarkdownFile | null>(null);
  const viewMode = ref<ViewMode>('list');
  const searchQuery = ref('');

  const filteredFiles = computed(() => {
    if (!searchQuery.value) return files.value;
    const query = searchQuery.value.toLowerCase();
    return files.value.filter(file =>
      file.name.toLowerCase().includes(query) ||
      file.content.toLowerCase().includes(query)
    );
  });

  const STORAGE_KEY = 'koremd-files';
  const isNativePlatform = Capacitor.isNativePlatform();

  // ファイル一覧の読み込み
  async function loadFiles() {
    try {
      if (isNativePlatform) {
        const result = await Filesystem.readFile({
          path: 'files.json',
          directory: Directory.Data,
          encoding: Encoding.UTF8,
        });
        files.value = JSON.parse(result.data as string);
      } else {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          files.value = JSON.parse(data);
        }
      }
    } catch (error) {
      console.log('No existing files found, starting fresh');
      files.value = [];
    }
  }

  // ファイル一覧の保存
  async function saveFiles() {
    try {
      const data = JSON.stringify(files.value);
      if (isNativePlatform) {
        await Filesystem.writeFile({
          path: 'files.json',
          data: data,
          directory: Directory.Data,
          encoding: Encoding.UTF8,
        });
      } else {
        localStorage.setItem(STORAGE_KEY, data);
      }
    } catch (error) {
      console.error('Failed to save files:', error);
    }
  }

  // 新規ファイル作成
  function createFile(name: string = 'Untitled.md') {
    const newFile: MarkdownFile = {
      id: Date.now().toString(),
      name,
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    files.value.unshift(newFile);
    currentFile.value = newFile;
    saveFiles();
    return newFile;
  }

  // ファイル更新
  function updateFile(id: string, content: string, name?: string) {
    const file = files.value.find(f => f.id === id);
    if (file) {
      file.content = content;
      if (name) file.name = name;
      file.updatedAt = Date.now();
      saveFiles();
    }
  }

  // ファイル削除
  function deleteFile(id: string) {
    const index = files.value.findIndex(f => f.id === id);
    if (index !== -1) {
      files.value.splice(index, 1);
      if (currentFile.value?.id === id) {
        currentFile.value = null;
      }
      saveFiles();
    }
  }

  // ファイル選択
  function selectFile(id: string) {
    const file = files.value.find(f => f.id === id);
    if (file) {
      currentFile.value = file;
    }
  }

  // ファイルのエクスポート
  async function exportFile(file: MarkdownFile) {
    try {
      if (isNativePlatform) {
        const { Share } = await import('@capacitor/share');
        await Filesystem.writeFile({
          path: file.name,
          data: file.content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        
        const fileUri = await Filesystem.getUri({
          path: file.name,
          directory: Directory.Cache,
        });

        await Share.share({
          title: file.name,
          url: fileUri.uri,
          dialogTitle: 'Export Markdown File',
        });
      } else {
        // Web: ダウンロード
        const blob = new Blob([file.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export file:', error);
    }
  }

  // ファイルのインポート
  function importFile(name: string, content: string) {
    const newFile: MarkdownFile = {
      id: Date.now().toString(),
      name,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    files.value.unshift(newFile);
    saveFiles();
    return newFile;
  }

  return {
    files,
    currentFile,
    viewMode,
    searchQuery,
    filteredFiles,
    loadFiles,
    createFile,
    updateFile,
    deleteFile,
    selectFile,
    exportFile,
    importFile,
  };
});
