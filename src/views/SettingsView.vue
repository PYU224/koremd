<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <ion-icon :icon="arrowBackOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ t('settings.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <!-- 言語設定 -->
        <ion-list-header>
          <ion-label>{{ t('settings.language') }}</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-select
            v-model="currentLanguage"
            @ionChange="handleLanguageChange"
            interface="popover"
          >
            <ion-select-option value="ja">
              {{ t('settings.japanese') }}
            </ion-select-option>
            <ion-select-option value="en">
              {{ t('settings.english') }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <!-- フォントサイズ -->
        <ion-list-header>
          <ion-label>{{ t('settings.fontSize') }}</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-range
            v-model="fontSize"
            :min="12"
            :max="24"
            :pin="true"
            :ticks="true"
            :snaps="true"
            @ionChange="handleFontSizeChange"
          >
            <ion-label slot="start">12</ion-label>
            <ion-label slot="end">24</ion-label>
          </ion-range>
        </ion-item>

        <!-- フォント -->
        <ion-list-header>
          <ion-label>{{ t('settings.fontFamily') }}</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-select
            v-model="fontFamily"
            @ionChange="handleFontFamilyChange"
            interface="popover"
          >
            <ion-select-option value="system-ui">System</ion-select-option>
            <ion-select-option value="'Consolas', 'Monaco', monospace">
              Monospace
            </ion-select-option>
            <ion-select-option value="'Georgia', serif">
              Serif
            </ion-select-option>
            <ion-select-option value="'Arial', sans-serif">
              Sans-serif
            </ion-select-option>
          </ion-select>
        </ion-item>

        <!-- アプリについて -->
        <ion-list-header>
          <ion-label>{{ t('settings.about') }}</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-label>
            <h2>{{ t('app.name') }}</h2>
            <p>{{ t('settings.version') }}: 1.0.0</p>
            <p>{{ t('settings.license') }}: MIT</p>
            <p>{{ t('settings.supportMoldova') }}</p>
          </ion-label>
        </ion-item>

        <!-- GitHub リンク -->
        <ion-item
          button
          detail
          href="https://github.com"
          target="_blank"
        >
          <ion-icon :icon="logoGithub" slot="start" />
          <ion-label>GitHub</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
  IonListHeader,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonRange,
} from '@ionic/vue';
import { arrowBackOutline, logoGithub } from 'ionicons/icons';
import { useSettingsStore } from '@/stores/settingsStore';

const router = useRouter();
const { t, locale } = useI18n();
const settingsStore = useSettingsStore();

const currentLanguage = ref(settingsStore.settings.language);
const fontSize = ref(settingsStore.settings.fontSize);
const fontFamily = ref(settingsStore.settings.fontFamily);

onMounted(() => {
  currentLanguage.value = settingsStore.settings.language;
  fontSize.value = settingsStore.settings.fontSize;
  fontFamily.value = settingsStore.settings.fontFamily;
});

function goBack() {
  router.push('/');
}

function handleLanguageChange(event: CustomEvent) {
  const lang = event.detail.value as 'ja' | 'en';
  settingsStore.setLanguage(lang);
  locale.value = lang;
}

function handleFontSizeChange(event: CustomEvent) {
  settingsStore.setFontSize(event.detail.value);
}

function handleFontFamilyChange(event: CustomEvent) {
  settingsStore.setFontFamily(event.detail.value);
}
</script>

<style scoped>
ion-list-header {
  font-weight: 600;
  color: var(--ion-color-primary);
}
</style>
