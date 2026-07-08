const CATEGORY_LABELS = {
  '运动户外': 'Sports & Outdoor',
  '个人防护与安全': 'Personal Safety & Protection',
  '电子电器': 'Electronics & Electrical',
  '家居生活': 'Home & Living',
  '母婴儿童与玩具': 'Baby, Kids & Toys',
  '交通出行': 'Mobility & Transportation',
  '工业工具与机械': 'Industrial Tools & Machinery',
  '医疗健康': 'Medical & Health',
  '厨房与食品接触': 'Kitchen & Food Contact',
  '建筑材料与五金': 'Building Materials & Hardware',
  '其他 / 待分类': 'Other / Uncategorized',
};

export function isEnglishLanguage(language = '') {
  return String(language || '').toLowerCase().startsWith('en');
}

export function localizedField(item = {}, baseKey, language = 'zh') {
  if (!item) return '';
  const snakeKey = baseKey.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  const enCamel = `${baseKey}En`;
  const enSnake = `${snakeKey}_en`;
  const original = item[baseKey] ?? item[snakeKey] ?? '';
  const english = item[enCamel] ?? item[enSnake] ?? '';
  return isEnglishLanguage(language) ? (english || original) : (original || english);
}

export function categoryLabel(category, language = 'zh') {
  if (!category) return '';
  return isEnglishLanguage(language) ? (CATEGORY_LABELS[category] || category) : category;
}

export function formatPublicDate(value, language = 'zh', fallback) {
  const empty = fallback || (isEnglishLanguage(language) ? 'Not provided' : '未记录');
  if (!value) return empty;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return empty;
  return date.toLocaleDateString(isEnglishLanguage(language) ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function publicStatusLabel(item = {}, kind = 'document', language = 'zh') {
  const target = item || {};
  const verified = target.verificationStatus || target.verification_status;
  const review = target.reviewStatus || target.review_status;
  const status = target.status;
  const visible = target.publicVisible ?? target.public_visible;
  const en = isEnglishLanguage(language);

  if (status === 'deleted' || status === 'inactive') return en ? 'Unavailable' : '已失效';
  if (kind === 'company') {
    if (verified === 'verified' && visible !== 0) return en ? 'Public' : '已公开';
    return en ? 'Not public yet' : '暂未公开';
  }
  if (kind === 'product') {
    if ((verified === 'verified' || verified === undefined) && visible !== 0) return en ? 'Public' : '已公开';
    return en ? 'Not public yet' : '暂未公开';
  }
  if (review && review !== 'approved') return en ? 'Pending review' : '待审核';
  return en ? 'Public' : '已公开';
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
      certificate: variant === 'short' ? 'Certificate' : 'Certificate',
      declaration_of_conformity: 'DoC Declaration',
      manual: variant === 'short' ? 'Manual' : 'User Manual',
      test_report: variant === 'short' ? 'Report' : 'Test Report',
      other: 'Other Document',
    },
  };
  const dict = isEnglishLanguage(language) ? labels.en : labels.zh;
  return dict[type] || dict.other;
}

export function valueOrPending(value, language = 'zh') {
  return value || (isEnglishLanguage(language) ? 'Not provided' : '待企业补充');
}
