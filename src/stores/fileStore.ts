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
  // ✅ アトミック書き込み用: 本体ファイルと一時ファイルのパスを分離
  const FILES_PATH = 'files.json';
  const FILES_TMP_PATH = 'files.json.tmp';
  const isNativePlatform = Capacitor.isNativePlatform();

  // ファイル一覧の読み込み
  async function loadFiles() {
    if (!isNativePlatform) {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          files.value = JSON.parse(data);
        }
      } catch (error) {
        console.log('No existing files found, starting fresh');
        files.value = [];
      }
      return;
    }

    // ネイティブ環境: まずは正規のファイルを読み込む
    try {
      const result = await Filesystem.readFile({
        path: FILES_PATH,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      files.value = JSON.parse(result.data as string);
      return;
    } catch (error) {
      console.log('files.json not found or unreadable, checking recovery file...');
    }

    // ✅ クラッシュ復旧: 「一時ファイルへの書き込みは成功したが rename する前に
    // アプリが強制終了した」場合に備え、一時ファイルからの復元を試みる。
    // (通常のrename成功時は一時ファイルは消費されて存在しないため、
    //  ここに到達するのは異常終了があった場合のみ)
    try {
      const tmpResult = await Filesystem.readFile({
        path: FILES_TMP_PATH,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      files.value = JSON.parse(tmpResult.data as string);
      console.warn('Recovered files from files.json.tmp (previous save may have been interrupted)');
      // 復旧できたデータを正規のファイルとして保存し直しておく
      await saveFiles();
    } catch (recoveryError) {
      console.log('No existing files found (including recovery file), starting fresh');
      files.value = [];
    }
  }

  // ✅ 保存処理を直列化するためのキュー。
  // createFile/updateFile/deleteFile等から立て続けにsaveFiles()が呼ばれても、
  // 書き込みが同時並行で走って一時ファイルを壊すことがないようにする。
  let saveQueue: Promise<void> = Promise.resolve();

  // ファイル一覧の保存（呼び出し側は await してもしなくても良い）
  function saveFiles(): Promise<void> {
    saveQueue = saveQueue
      .catch(() => {
        // 直前の保存が失敗していてもキューは止めない
      })
      .then(() => performSave());
    return saveQueue;
  }

  async function performSave() {
    const data = JSON.stringify(files.value);

    if (!isNativePlatform) {
      try {
        localStorage.setItem(STORAGE_KEY, data);
      } catch (error) {
        console.error('Failed to save files:', error);
      }
      return;
    }

    // ✅ アトミック書き込み: 一時ファイルに書き込んでから rename で本体に反映する。
    // rename は同一ファイルシステム上ではOSレベルでアトミックに実行されるため、
    // 途中でアプリが強制終了しても files.json 本体は「直前の正常な状態」のまま
    // 残り、全ファイル消失には繋がらない。
    try {
      await Filesystem.writeFile({
        path: FILES_TMP_PATH,
        data,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });

      await Filesystem.rename({
        from: FILES_TMP_PATH,
        to: FILES_PATH,
        directory: Directory.Data,
      });
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
    currentFile.value = { ...newFile }; // ✅ 深いコピーを作成
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
      // ✅ 深いコピーを作成して参照の問題を回避
      currentFile.value = { ...file };
      console.log('Selected file:', currentFile.value.id);
    } else {
      currentFile.value = null;
      console.warn('File not found:', id);
    }
  }

  // ✅ 追加: currentFileをクリアする関数
  function clearCurrentFile() {
    console.log('Clearing current file');
    currentFile.value = null;
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
    clearCurrentFile, // ✅ 追加
  };
});