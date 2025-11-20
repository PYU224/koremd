import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { AppSettings } from '@/types';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({
    language: 'ja',
    fontSize: 16,
    fontFamily: 'system-ui',
    theme: 'light',
  });

  const STORAGE_KEY = 'koremd-settings';

  // 設定の読み込み
  function loadSettings() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      settings.value = { ...settings.value, ...JSON.parse(data) };
    } else {
      // システム言語を検出
      const browserLang = navigator.language.toLowerCase();
      settings.value.language = browserLang.startsWith('ja') ? 'ja' : 'en';
      saveSettings();
    }
  }

  // 設定の保存
  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
  }

  // 言語変更
  function setLanguage(lang: 'ja' | 'en') {
    settings.value.language = lang;
    saveSettings();
  }

  // フォントサイズ変更
  function setFontSize(size: number) {
    settings.value.fontSize = Math.max(12, Math.min(24, size));
    saveSettings();
  }

  // フォント変更
  function setFontFamily(font: string) {
    settings.value.fontFamily = font;
    saveSettings();
  }

  // テーマ変更
  function setTheme(theme: 'light' | 'dark') {
    settings.value.theme = theme;
    saveSettings();
  }

  return {
    settings,
    loadSettings,
    setLanguage,
    setFontSize,
    setFontFamily,
    setTheme,
  };
});
