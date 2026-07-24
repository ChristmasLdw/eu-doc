/**
 * EU-DOC 多语言配置
 * 版本: 1.0.0
 *
 * 功能:
 * - 支持可配置的多语言切换
 * - 自动检测浏览器语言
 * - 持久化语言选择到 localStorage
 *
 * 使用:
 * import { useTranslation } from 'react-i18next';
 * const { t, i18n } = useTranslation();
 * <h1>{t('common.welcome')}</h1>
 * i18n.changeLanguage('en'); // 切换语言
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zh from './locales/zh.json';
import en from './locales/en.json';
import de from './locales/de.json';
import { DEFAULT_LANGUAGE, getLanguageCode, SUPPORTED_LANGUAGES } from './languages';

i18n
  // 检测浏览器语言
  .use(LanguageDetector)
  // 绑定 React
  .use(initReactI18next)
  // 初始化配置
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
      de: { translation: de },
    },
    fallbackLng: { de: ['en'], default: [DEFAULT_LANGUAGE] },
    supportedLngs: SUPPORTED_LANGUAGES,
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    detection: {
      // 检测顺序：localStorage > 浏览器语言
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'], // 持久化到 localStorage
    },
    interpolation: {
      escapeValue: false, // React 已经防止 XSS
    },
  });

if (typeof document !== 'undefined') {
  const syncDocumentLanguage = (language) => {
    document.documentElement.lang = getLanguageCode(language);
    document.title = i18n.t('meta.siteTitle');
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', i18n.t('meta.siteDescription'));
  };
  syncDocumentLanguage(i18n.resolvedLanguage || i18n.language);
  i18n.on('languageChanged', syncDocumentLanguage);
}

export default i18n;
