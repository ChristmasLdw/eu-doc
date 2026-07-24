export const DEFAULT_LANGUAGE = 'zh';

export const LANGUAGE_OPTIONS = [
  { code: 'zh', label: '简体中文', flag: '🇨🇳', locale: 'zh-CN' },
  { code: 'en', label: 'English', flag: '🇬🇧', locale: 'en-GB' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', locale: 'de-DE' },
];

export const SUPPORTED_LANGUAGES = LANGUAGE_OPTIONS.map(({ code }) => code);

export function getLanguageCode(language = DEFAULT_LANGUAGE) {
  const normalized = String(language || '').toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : DEFAULT_LANGUAGE;
}

export function getLanguageLocale(language = DEFAULT_LANGUAGE) {
  const code = getLanguageCode(language);
  return LANGUAGE_OPTIONS.find((option) => option.code === code)?.locale || 'zh-CN';
}
