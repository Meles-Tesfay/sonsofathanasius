import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import am from './locales/am.json';
import en from './locales/en.json';
import om from './locales/om.json';
import ti from './locales/ti.json';

const savedLang = (typeof window !== 'undefined' && localStorage.getItem('user_lang')) || 'am';

i18n.use(initReactI18next).init({
  resources: {
    am: { translation: am },
    en: { translation: en },
    om: { translation: om },
    ti: { translation: ti },
  },
  lng: savedLang,
  fallbackLng: 'am',
  interpolation: {
    escapeValue: false,
  },
});

// Update root HTML element attributes on language change
if (typeof document !== 'undefined') {
  document.documentElement.lang = savedLang;
  if (savedLang === 'am' || savedLang === 'ti') {
    document.documentElement.classList.add('font-ethiopic');
    document.documentElement.classList.remove('font-latin');
  } else {
    document.documentElement.classList.add('font-latin');
    document.documentElement.classList.remove('font-ethiopic');
  }
}

i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_lang', lng);
    document.documentElement.lang = lng;
    if (lng === 'am' || lng === 'ti') {
      document.documentElement.classList.add('font-ethiopic');
      document.documentElement.classList.remove('font-latin');
    } else {
      document.documentElement.classList.add('font-latin');
      document.documentElement.classList.remove('font-ethiopic');
    }
  }
});

export default i18n;
