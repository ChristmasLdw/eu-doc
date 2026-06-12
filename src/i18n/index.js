/**
 * EU-DOC 多语言配置
 * 版本: 1.0.0
 *
 * 功能:
 * - 支持中英文切换
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
    },
    fallbackLng: 'zh', // 默认语言
    supportedLngs: ['zh', 'en'], // 支持的语言
    detection: {
      // 检测顺序：localStorage > 浏览器语言
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'], // 持久化到 localStorage
    },
    interpolation: {
      escapeValue: false, // React 已经防止 XSS
    },
  });

export default i18n;
