const path = require('path');

const DOCUMENT_TYPE_LABELS = {
  zh: {
    certificate: '资质证书',
    declaration_of_conformity: 'DoC 声明',
    manual: '使用说明书',
    other: '其他资料',
  },
  en: {
    certificate: 'Certificate',
    declaration_of_conformity: 'DoC Declaration',
    manual: 'User Manual',
    other: 'Other Document',
  },
  de: {
    certificate: 'Zertifikat',
    declaration_of_conformity: 'Konformitätserklärung',
    manual: 'Bedienungsanleitung',
    other: 'Sonstiges Dokument',
  },
};

const PUBLIC_TITLE_FILE_EXTENSION = /\.(?:avif|bmp|docx?|gif|jpe?g|odt|pdf|png|pptx?|rtf|svg|tiff?|webp|xlsx?)$/i;

function normalizeLanguage(value = 'zh') {
  const language = String(value || 'zh').toLowerCase();
  if (language.startsWith('de')) return 'de';
  if (language.startsWith('en')) return 'en';
  return 'zh';
}

function requestLanguage(req) {
  return normalizeLanguage(req?.query?.lang || req?.headers?.['accept-language'] || 'zh');
}

function normalizePublicTitle(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value)
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(PUBLIC_TITLE_FILE_EXTENSION, '')
    .trim();
  return normalized || null;
}

function validatePublicTitle(value) {
  const normalized = normalizePublicTitle(value);
  const length = normalized ? Array.from(normalized).length : 0;
  if (normalized && (length < 2 || length > 80)) {
    const error = new Error('公开资料名称需为 2–80 个字符');
    error.code = 'INVALID_PUBLIC_TITLE';
    throw error;
  }
  return normalized;
}

function internalTitleFromFilename(filename, fallback = 'Document') {
  const basename = path.basename(String(filename || '').trim());
  const withoutExtension = basename.replace(/\.[^.]+$/, '');
  return withoutExtension.replace(/\s+/g, ' ').trim() || fallback;
}

function localizedName(document, key, language) {
  const original = document?.[key] || '';
  const english = document?.[`${key}_en`] || '';
  return language === 'zh' ? (original || english) : (english || original);
}

function documentTypeLabel(type, language = 'zh') {
  const lang = normalizeLanguage(language);
  const normalizedType = type === 'declaration' ? 'declaration_of_conformity' : type;
  return DOCUMENT_TYPE_LABELS[lang][normalizedType] || DOCUMENT_TYPE_LABELS[lang].other;
}

function alreadyIncludesCompany(title, companyName) {
  const normalizedTitle = String(title || '').trim().toLocaleLowerCase();
  const normalizedCompany = String(companyName || '').trim().toLocaleLowerCase();
  if (!normalizedTitle || !normalizedCompany) return false;
  if (normalizedTitle === normalizedCompany) return true;
  return [' · ', ' - ', ' — ', ': '].some((separator) => normalizedTitle.startsWith(`${normalizedCompany}${separator}`));
}

function buildDocumentDisplayTitle(document = {}, language = 'zh') {
  const lang = normalizeLanguage(language);
  const companyName = localizedName(document, 'company_name', lang);
  const productName = localizedName(document, 'product_name', lang) || document.product_model || '';
  const customTitle = normalizePublicTitle(document.public_title);
  const generatedTitle = [productName, documentTypeLabel(document.document_type, lang)].filter(Boolean).join(' · ');
  const titleCore = customTitle || generatedTitle || documentTypeLabel(document.document_type, lang);
  if (!companyName || alreadyIncludesCompany(titleCore, companyName)) return titleCore;
  return `${companyName} · ${titleCore}`;
}

function withDocumentDisplayTitle(document, language = 'zh') {
  if (!document) return document;
  return { ...document, display_title: buildDocumentDisplayTitle(document, language) };
}

module.exports = {
  buildDocumentDisplayTitle,
  internalTitleFromFilename,
  normalizeLanguage,
  normalizePublicTitle,
  requestLanguage,
  validatePublicTitle,
  withDocumentDisplayTitle,
};
