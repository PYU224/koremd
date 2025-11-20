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

const fileStore = useFileStore();
const settingsStore = useSettingsStore();
const { locale } = useI18n();

onMounted(async () => {
  // 設定の読み込み
  settingsStore.loadSettings();
  locale.value = settingsStore.settings.language;

  // ファイルの読み込み
  await fileStore.loadFiles();

  // スプラッシュスクリーンを非表示
  setTimeout(() => {
    SplashScreen.hide();
  }, 1000);
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