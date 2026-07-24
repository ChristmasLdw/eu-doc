import { getLanguageCode, getLanguageLocale } from '../i18n/languages';

const CATEGORY_LABELS = {
  en: {
    '运动户外': 'Sports & Outdoor',
    '个人防护与安全': 'Personal Safety & Protection',
    '个人防护用品': 'Personal Protective Equipment',
    '电子电器': 'Electronics & Electrical',
    '家居生活': 'Home & Living',
    '母婴儿童与玩具': 'Baby, Kids & Toys',
    '交通出行': 'Mobility & Transportation',
    '工业工具与机械': 'Industrial Tools & Machinery',
    '医疗健康': 'Medical & Health',
    '厨房与食品接触': 'Kitchen & Food Contact',
    '建筑材料与五金': 'Building Materials & Hardware',
    '其他 / 待分类': 'Other / Uncategorized',
  },
  de: {
    '运动户外': 'Sport & Outdoor',
    '个人防护与安全': 'Persönliche Sicherheit & Schutz',
    '个人防护用品': 'Persönliche Schutzausrüstung',
    '电子电器': 'Elektronik & Elektrotechnik',
    '家居生活': 'Haus & Wohnen',
    '母婴儿童与玩具': 'Baby, Kinder & Spielzeug',
    '交通出行': 'Mobilität & Verkehr',
    '工业工具与机械': 'Industriewerkzeuge & Maschinen',
    '医疗健康': 'Medizin & Gesundheit',
    '厨房与食品接触': 'Küche & Lebensmittelkontakt',
    '建筑材料与五金': 'Baustoffe & Beschläge',
    '其他 / 待分类': 'Sonstiges / Nicht kategorisiert',
  },
};

const PUBLIC_COPY = {
  zh: {
    notProvided: '未记录',
    pendingValue: '待企业补充',
    unavailable: '已失效',
    public: '已公开',
    notPublic: '暂未公开',
    pendingReview: '待审核',
  },
  en: {
    notProvided: 'Not provided',
    pendingValue: 'Not provided',
    unavailable: 'Unavailable',
    public: 'Public',
    notPublic: 'Not public yet',
    pendingReview: 'Pending review',
  },
  de: {
    notProvided: 'Nicht angegeben',
    pendingValue: 'Noch nicht angegeben',
    unavailable: 'Nicht verfügbar',
    public: 'Öffentlich',
    notPublic: 'Noch nicht öffentlich',
    pendingReview: 'Prüfung ausstehend',
  },
};

export function usesEnglishFallback(language = '') {
  return getLanguageCode(language) !== 'zh';
}

export function localizedField(item = {}, baseKey, language = 'zh') {
  if (!item) return '';
  const code = getLanguageCode(language);
  const snakeKey = baseKey.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  const original = item[baseKey] ?? item[snakeKey] ?? '';
  const localized = item[`${baseKey}${code[0].toUpperCase()}${code.slice(1)}`] ?? item[`${snakeKey}_${code}`] ?? '';
  const english = item[`${baseKey}En`] ?? item[`${snakeKey}_en`] ?? '';

  if (code === 'zh') return original || english;
  return localized || english || original;
}

export function categoryLabel(category, language = 'zh') {
  if (!category) return '';
  const code = getLanguageCode(language);
  return code === 'zh' ? category : (CATEGORY_LABELS[code]?.[category] || CATEGORY_LABELS.en[category] || category);
}

export function formatPublicDate(value, language = 'zh', fallback) {
  const code = getLanguageCode(language);
  const empty = fallback || PUBLIC_COPY[code].notProvided;
  if (!value) return empty;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return empty;
  return date.toLocaleDateString(getLanguageLocale(code), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function publicStatusLabel(item = {}, kind = 'document', language = 'zh') {
  const target = item || {};
  const copy = PUBLIC_COPY[getLanguageCode(language)];
  const verified = target.verificationStatus || target.verification_status;
  const review = target.reviewStatus || target.review_status;
  const status = target.status;
  const visible = target.publicVisible ?? target.public_visible;

  if (status === 'deleted' || status === 'inactive') return copy.unavailable;
  if (kind === 'company') return verified === 'verified' && visible !== 0 ? copy.public : copy.notPublic;
  if (kind === 'product') return (verified === 'verified' || verified === undefined) && visible !== 0 ? copy.public : copy.notPublic;
  if (review && review !== 'approved') return copy.pendingReview;
  return copy.public;
}

export function documentTypeLabel(typeOrDoc = {}, language = 'zh', variant = 'long') {
  const rawType = typeof typeOrDoc === 'string'
    ? typeOrDoc
    : (typeOrDoc.document_type || typeOrDoc.documentType || 'other');
  const type = rawType === 'declaration' ? 'declaration_of_conformity' : rawType === 'report' ? 'test_report' : rawType;
  const labels = {
    zh: {
      certificate: variant === 'short' ? '证书' : '资质证书',
      declaration_of_conformity: 'DoC 声明',
      manual: variant === 'short' ? '说明书' : '使用说明书',
      test_report: variant === 'short' ? '报告' : '检测报告',
      other: '其他资料',
    },
    en: {
      certificate: 'Certificate',
      declaration_of_conformity: 'DoC Declaration',
      manual: variant === 'short' ? 'Manual' : 'User Manual',
      test_report: variant === 'short' ? 'Report' : 'Test Report',
      other: 'Other Document',
    },
    de: {
      certificate: 'Zertifikat',
      declaration_of_conformity: 'Konformitätserklärung',
      manual: variant === 'short' ? 'Anleitung' : 'Bedienungsanleitung',
      test_report: variant === 'short' ? 'Prüfbericht' : 'Prüfbericht',
      other: 'Sonstiges Dokument',
    },
  };
  const dict = labels[getLanguageCode(language)];
  return dict[type] || dict.other;
}

export function valueOrPending(value, language = 'zh') {
  return value || PUBLIC_COPY[getLanguageCode(language)].pendingValue;
}
