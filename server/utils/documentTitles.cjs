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

const DOWNLOAD_TYPE_LABELS = {
  certificate: 'Certificate',
  declaration_of_conformity: 'DoC',
  manual: 'Manual',
  other: 'Document',
};

const MIME_EXTENSIONS = {
  'application/msword': 'doc',
  'application/pdf': 'pdf',
  'application/rtf': 'rtf',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'text/plain': 'txt',
};

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

function safeDownloadSegment(value, fallback) {
  const withoutControls = Array.from(
    String(value || '').normalize('NFKC'),
    (character) => character.codePointAt(0) < 32 ? '-' : character
  ).join('');
  const normalized = withoutControls
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/[\s,，、;；_]+/g, '-')
    .replace(/\.{2,}/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 60);
  return normalized || fallback;
}

function downloadFileExtension(document = {}) {
  const candidates = [document.original_filename, document.file_path];
  for (const candidate of candidates) {
    const extension = path.extname(String(candidate || '').split(/[?#]/)[0]).slice(1).toLowerCase();
    if (/^[a-z0-9]{1,10}$/.test(extension)) return extension;
  }
  return MIME_EXTENSIONS[String(document.mime_type || '').toLowerCase()] || 'bin';
}

function buildDocumentDownloadFilename(document = {}) {
  const normalizedType = document.document_type === 'declaration'
    ? 'declaration_of_conformity'
    : document.document_type;
  const model = safeDownloadSegment(
    document.product_model || document.model,
    `EU-P-${String(document.product_id || 0).padStart(6, '0')}`
  );
  const type = DOWNLOAD_TYPE_LABELS[normalizedType] || DOWNLOAD_TYPE_LABELS.other;
  const language = safeDownloadSegment(String(document.language || 'UND').toUpperCase(), 'UND');
  const metadata = document.certificate_metadata || {};
  const identifier = safeDownloadSegment(
    metadata.cert_no || document.cert_no || document.version || document.document_no || document.file_no,
    `EU-D-${String(document.id || 0).padStart(6, '0')}`
  );
  return `${model}_${type}_${language}_${identifier}.${downloadFileExtension(document)}`;
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
  buildDocumentDownloadFilename,
  buildDocumentDisplayTitle,
  downloadFileExtension,
  internalTitleFromFilename,
  normalizeLanguage,
  normalizePublicTitle,
  requestLanguage,
  validatePublicTitle,
  withDocumentDisplayTitle,
};
