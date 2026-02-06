import { createApp } from 'vue';
import { IonicVue } from '@ionic/vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import i18n from './locales';

// --- これを追加してください ---
import { WifiDirect } from '@/plugins/wifi-direct';

// これにより Capacitor が WifiDirect を保持します
// （= ツリーシェイクされずに Android 側へ渡されるようになる）
;(window as any).WifiDirect = WifiDirect;

const app = createApp(App);
const pinia = createPinia();

app.use(IonicVue);
app.use(router);
app.use(pinia);
app.use(i18n);

router.isReady().then(() => {
  app.mount('#app');
});