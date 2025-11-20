import { createI18n } from 'vue-i18n';
import ja from './ja';
import en from './en';

export default createI18n({
  legacy: false,
  locale: 'ja',
  fallbackLocale: 'en',
  messages: {
    ja,
    en,
  },
});
