<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { onMounted } from 'vue';
import { useFileStore } from '@/stores/fileStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useI18n } from 'vue-i18n';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

const fileStore = useFileStore();
const settingsStore = useSettingsStore();
const { locale } = useI18n();

onMounted(async () => {
  try {
    console.log('App initializing...');
    
    // 設定の読み込み
    settingsStore.loadSettings();
    locale.value = settingsStore.settings.language;
    console.log('Settings loaded:', settingsStore.settings);

    // ファイルの読み込み
    try {
      await fileStore.loadFiles();
      console.log('Files loaded:', fileStore.files.length);
    } catch (error) {
      console.error('Failed to load files:', error);
      // ファイル読み込み失敗は致命的ではないので続行
    }

    // スプラッシュスクリーンを非表示（ネイティブプラットフォームの場合のみ）
    if (Capacitor.isNativePlatform()) {
      try {
        // 最小表示時間を確保してから非表示
        await new Promise(resolve => setTimeout(resolve, 1000));
        await SplashScreen.hide();
        console.log('SplashScreen hidden');
      } catch (error) {
        console.error('Failed to hide splash screen:', error);
        // スプラッシュスクリーンの非表示失敗は無視
      }
    }
    
    console.log('App initialization complete');
  } catch (error) {
    console.error('Critical error during app initialization:', error);
    // エラーが発生してもアプリは起動させる
    if (Capacitor.isNativePlatform()) {
      try {
        await SplashScreen.hide();
      } catch (e) {
        console.error('Failed to hide splash screen after error:', e);
      }
    }
  }
});
</script>

<style>
@import '@ionic/vue/css/core.css';
@import '@ionic/vue/css/normalize.css';
@import '@ionic/vue/css/structure.css';
@import '@ionic/vue/css/typography.css';
@import '@ionic/vue/css/padding.css';
@import '@ionic/vue/css/float-elements.css';
@import '@ionic/vue/css/text-alignment.css';
@import '@ionic/vue/css/text-transformation.css';
@import '@ionic/vue/css/flex-utils.css';
@import '@ionic/vue/css/display.css';
@import 'highlight.js/styles/github.css';
@import './assets/fonts.css';

:root {
  --ion-color-primary: #0066cc;
  --ion-color-primary-rgb: 0, 102, 204;
  --ion-color-primary-contrast: #ffffff;
  --ion-color-primary-contrast-rgb: 255, 255, 255;
  --ion-color-primary-shade: #005ab3;
  --ion-color-primary-tint: #1a75d1;

  --ion-color-secondary: #dc143c;
  --ion-color-secondary-rgb: 220, 20, 60;
  --ion-color-secondary-contrast: #ffffff;
  --ion-color-secondary-contrast-rgb: 255, 255, 255;
  --ion-color-secondary-shade: #c21235;
  --ion-color-secondary-tint: #e02c50;

  --ion-color-tertiary: #ffd700;
  --ion-color-tertiary-rgb: 255, 215, 0;
  --ion-color-tertiary-contrast: #000000;
  --ion-color-tertiary-contrast-rgb: 0, 0, 0;
  --ion-color-tertiary-shade: #e0bd00;
  --ion-color-tertiary-tint: #ffdb1a;
}

* {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    'Helvetica Neue', Arial, sans-serif;
}
</style>