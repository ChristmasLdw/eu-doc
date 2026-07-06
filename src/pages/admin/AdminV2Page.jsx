import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../../contexts/AdminContext';
import * as api from '../../services/api';
import styles from './AdminV2Page.module.css';

const fallbackCompanies = [];

const personalMenus = [
  { id: 'profile', labelKey: 'admin.menu.profile' },
  { id: 'security', labelKey: 'admin.menu.security' },
  { id: 'notifications', labelKey: 'admin.menu.notifications' },
];

const companyMenus = [
  { id: 'company-info', labelKey: 'admin.menu.companyInfo' },
  { id: 'products', labelKey: 'admin.menu.products' },
  { id: 'files', labelKey: 'admin.menu.files' },
  { id: 'members', labelKey: 'admin.menu.members' },
  { id: 'verification', labelKey: 'admin.menu.verification' },
  { id: 'plans', labelKey: 'admin.menu.plans' },
  { id: 'logs', labelKey: 'admin.menu.logs' },
];

const platformMenus = [
  { id: 'company-review', labelKey: 'admin.menu.companyReview' },
  { id: 'users', labelKey: 'admin.menu.userManagement' },
  { id: 'categories', labelKey: 'admin.menu.reports' },
  { id: 'reports', labelKey: 'admin.menu.reports' },
  { id: 'system', labelKey: 'admin.menu.system' },
];


const PRODUCT_CLASSIFICATION_RULES = [
  {
    consumer: ['运动户外', '马术用品', '马术头盔'],
    compliance: ['PPE / 个人防护法规'],
    standards: [/\bEN\s*1384\b/i, /\bVG1\b/i],
    keywords: [/equestrian/i, /riding helmet/i, /horse riding/i, /马术|骑马/],
    reason: '识别到马术头盔关键词或 EN 1384 / VG1 标准',
  },
  {
    consumer: ['运动户外', '自行车用品', '自行车头盔'],
    compliance: ['PPE / 个人防护法规'],
    standards: [/\bEN\s*1078\b/i],
    keywords: [/bicycle helmet/i, /bike helmet/i, /cycling helmet/i, /skate helmet/i, /自行车头盔|骑行头盔/],
    reason: '识别到骑行头盔关键词或 EN 1078 标准',
  },
  {
    consumer: ['母婴儿童与玩具', '儿童玩具'],
    compliance: ['Toy Safety 玩具安全'],
    standards: [/\bEN\s*71\b/i],
    keywords: [/toy/i, /children.*toy/i, /玩具/],
    reason: '识别到玩具关键词或 EN 71 标准',
  },
  {
    consumer: ['电子电器', '电源与充电', '充电器'],
    compliance: ['LVD 低电压', 'EMC 电磁兼容', 'RoHS / REACH'],
    standards: [/\bEN\s*60335\b/i, /\bEN\s*62368\b/i, /\bEN\s*55032\b/i, /\bEN\s*55035\b/i, /\bEN\s*61000\b/i],
    keywords: [/charger/i, /adapter/i, /power supply/i, /充电器|适配器|电源/],
    reason: '识别到电源/充电器关键词或电子电器常见标准',
  },
  {
    consumer: ['电子电器', '音视频设备'],
    compliance: ['EMC 电磁兼容', 'LVD 低电压'],
    standards: [/\bEN\s*62368\b/i, /\bEN\s*55032\b/i, /\bEN\s*55035\b/i],
    keywords: [/audio/i, /speaker/i, /video/i, /音响|音频|视频/],
    reason: '识别到音视频设备关键词或 EN 62368 / EMC 标准',
  },
  {
    consumer: ['个人防护与安全', '眼面防护'],
    compliance: ['PPE / 个人防护法规'],
    standards: [/\bEN\s*166\b/i],
    keywords: [/goggle/i, /safety glasses/i, /face shield/i, /护目镜|面罩/],
    reason: '识别到眼面防护关键词或 EN 166 标准',
  },
  {
    consumer: ['个人防护与安全', '手部/足部防护'],
    compliance: ['PPE / 个人防护法规'],
    standards: [/\bEN\s*388\b/i, /\bEN\s*ISO\s*20345\b/i],
    keywords: [/glove/i, /safety shoe/i, /protective footwear/i, /手套|安全鞋|防护鞋/],
    reason: '识别到手足防护关键词或 EN 388 / EN ISO 20345 标准',
  },
  {
    consumer: ['医疗健康', '护理用品'],
    compliance: ['Medical Device 医疗器械'],
    standards: [/\bEN\s*14683\b/i, /\bEN\s*149\b/i],
    keywords: [/mask/i, /respirator/i, /medical/i, /口罩|医用|防护口罩/],
    reason: '识别到口罩/医疗关键词或 EN 14683 / EN 149 标准',
  },
  {
    consumer: ['工业工具与机械', '机械设备'],
    compliance: ['Machinery 机械设备'],
    standards: [/\bEN\s*ISO\s*12100\b/i, /\bEN\s*60204\b/i],
    keywords: [/machinery/i, /machine/i, /机械|设备/],
    reason: '识别到机械设备关键词或机械安全标准',
  },
  {
    consumer: ['厨房与食品接触'],
    compliance: ['RoHS / REACH'],
    standards: [/food contact/i, /LFGB/i],
    keywords: [/food contact/i, /kitchen/i, /tableware/i, /cookware/i, /食品接触|厨具|餐具/],
    reason: '识别到食品接触或厨房用品关键词',
  },
];

function findCategoryByNamePath(categories, pathNames) {
  let parentId = '';
  let matched = null;
  for (const name of pathNames || []) {
    matched = categories.find((category) => category.name === name && String(category.parentId || '') === String(parentId || ''));
    if (!matched) return null;
    parentId = matched.id;
  }
  return matched;
}

function scoreClassificationRule(rule, text) {
  let score = 0;
  const signals = [];
  (rule.standards || []).forEach((pattern) => {
    if (pattern.test(text)) {
      score += 6;
      signals.push(pattern.source.replaceAll('\\b', '').replaceAll('\\s*', ' ').replaceAll('\\', ''));
    }
  });
  (rule.keywords || []).forEach((pattern) => {
    if (pattern.test(text)) {
      score += 3;
      signals.push(pattern.source.replaceAll('\\', ''));
    }
  });
  return { score, signals };
}

function suggestProductClassificationLocal({ product, documents, consumerCategories, complianceCategories }) {
  const text = [
    product.name,
    product.nameEn,
    (product.models || []).join(' '),
    product.description,
    product.descriptionEn,
    product.material,
    product.usageScenario,
    ...(documents || []).flatMap((doc) => [doc.name, doc.type, doc.documentType, doc.standard, doc.issuer, doc.certNo]),
  ].filter(Boolean).join(' ').replace(/[_-]+/g, ' ');
  if (!text.trim()) return null;

  const ranked = PRODUCT_CLASSIFICATION_RULES
    .map((rule) => ({ rule, ...scoreClassificationRule(rule, text) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best) return null;

  const consumerCategory = findCategoryByNamePath(consumerCategories, best.rule.consumer);
  const compliance = (best.rule.compliance || []).map((name) => complianceCategories.find((category) => category.name === name)).filter(Boolean);
  return {
    consumerCategoryId: consumerCategory?.id || '',
    consumerCategoryPath: best.rule.consumer.join(' / '),
    complianceCategoryIds: compliance.map((category) => Number(category.id)),
    complianceCategoryPaths: compliance.map((category) => category.name),
    confidence: best.score >= 6 ? '高可信' : '中可信',
    reason: best.rule.reason,
    matchedSignals: best.signals.slice(0, 5),
  };
}

const products = [
  { name: 'Equestrian Helmet F20', model: 'F20-201AL', category: '个人防护用品 / 马术头盔', files: 3, status: '公开' },
  { name: 'Riding Helmet F20-202', model: 'F20-202AL', category: '个人防护用品 / 马术头盔', files: 2, status: '草稿' },
  { name: 'Safety Helmet Pro', model: 'SH-900', category: '个人防护用品 / 安全帽', files: 0, status: '待补充' },
];

const documents = [
  { name: 'CE Certificate - F20', type: '资质证书', product: 'Equestrian Helmet F20', lang: 'EN', backup: '已备份' },
  { name: 'Declaration of Conformity', type: 'DoC声明文件', product: 'Equestrian Helmet F20', lang: 'EN / DE', backup: '已备份' },
  { name: 'User Manual', type: '使用说明书', product: 'Riding Helmet F20-202', lang: 'ZH / EN', backup: '待备份' },
];

function FieldGrid({ fields }) {
  return (
    <div className={styles.fieldGrid}>
      {fields.map((field) => (
        <label key={field.label} className={styles.field}>
          <span>{field.label}</span>
          <input value={field.value || ''} readOnly placeholder={field.placeholder || '待填写'} />
        </label>
      ))}
    </div>
  );
}

function StatusPill({ children, tone = 'blue' }) {
  return <span className={`${styles.pill} ${styles[tone]}`}>{children}</span>;
}


function getImportGroupKey(item) {
  const model = (item.guessedModels || item.guessedModel || '').trim() || item.originalName.replace(/[_\-. ](en|de|fr|zh|es|it|nl|pl|pt|cs|sv|da|fi)(\.[a-z0-9]+)?$/i, '');
  const type = item.guessedType || 'other';
  return `${type}__${model.toUpperCase()}`;
}

function buildImportGroups(items) {
  const groups = new Map();
  items.forEach((item) => {
    if (item.status !== 'pending') return;
    const key = getImportGroupKey(item);
    if (!groups.has(key)) groups.set(key, { key, items: [], type: item.guessedType || 'other', model: item.guessedModels || item.guessedModel || '', suggestedName: item.suggestedProductName || '' });
    const group = groups.get(key);
    group.items.push(item);
    if (!group.suggestedName && item.suggestedProductName) group.suggestedName = item.suggestedProductName;
    if (!group.model && (item.guessedModels || item.guessedModel)) group.model = item.guessedModels || item.guessedModel;
  });
  return [...groups.values()].map((group) => ({
    ...group,
    items: group.items.sort((a, b) => Number(a.id) - Number(b.id)),
    languages: [...new Set(group.items.map((item) => item.guessedLanguage || 'en'))],
    suggestedName: group.suggestedName || group.model || '新产品',
  }));
}



function getImportSuggestedClassification(group = {}) {
  const suggestions = (group.items || []).map((item) => item.suggestedClassification).filter(Boolean);
  if (!suggestions.length) return null;
  const score = { high: 3, medium: 2, low: 1 };
  const best = [...suggestions].sort((a, b) => (score[b.confidence] || 0) - (score[a.confidence] || 0))[0];
  return {
    ...best,
    complianceCategoryIds: [...new Set(suggestions.flatMap((item) => item.complianceCategoryIds || []).map(String))],
    complianceCategoryPaths: [...new Set(suggestions.flatMap((item) => item.complianceCategoryPaths || []))],
    matchedSignals: [...new Set(suggestions.flatMap((item) => item.matchedSignals || []))].slice(0, 6),
  };
}

function buildCategoryChain(categoryId, byId) {
  const chain = [];
  let current = categoryId ? byId.get(String(categoryId)) : null;
  let guard = 0;
  while (current && guard < 5) {
    chain.unshift(current);
    current = current.parentId ? byId.get(String(current.parentId)) : null;
    guard += 1;
  }
  return chain;
}

function getImportConfidence(group) {
  const hasModel = Boolean(group.model);
  const hasLanguages = group.items.every((item) => item.guessedLanguage);
  const sameType = new Set(group.items.map((item) => item.guessedType || 'other')).size === 1;
  if (hasModel && hasLanguages && sameType) return { label: '高可信', tone: 'green', desc: '型号、类型和语言都较明确' };
  if (hasModel && sameType) return { label: '中可信', tone: 'orange', desc: '型号和类型基本明确，建议确认语言' };
  return { label: '低可信', tone: 'red', desc: '识别信息不足，建议仔细检查' };
}


function emptyDocumentModalState(overrides = {}) {
  return {
    open: false,
    mode: 'upload',
    source: 'generic',
    doc: null,
    docs: [],
    title: '',
    productId: '',
    productName: '',
    documentType: 'certificate',
    language: 'en',
    certNo: '',
    standard: '',
    issuer: '',
    file: null,
    filePreviewUrl: '',
    lockedProduct: false,
    lockedType: false,
    ...overrides,
  };
}

function inferLanguageFromFileName(fileName = '') {
  const text = String(fileName).toLowerCase();
  const matched = text.match(/(?:^|[_\-. ])(zh|cn|en|de|fr|es|it|nl|pl|pt|cs|sv|da|fi)(?:[_\-. ]|$)/);
  if (!matched) return 'en';
  if (matched[1] === 'cn') return 'zh';
  return matched[1];
}

function titleFromFileName(fileName = '') {
  return String(fileName || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
}

function documentFileExt(fileName = '') {
  const ext = String(fileName || '').split('.').pop();
  return ext && ext !== fileName ? ext.toUpperCase().slice(0, 4) : 'FILE';
}


function toEuDocAssetUrl(value = '') {
  if (!value) return '';
  const text = String(value);
  if (/^(https?:|blob:|data:)/i.test(text)) return text;
  if (text.startsWith('/eu-doc/')) return text;
  if (text.startsWith('/uploads/')) return `/eu-doc${text}`;
  if (text.startsWith('/documents/') || text.startsWith('/certificates/')) return `/eu-doc/uploads${text}`;
  if (text.startsWith('/')) return `/eu-doc${text}`;
  return text;
}

function getDocumentAssetUrl(item = {}) {
  if (!item) return '';
  return toEuDocAssetUrl(item.fileUrl || item.filePath || item.file_path || item.path || '');
}

function hasDocumentRecord(doc) {
  return Boolean(doc && (doc.id || doc.name || doc.title || getDocumentAssetUrl(doc)));
}

function isImageUrl(url = '') {
  return /\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/i.test(url);
}

function getUploadResultFileUrl(result = {}) {
  return getDocumentAssetUrl(result.data || result) || getDocumentAssetUrl({ filePath: result.file_path || result.filePath });
}

function importTypeLabel(type) {
  if (type === 'declaration_of_conformity') return 'DoC声明文件';
  if (type === 'certificate') return '资质证书';
  if (type === 'manual') return '使用说明书';
  return '其他资料';
}

function importStepClass(styles, confirmedStep = 0, step) {
  if (confirmedStep >= step) return `${styles.importQuestion} ${styles.questionDone}`;
  if (confirmedStep + 1 === step) return `${styles.importQuestion} ${styles.questionActive}`;
  return `${styles.importQuestion} ${styles.questionWaiting}`;
}


function splitProductTitle(title) {
  const fallback = title || '未命名产品';
  const text = String(fallback).trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 3) return [fallback];

  const modelLike = (word) => /\d/.test(word) && /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(word);
  const modelLeadWords = new Set(['model', 'type', 'series', 'no.', 'no']);
  const firstModelIndex = words.findIndex((word, index) => index >= 1 && modelLike(word));

  if (firstModelIndex >= 2) {
    let splitIndex = firstModelIndex;
    const previous = words[firstModelIndex - 1]?.toLowerCase();
    if (firstModelIndex >= 3 && modelLeadWords.has(previous)) {
      splitIndex = firstModelIndex - 1;
    }
    return [words.slice(0, splitIndex).join(' '), words.slice(splitIndex).join(' ')];
  }

  return [text];
}

function SmartProductTitle({ title }) {
  const parts = splitProductTitle(title);
  return (
    <>
      {parts.map((part, index) => <span key={`${part}-${index}`} className={styles.smartTitleLine}>{part}</span>)}
    </>
  );
}

function getVerificationDisplay(company = {}) {
  const rawStatus = company.verificationStatus || company.verification_status || '';
  const lifecycleStatus = company.rawStatus || company.statusRaw || company.companyStatus || company.status || '';
  if (rawStatus === 'verified' || company.status === '已认证') {
    return { label: '已认证', tone: 'verified', step: 4, desc: '企业认证已通过，公司资料可公开展示。' };
  }
  if (rawStatus === 'rejected') {
    return { label: '未通过', tone: 'rejected', step: 2, desc: '认证资料未通过审核，请修改后重新提交。' };
  }
  if (rawStatus === 'pending') {
    const isDraft = lifecycleStatus === 'draft';
    return { label: isDraft ? '草稿待审核' : '待平台审核', tone: 'pending', step: 3, desc: isDraft ? '公司已创建，但尚未通过平台审核，暂不会公开展示。' : '认证资料已提交，正在等待平台审核。' };
  }
  return { label: '待提交认证', tone: 'draft', step: 1, desc: '请补充企业资料并提交认证材料。' };
}

function splitImportModels(modelText) {
  return (modelText || '').split(/[,，/\n]+/).map((item) => item.trim()).filter(Boolean);
}

function normalizeImportText(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function inferImportType(item, groupType = 'other') {
  const current = item?.guessedType || groupType || 'other';
  if (current !== 'other') return current;
  const name = item?.originalName || '';
  const hasModel = Boolean(item?.guessedModels || item?.guessedModel);
  const hasLanguage = /[_\-. ](en|de|fr|zh|es|it|nl|pl|pt|cs|sv|da|fi)(\.[a-z0-9]+)?$/i.test(name);
  if (hasModel && hasLanguage) return 'declaration_of_conformity';
  return current;
}

function findMatchingProductId(group, products) {
  const models = splitImportModels(group.model);
  const groupTexts = [group.model, group.suggestedName, ...models].map(normalizeImportText).filter(Boolean);
  const matched = products.find((product) => {
    const productTexts = [product.name, product.model].map(normalizeImportText).filter(Boolean);
    return groupTexts.some((text) => productTexts.some((target) => target.includes(text) || text.includes(target)));
  });
  return matched ? String(matched.id) : '';
}

function findMatchingProduct(group, products) {
  const id = findMatchingProductId(group, products);
  return products.find((product) => String(product.id) === String(id)) || null;
}

function getProductDocuments(product, docs) {
  return docs.filter((doc) => String(doc.productId || '') === String(product.id || '') || doc.product === product.name);
}

function getProductFileStatus(product, docs) {
  const productDocs = getProductDocuments(product, docs);
  const hasCert = productDocs.some((doc) => doc.documentType === 'certificate' || doc.type === '资质证书');
  const hasDoc = productDocs.some((doc) => doc.documentType === 'declaration_of_conformity' || doc.type === 'DoC声明文件');
  const hasManual = productDocs.some((doc) => doc.documentType === 'manual' || doc.type === '使用说明书');
  const missing = [!hasCert && '缺证书', !hasDoc && '缺DoC', !hasManual && '缺说明书'].filter(Boolean);
  return { productDocs, hasCert, hasDoc, hasManual, missing, label: missing.length ? missing.join(' / ') : '资料完整' };
}

function buildImportFileStacks(items) {
  const buckets = new Map();
  [...items].sort((a, b) => Number(a.id) - Number(b.id)).forEach((item) => {
    const key = item.originalName || `file-${item.id}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  });

  return [...buckets.values()].map((bucket) => {
    const base = bucket.find((item) => !item.isDuplicate);
    if (base) {
      return {
        key: base.originalName,
        label: base.originalName,
        status: 'keep',
        duplicates: bucket.filter((item) => item.isDuplicate),
      };
    }
    const first = bucket[0];
    return {
      key: first.originalName,
      label: first.duplicateDocumentTitle || first.originalName,
      status: first.duplicateDocumentTitle ? 'archived' : 'duplicate',
      duplicates: bucket,
    };
  });
}

function MenuIcon({ type }) {
  const paths = {
    import: <><path d="M12 21V9" /><path d="m7 14 5-5 5 5" /><path d="M5 3h14" /></>,
    profile: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    security: <><circle cx="8" cy="15" r="3" /><path d="M10.5 12.5 21 2" /><path d="m18 5 3 3" /></>,
    favorites: <path d="m12 17.3-5.5 3 1.1-6.2L3 9.8l6.3-.9L12 3.2l2.7 5.7 6.3.9-4.6 4.3 1.1 6.2z" />,
    history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    notifications: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    'company-info': <><path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16" /><path d="M9 7h3M9 11h3M9 15h3" /><path d="M3 21h18" /></>,
    products: <><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></>,
    files: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h6" /></>,
    members: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.8" /><path d="M16 3.2a4 4 0 0 1 0 7.6" /></>,
    verification: <><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" /><path d="m22 4-10 10-3-3" /></>,
    plans: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h4" /></>,
    logs: <><path d="M4 6h16M4 12h16M4 18h10" /></>,
    'company-review': <><circle cx="12" cy="12" r="9" /><path d="m9 12 2 2 4-4" /></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.8" /></>,
    categories: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    reports: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    system: <><path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.2a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.2a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.2a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.2a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z" /><circle cx="12" cy="12" r="3" /></>,
  };

  return (
    <span className={styles.menuIcon} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {paths[type] || <circle cx="12" cy="12" r="3" />}
      </svg>
    </span>
  );
}

export default function AdminV2Page() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout, isAdmin } = useAdmin();
  const [activeGroup, setActiveGroup] = useState('personal');
  const [companies, setCompanies] = useState(fallbackCompanies);
  const [activeCompany, setActiveCompany] = useState(null);
  const [expandedCompanies, setExpandedCompanies] = useState([]);
  const [activePage, setActivePage] = useState('profile');
  const [sidebarScrolling, setSidebarScrolling] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ open: false, percent: 0, phase: 'idle', title: '', detail: '' });
  const planCarouselRef = useRef(null);
  const [planCarouselFade, setPlanCarouselFade] = useState({ left: false, right: true });
  const [favoriteFilter, setFavoriteFilter] = useState('全部收藏');
  const [favoriteSearch, setFavoriteSearch] = useState('');
  const [favoriteFileType, setFavoriteFileType] = useState('all');
  const [favoriteStatusFilter, setFavoriteStatusFilter] = useState('all');
  const [favoriteGroup, setFavoriteGroup] = useState('全部收藏');
  const [favoriteEditModal, setFavoriteEditModal] = useState({ open: false, item: null, group: '', newGroup: '', note: '' });
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [historyRows, setHistoryRows] = useState([
    ['刚刚', '产品', 'Equestrian Helmet F20', 'Guangzhou Safety Equipment Co., Ltd.', '继续查看', null, null],
    ['今天 20:15', '文件', 'Declaration of Conformity', 'Guangzhou Safety Equipment Co., Ltd.', '打开资料', null, null],
    ['昨天 18:02', '公司', 'EU Riding Gear GmbH', '-', '查看公司', null, null],
    ['3 天前', '文件', 'CE Certificate - F20', 'Guangzhou Safety Equipment Co., Ltd.', '重新打开', null, null],
  ]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all');
  const [historyRange, setHistoryRange] = useState('90d');
  const [favoriteItems, setFavoriteItems] = useState([
    ['产品', 'Equestrian Helmet F20', 'Guangzhou Safety Equipment Co., Ltd.', '资质证书、DoC、说明书已收录', '客户 A 需要核对证书', '正常'],
    ['公司', 'Guangzhou Safety Equipment Co., Ltd.', '公司主页', '常用供应商资料', '后续关注产品更新', '正常'],
    ['文件', 'CE Certificate - F20', '资质证书', '有效期至 2031-01-27', '投标资料可能会用到', '正常'],
    ['文件', 'Old User Manual', '使用说明书', '该资料可能已被替换', '需要确认是否最新版本', '需注意'],
  ]);
  const [recentlyDeletedItems, setRecentlyDeletedItems] = useState([]);
  const [notificationItems, setNotificationItems] = useState([
    { title: '企业邀请', desc: 'Guangzhou Safety Equipment Co., Ltd. 邀请你成为企业管理员。', status: '待处理', tone: 'blue', pinned: true },
    { title: '资料更新', desc: '你收藏的产品 Equestrian Helmet F20 有新的 DoC 声明资料。', status: '未读', tone: 'orange', pinned: true },
    { title: '举报处理', desc: '你提交的“产品型号错误”举报已被平台标记处理。', status: '未读', tone: 'green', pinned: false },
    { title: '安全提醒', desc: '你的账号刚刚在当前浏览器登录。', status: '已读', tone: 'green', pinned: false },
    { title: '系统公告', desc: '后台 v2 正在完善中，部分按钮暂未接入真实功能。', status: '已读', tone: 'gray', pinned: false },
  ]);
  const [loginRecords, setLoginRecords] = useState([]);
  const [profileForm, setProfileForm] = useState({
    displayName: admin?.display_name || admin?.username || 'admin',
    realName: '',
    position: '',
    department: '',
    bio: '',
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savedUserCode, setSavedUserCode] = useState('');
  const [companyForm, setCompanyForm] = useState({
    name: '', nameEn: '', slug: '', contactEmail: '', contactPhone: '', website: '', mainCategory: '个人防护用品', address: '', description: '', publicVisible: true,
  });
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [companyProducts, setCompanyProducts] = useState(products);
  const [companyDocuments, setCompanyDocuments] = useState(documents);
  const [consumerCategories, setConsumerCategories] = useState([]);
  const [complianceCategories, setComplianceCategories] = useState([]);
  const [categoryMode, setCategoryMode] = useState('consumer');
  const [fileFilters, setFileFilters] = useState({ query: '', type: 'all', product: 'all', language: 'all', status: 'all' });
  const [workspaceViewMode, setWorkspaceViewMode] = useState('standard');
  const [workspaceExpandedProduct, setWorkspaceExpandedProduct] = useState(null);
  const [workspaceExpandedPile, setWorkspaceExpandedPile] = useState('全部资料');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  const [productCategoryTopFilter, setProductCategoryTopFilter] = useState('');
  const [productCategorySecondFilter, setProductCategorySecondFilter] = useState('');
  const [productCategoryThirdFilter, setProductCategoryThirdFilter] = useState('');
  const emptyProductModal = {
    open: false,
    product: null,
    name: '',
    nameEn: '',
    models: [''],
    categoryPrimaryId: '',
    complianceCategoryIds: [],
    status: 'active',
    dimensions: '',
    weight: '',
    material: '',
    usageScenario: '',
    color: '',
    packageContents: '',
    warranty: '',
    originCountry: '',
    imageUrl: '',
    description: '',
    descriptionEn: '',
  };
  const [productModal, setProductModal] = useState(emptyProductModal);
  const [documentModal, setDocumentModal] = useState(() => emptyDocumentModalState());
  const [documentPreview, setDocumentPreview] = useState({ open: false, url: '', title: '', objectUrl: '' });
  const [passwordModal, setPasswordModal] = useState({ open: false, oldPassword: '', newPassword: '', confirmPassword: '' });
  const [companyModal, setCompanyModal] = useState({ open: false, mode: 'create', name: '', nameEn: '', contactEmail: '' });
  const [verificationForm, setVerificationForm] = useState({ businessLicenseNo: '', contactPerson: '', contactEmail: '' });
  const [verificationItems, setVerificationItems] = useState([]);
  const [verificationFilter, setVerificationFilter] = useState('pending');
  const [importItems, setImportItems] = useState([]);
  const [importSelection, setImportSelection] = useState({});
  const [splitImportGroups, setSplitImportGroups] = useState({});
  const [activeImportGroupKey, setActiveImportGroupKey] = useState(null);
  const importInputRef = useRef(null);
  const documentFileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const companyLogoInputRef = useRef(null);
  const sidebarScrollTimer = useRef(null);
  const uploadProgressTimer = useRef(null);
  const userCode = savedUserCode || admin?.user_code || `U-${String(admin?.id || 1).padStart(6, '0')}`;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const panel = params.get('panel');
    if (panel === 'notifications' || panel === 'profile' || panel === 'security') {
      setActiveGroup('personal');
      setActivePage(panel);
      setActiveCompany(null);
    }
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getCategories('consumer'),
      api.getCategories('compliance'),
    ])
      .then(([consumerResponse, complianceResponse]) => {
        if (cancelled) return;
        setConsumerCategories(consumerResponse.data || []);
        setComplianceCategories(complianceResponse.data || []);
      })
      .catch((error) => showAction(error.message || '分类数据读取失败'));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.getPersonalOverview()
      .then((data) => {
        if (cancelled) return;
        const user = data.user || {};
        setProfileForm({
          displayName: user.displayName || admin?.display_name || admin?.username || 'admin',
          realName: user.realName || '',
          position: user.position || '',
          department: user.department || '',
          bio: user.bio || '',
        });
        setAvatarUrl(user.avatarPath ? `/eu-doc${user.avatarPath}` : '');
        setSavedUserCode(user.userCode || '');
        setHistoryEnabled(Boolean(data.settings?.historyEnabled ?? true));
        setFavoriteItems((data.favorites || []).map(mapFavoriteRow));
        setRecentlyDeletedItems((data.recentlyDeleted || []).map((item) => mapFavoriteRow(item, true)));
        setHistoryRows((data.history || []).map((item) => [
          item.viewedAt || item.createdAt || '刚刚',
          item.itemType,
          item.title,
          item.company || '-',
          item.actionLabel || '查看',
          item.id,
          item.itemId,
        ]));
        setNotificationItems((data.notifications || []).map((item) => ({
          id: item.id,
          title: item.title,
          desc: item.description,
          status: item.status,
          tone: item.tone,
          pinned: Boolean(item.pinned),
        })));
        setLoginRecords(data.loginRecords || []);
      })
      .catch((error) => showAction(error.message || '个人数据读取失败'));
    return () => { cancelled = true; };
  }, [admin?.display_name, admin?.username]);

  const currentCompany = useMemo(
    () => companies.find((company) => String(company.id) === String(activeCompany)) || companies[0],
    [activeCompany, companies]
  );

  const getPublicEntityPath = (type, itemId) => {
    if (!itemId) return '';
    if (type === '产品') return `/products/${itemId}`;
    if (type === '公司') return `/companies/${itemId}`;
    if (type === '文件') return `/documents/${itemId}`;
    return '';
  };

  const consumerCategoryById = useMemo(
    () => new Map(consumerCategories.map((category) => [String(category.id), category])),
    [consumerCategories]
  );

  const getConsumerChildren = (parentId) => consumerCategories.filter((category) => String(category.parentId || '') === String(parentId || ''));

  const selectedConsumerChain = useMemo(() => {
    const chain = [];
    let current = productModal.categoryPrimaryId ? consumerCategoryById.get(String(productModal.categoryPrimaryId)) : null;
    while (current) {
      chain.unshift(current);
      current = current.parentId ? consumerCategoryById.get(String(current.parentId)) : null;
    }
    return chain;
  }, [consumerCategoryById, productModal.categoryPrimaryId]);

  const selectedConsumerTopId = selectedConsumerChain[0]?.id || '';
  const selectedConsumerSecondId = selectedConsumerChain[1]?.id || '';
  const selectedConsumerThirdId = selectedConsumerChain[2]?.id || '';
  const topConsumerCategories = consumerCategories.filter((category) => !category.parentId);
  const secondConsumerCategories = selectedConsumerTopId ? getConsumerChildren(selectedConsumerTopId) : [];
  const thirdConsumerCategories = selectedConsumerSecondId ? getConsumerChildren(selectedConsumerSecondId) : [];
  const importConsumerCategoryId = productModal.categoryPrimaryId;
  const importConsumerChain = useMemo(() => buildCategoryChain(importConsumerCategoryId, consumerCategoryById), [consumerCategoryById, importConsumerCategoryId]);
  const importConsumerTopId = importConsumerChain[0]?.id || '';
  const importConsumerSecondId = importConsumerChain[1]?.id || '';
  const importConsumerThirdId = importConsumerChain[2]?.id || '';
  const importSecondConsumerCategories = importConsumerTopId ? getConsumerChildren(importConsumerTopId) : [];
  const importThirdConsumerCategories = importConsumerSecondId ? getConsumerChildren(importConsumerSecondId) : [];
  const productFilterSecondCategories = productCategoryTopFilter && productCategoryTopFilter !== 'uncategorized'
    ? getConsumerChildren(productCategoryTopFilter)
    : [];
  const productFilterThirdCategories = productCategorySecondFilter ? getConsumerChildren(productCategorySecondFilter) : [];
  const activeProductCategoryFilterId = productCategoryThirdFilter || productCategorySecondFilter || (productCategoryTopFilter === 'uncategorized' ? '' : productCategoryTopFilter);

  const changeConsumerTopCategory = (categoryId) => {
    setProductModal((form) => ({ ...form, categoryPrimaryId: categoryId ? String(categoryId) : '' }));
  };

  const changeConsumerSecondCategory = (categoryId) => {
    setProductModal((form) => ({ ...form, categoryPrimaryId: categoryId ? String(categoryId) : String(selectedConsumerTopId || '') }));
  };

  const changeConsumerThirdCategory = (categoryId) => {
    setProductModal((form) => ({ ...form, categoryPrimaryId: categoryId ? String(categoryId) : String(selectedConsumerSecondId || selectedConsumerTopId || '') }));
  };


  const complianceCategoryById = useMemo(
    () => new Map(complianceCategories.map((category) => [String(category.id), category])),
    [complianceCategories]
  );

  const getComplianceChildren = (parentId) => complianceCategories.filter((category) => String(category.parentId || '') === String(parentId || ''));

  const selectedComplianceChain = useMemo(() => {
    const selectedId = (productModal.complianceCategoryIds || [])[0];
    const chain = [];
    let current = selectedId ? complianceCategoryById.get(String(selectedId)) : null;
    while (current) {
      chain.unshift(current);
      current = current.parentId ? complianceCategoryById.get(String(current.parentId)) : null;
    }
    return chain;
  }, [complianceCategoryById, productModal.complianceCategoryIds]);

  const selectedComplianceTopId = selectedComplianceChain[0]?.id || '';
  const selectedComplianceSecondId = selectedComplianceChain[1]?.id || '';
  const topComplianceCategories = complianceCategories.filter((category) => !category.parentId);
  const secondComplianceCategories = selectedComplianceTopId ? getComplianceChildren(selectedComplianceTopId) : [];

  const changeComplianceTopCategory = (categoryId) => {
    setProductModal((form) => ({ ...form, complianceCategoryIds: categoryId ? [Number(categoryId)] : [] }));
  };

  const changeComplianceSecondCategory = (categoryId) => {
    setProductModal((form) => ({ ...form, complianceCategoryIds: categoryId ? [Number(categoryId)] : (selectedComplianceTopId ? [Number(selectedComplianceTopId)] : []) }));
  };

  const productClassificationSuggestion = useMemo(() => {
    if (!productModal.open) return null;
    return suggestProductClassificationLocal({
      product: productModal,
      documents: productModal.product ? getProductDocuments(productModal.product, companyDocuments) : [],
      consumerCategories,
      complianceCategories,
    });
  }, [productModal, companyDocuments, consumerCategories, complianceCategories]);

  const applyProductClassificationSuggestion = () => {
    if (!productClassificationSuggestion) return;
    setProductModal((form) => ({
      ...form,
      categoryPrimaryId: productClassificationSuggestion.consumerCategoryId ? String(productClassificationSuggestion.consumerCategoryId) : form.categoryPrimaryId,
      complianceCategoryIds: productClassificationSuggestion.complianceCategoryIds?.length ? productClassificationSuggestion.complianceCategoryIds : form.complianceCategoryIds,
    }));
  };

  const parseHistoryTimestamp = (time) => {
    if (!time) return Date.now();
    if (time === '刚刚') return Date.now();
    const normalized = String(time).replace(' ', 'T');
    const timestamp = new Date(normalized).getTime();
    return Number.isNaN(timestamp) ? Date.now() : timestamp;
  };

  const historyTypeOptions = [
    { value: 'all', label: '全部', short: '全部' },
    { value: '公司', label: '公司主页', short: '公司' },
    { value: '产品', label: '产品详情', short: '产品' },
    { value: '文件', label: '资料详情', short: '资料' },
  ];

  const historyRangeOptions = [
    { value: 'all', label: '全部时间' },
    { value: 'today', label: '今天' },
    { value: 'yesterday', label: '昨天' },
    { value: '7d', label: '近 7 天' },
    { value: '30d', label: '近 30 天' },
    { value: '90d', label: '近 90 天' },
  ];

  const normalizedHistoryRows = useMemo(() => historyRows.map(([time, type, name, company, action, historyId, itemId]) => {
    const timestamp = parseHistoryTimestamp(time);
    return { time, type, name, company, action, historyId, itemId, timestamp, targetPath: getPublicEntityPath(type, itemId) };
  }), [historyRows]);

  const historyStats = useMemo(() => ({
    all: normalizedHistoryRows.length,
    company: normalizedHistoryRows.filter((item) => item.type === '公司').length,
    product: normalizedHistoryRows.filter((item) => item.type === '产品').length,
    file: normalizedHistoryRows.filter((item) => item.type === '文件').length,
  }), [normalizedHistoryRows]);

  const filteredHistoryRows = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const dayLimit = Number(String(historyRange).replace('d', ''));
    const since = Number.isFinite(dayLimit) ? Date.now() - dayLimit * 24 * 60 * 60 * 1000 : 0;

    return normalizedHistoryRows.filter((item) => {
      if (historyTypeFilter !== 'all' && item.type !== historyTypeFilter) return false;
      if (query && ![item.name, item.company, item.type, item.action].some((value) => String(value || '').toLowerCase().includes(query))) return false;
      if (historyRange === 'today' && item.timestamp < startOfToday) return false;
      if (historyRange === 'yesterday' && (item.timestamp < startOfYesterday || item.timestamp >= startOfToday)) return false;
      if (historyRange.endsWith('d') && item.timestamp < since) return false;
      return true;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [normalizedHistoryRows, historySearch, historyTypeFilter, historyRange]);

  const groupedHistoryRows = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const groups = [];
    filteredHistoryRows.forEach((item) => {
      let label = '更早';
      if (item.timestamp >= startOfToday) label = '今天';
      else if (item.timestamp >= startOfYesterday) label = '昨天';
      const current = groups.find((group) => group.label === label);
      if (current) current.items.push(item);
      else groups.push({ label, items: [item] });
    });
    return groups;
  }, [filteredHistoryRows]);


  const favoriteTypeOptions = ['全部收藏', '公司', '产品', '资质证书', 'DoC 声明', '说明书', '检测报告', '有提醒', '最近取消'];
  const favoriteFileTypeOptions = [
    { value: 'all', label: '全部资料' },
    { value: 'certificate', label: '资质证书' },
    { value: 'doc', label: 'DoC 声明' },
    { value: 'manual', label: '说明书' },
    { value: 'report', label: '检测报告' },
  ];
  const favoriteStatusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'normal', label: '正常' },
    { value: 'warning', label: '有提醒' },
    { value: 'deleted', label: '最近取消' },
  ];

  const mapFavoriteRow = (item, deleted = false) => ({
    type: item.itemType,
    title: item.title,
    meta: item.meta || '',
    desc: item.description || '',
    note: item.note || '',
    status: item.status || '正常',
    id: item.id,
    itemId: item.itemId,
    statusReason: item.statusReason || '',
    deletedAt: item.deletedAt,
    deleted,
    companyId: item.companyId,
    companyName: item.companyName || '',
    productId: item.productId,
    productName: item.productName || '',
    documentType: item.documentType || '',
  });

  const normalizeFavorite = (item, deleted = false) => {
    const base = Array.isArray(item)
      ? { type: item[0], title: item[1], meta: item[2] || '', desc: item[3] || '', note: item[4] || '', status: item[5] || '正常', id: item[6], itemId: item[7], statusReason: item[8] || '', deletedAt: item[9], deleted }
      : { ...item, deleted: deleted || item.deleted };
    const text = `${base.title || ''} ${base.meta || ''} ${base.desc || ''} ${base.note || ''} ${base.companyName || ''} ${base.productName || ''}`.toLowerCase();
    let fileType = base.documentType || '';
    if (base.type === '文件') {
      const normalizedFileType = String(fileType || '').toLowerCase();
      // 优先根据 documentType 字段判断，这是数据库中的准确类型
      if (['declaration_of_conformity', 'doc', 'declaration', 'declaration-of-conformity'].includes(normalizedFileType)) fileType = 'doc';
      else if (['manual', 'user_manual', 'instruction_manual', 'instructions'].includes(normalizedFileType)) fileType = 'manual';
      else if (['report', 'test_report', 'test-report'].includes(normalizedFileType)) fileType = 'report';
      else if (['certificate', 'certification', 'cert'].includes(normalizedFileType)) fileType = 'certificate';
      // 只有在 documentType 为空或无法识别时，才使用文本模糊匹配作为后备
      else if (!normalizedFileType) {
        // 注意：这里的正则顺序很重要，"使用说明书"中包含"说明"，所以要先匹配"说明书"，避免被"声明"误匹配
        if (/说明书|使用说明|manual|instruction/i.test(text)) fileType = 'manual';
        else if (/doc(?![一-龥])|声明(?!书)|conformity/i.test(text)) fileType = 'doc';
        else if (/报告|report|test/i.test(text)) fileType = 'report';
        else if (/证书|certificate|cert/i.test(text)) fileType = 'certificate';
        else fileType = 'certificate'; // 默认值
      } else {
        fileType = normalizedFileType || 'certificate';
      }
    }
    return { ...base, fileType, text };
  };

  const favoriteStats = useMemo(() => {
    const normal = favoriteItems.map((item) => normalizeFavorite(item));
    const files = normal.filter((item) => item.type === '文件');
    console.log('=== 统计数据调试 ===');
    console.log('所有收藏:', normal.length);
    console.log('资料收藏:', files);
    files.forEach(f => console.log(`  ${f.title}: fileType=${f.fileType}, documentType=${f.documentType}`));
    return {
      all: normal.length,
      company: normal.filter((item) => item.type === '公司').length,
      product: normal.filter((item) => item.type === '产品').length,
      file: files.length,
      certificate: files.filter((item) => item.fileType === 'certificate').length,
      doc: files.filter((item) => item.fileType === 'doc').length,
      manual: files.filter((item) => item.fileType === 'manual').length,
      report: files.filter((item) => item.fileType === 'report').length,
      warning: normal.filter((item) => item.status !== '正常').length,
      deleted: recentlyDeletedItems.length,
    };
  }, [favoriteItems, recentlyDeletedItems]);

  const favoriteGroupOptions = useMemo(() => {
    const counts = new Map([['全部收藏', favoriteStats.all], ['未分组', 0]]);
    favoriteItems.map((item) => normalizeFavorite(item)).forEach((item) => {
      const group = parseFavoriteNote(item.note).group || '未分组';
      counts.set(group, (counts.get(group) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [favoriteItems, favoriteStats.all]);

  const filteredFavorites = useMemo(() => {
    const source = favoriteFilter === '最近取消'
      ? recentlyDeletedItems.map((item) => normalizeFavorite(item, true))
      : favoriteItems.map((item) => normalizeFavorite(item));
    const query = favoriteSearch.trim().toLowerCase();

    console.log('=== 筛选调试 ===');
    console.log('当前筛选:', favoriteFilter);
    console.log('源数据:', source.length, '条');

    const result = source.filter((item) => {
      if (favoriteFilter !== '最近取消' && item.deleted) return false;
      if (favoriteFilter === '公司' && item.type !== '公司') return false;
      if (favoriteFilter === '产品' && item.type !== '产品') return false;
      // 新的资料类型筛选逻辑
      if (favoriteFilter === '资质证书' && (item.type !== '文件' || item.fileType !== 'certificate')) {
        console.log(`  过滤: ${item.title}, type=${item.type}, fileType=${item.fileType}`);
        return false;
      }
      if (favoriteFilter === 'DoC 声明' && (item.type !== '文件' || item.fileType !== 'doc')) {
        console.log(`  过滤: ${item.title}, type=${item.type}, fileType=${item.fileType}`);
        return false;
      }
      if (favoriteFilter === '说明书' && (item.type !== '文件' || item.fileType !== 'manual')) {
        console.log(`  过滤: ${item.title}, type=${item.type}, fileType=${item.fileType}`);
        return false;
      }
      if (favoriteFilter === '检测报告' && (item.type !== '文件' || item.fileType !== 'report')) return false;
      if (favoriteFilter === '有提醒' && item.status === '正常') return false;
      // 只对资料类型进行资料类型筛选
      if (favoriteFileType !== 'all' && item.type === '文件' && item.fileType !== favoriteFileType) return false;
      if (favoriteStatusFilter === 'normal' && item.status !== '正常') return false;
      if (favoriteStatusFilter === 'warning' && item.status === '正常') return false;
      if (favoriteStatusFilter === 'deleted' && !item.deleted) return false;
      if (favoriteFilter !== '最近取消' && favoriteGroup !== '全部收藏') {
        const group = parseFavoriteNote(item.note).group || '未分组';
        if (group !== favoriteGroup) return false;
      }
      if (query && !item.text.includes(query)) return false;
      return true;
    });

    console.log('筛选结果:', result.length, '条');
    result.forEach(r => console.log(`  ✓ ${r.title} (${r.type}${r.fileType ? ` - ${r.fileType}` : ''})`));

    return result;
  }, [favoriteItems, recentlyDeletedItems, favoriteFilter, favoriteGroup, favoriteSearch, favoriteFileType, favoriteStatusFilter]);

  const displayFavorites = useMemo(() => {
    return filteredFavorites;
  }, [filteredFavorites]);

  const openFavoriteTarget = (type, itemId) => {
    const targetPath = getPublicEntityPath(type, itemId);
    if (!targetPath) {
      showAction('这条收藏缺少跳转目标');
      return;
    }
    navigate(targetPath);
  };

  const getFavoriteToneClass = (type) => {
    if (type === '公司') return styles.favoriteToneCompany;
    if (type === '产品') return styles.favoriteToneProduct;
    if (type === '文件') return styles.favoriteToneFile;
    return '';
  };


  const hierarchyFavorites = useMemo(() => {
    if (favoriteFilter === '全部收藏' && favoriteGroup === '全部收藏' && favoriteSearch.trim() === '' && favoriteFileType === 'all' && favoriteStatusFilter === 'all') {
      return favoriteItems.map((item) => normalizeFavorite(item)).filter((item) => !item.deleted);
    }
    return filteredFavorites;
  }, [favoriteItems, filteredFavorites, favoriteFilter, favoriteGroup, favoriteSearch, favoriteFileType, favoriteStatusFilter]);

  const favoriteHierarchy = useMemo(() => {
    const companyMap = new Map();
    const getCompanyKey = (item) => item.companyId ? `company-${item.companyId}` : `company-name-${item.companyName || (item.type === '公司' ? item.title : '未归属公司')}`;
    const ensureCompany = (item) => {
      const key = getCompanyKey(item);
      if (!companyMap.has(key)) {
        companyMap.set(key, {
          key,
          companyId: item.companyId || (item.type === '公司' ? item.itemId : null),
          name: item.companyName || (item.type === '公司' ? item.title : '未归属公司'),
          favorite: null,
          products: new Map(),
          files: [],
        });
      }
      return companyMap.get(key);
    };
    const ensureProduct = (company, item) => {
      const key = item.productId ? `product-${item.productId}` : `product-name-${item.productName || (item.type === '产品' ? item.title : '未绑定产品')}`;
      if (!company.products.has(key)) {
        company.products.set(key, {
          key,
          productId: item.productId || (item.type === '产品' ? item.itemId : null),
          name: item.productName || (item.type === '产品' ? item.title : '未绑定产品'),
          favorite: null,
          files: [],
        });
      }
      return company.products.get(key);
    };

    hierarchyFavorites.forEach((item) => {
      const company = ensureCompany(item);
      if (item.type === '公司') {
        company.favorite = item;
        return;
      }
      if (item.type === '产品') {
        ensureProduct(company, item).favorite = item;
        return;
      }
      if (item.type === '文件') {
        if (item.productId || item.productName) ensureProduct(company, item).files.push(item);
        else company.files.push(item);
      }
    });

    return Array.from(companyMap.values()).map((company) => ({
      ...company,
      products: Array.from(company.products.values()),
    }));
  }, [hierarchyFavorites]);

  const useFavoriteHierarchy = favoriteFilter === '全部收藏' && favoriteStatusFilter === 'all' && favoriteFileType === 'all';
  const favoriteHierarchyStats = useMemo(() => {
    const productGroupCount = favoriteHierarchy.reduce((sum, company) => sum + company.products.length, 0);
    return {
      itemCount: hierarchyFavorites.length,
      companyGroupCount: favoriteHierarchy.length,
      productGroupCount,
    };
  }, [favoriteHierarchy, hierarchyFavorites.length]);

  const getProductFavoriteTotal = (product) => (product.favorite ? 1 : 0) + product.files.length;
  const getCompanyFavoriteTotal = (company) => company.products.reduce((sum, product) => sum + getProductFavoriteTotal(product), company.favorite ? 1 : 0) + company.files.length;
  const activeFavoriteFilterLabels = [
    favoriteGroup !== '全部收藏' ? `分组：${favoriteGroup}` : '',
    favoriteFileType !== 'all' ? favoriteFileTypeOptions.find((item) => item.value === favoriteFileType)?.label : '',
    favoriteStatusFilter !== 'all' && favoriteStatusFilter !== (favoriteFilter === '最近取消' ? 'deleted' : 'all') ? favoriteStatusOptions.find((item) => item.value === favoriteStatusFilter)?.label : '',
  ].filter(Boolean);
  const visibleFavoriteCount = useFavoriteHierarchy ? hierarchyFavorites.length : displayFavorites.length;
  const favoriteResultText = useFavoriteHierarchy && favoriteHierarchyStats.itemCount > 0
    ? `${favoriteFilter} · ${favoriteHierarchyStats.itemCount} 条收藏 · 按 ${favoriteHierarchyStats.companyGroupCount} 个公司 / ${favoriteHierarchyStats.productGroupCount} 个产品归类`
    : `${favoriteFilter} · ${displayFavorites.length} 条收藏`;

  function parseFavoriteNote(note = '') {
    const text = String(note || '').trim();
    const match = text.match(/^分组[:：]\s*(.+?)(?:\n|$)/);
    const group = match ? match[1].trim() : '';
    const cleanNote = match ? text.replace(/^分组[:：].*?(?:\n|$)/, '').trim() : text;
    return { group, note: cleanNote };
  }

  const formatFavoriteNote = (group, note) => [group ? `分组：${group}` : '', note || ''].filter(Boolean).join('\n');

  const refreshPersonalOverview = async () => {
    const data = await api.getPersonalOverview();
    setFavoriteItems((data.favorites || []).map(mapFavoriteRow));
    setRecentlyDeletedItems((data.recentlyDeleted || []).map((row) => mapFavoriteRow(row, true)));
    return data;
  };

  const restoreFavorite = async (item) => {
    try {
      await api.restoreFavorite(item.id);
      setRecentlyDeletedItems((items) => items.filter((row) => String(row.id) !== String(item.id)));
      await refreshPersonalOverview();
      showAction('已重新添加到收藏');
    } catch (error) {
      showAction(error.message || '恢复收藏失败');
    }
  };

  const permanentlyDeleteFavorite = async (item) => {
    if (!confirm('确定永久删除？此操作不可恢复。')) return;
    try {
      await api.permanentDeleteFavorite(item.id);
      setRecentlyDeletedItems((items) => items.filter((row) => String(row.id) !== String(item.id)));
      setFavoriteItems((items) => items.filter((row) => String(row.id) !== String(item.id)));
      await refreshPersonalOverview();
      showAction('已永久删除');
    } catch (error) {
      showAction(error.message || '删除失败');
    }
  };

  const updateFavoriteItemNote = (item) => {
    const parsed = parseFavoriteNote(item.note);
    setFavoriteEditModal({ open: true, item, group: parsed.group || '未分组', newGroup: '', note: parsed.note });
  };

  const closeFavoriteEditModal = () => {
    setFavoriteEditModal({ open: false, item: null, group: '', newGroup: '', note: '' });
  };

  const saveFavoriteEdit = async () => {
    const item = favoriteEditModal.item;
    if (!item) return;
    const selectedGroup = favoriteEditModal.group === '__new__' ? favoriteEditModal.newGroup.trim() : favoriteEditModal.group.trim();
    const mergedNote = formatFavoriteNote(selectedGroup === '未分组' ? '' : selectedGroup, favoriteEditModal.note.trim());
    try {
      await api.updateFavoriteNote(item.id, mergedNote);
      setFavoriteItems((items) => items.map((row) => String(row.id) === String(item.id) ? { ...row, note: mergedNote } : row));
      await refreshPersonalOverview();
      closeFavoriteEditModal();
      showAction('分组和备注已保存');
    } catch (error) {
      showAction(error.message || '保存失败');
    }
  };

  const cancelFavoriteItem = async (item) => {
    try {
      await api.deleteFavorite(item.id);
      const deletedItem = favoriteItems.find((row) => String(row.id) === String(item.id));
      if (deletedItem) setRecentlyDeletedItems((items) => [{ ...deletedItem, deleted: true, deletedAt: new Date().toISOString() }, ...items]);
      setFavoriteItems((items) => items.filter((row) => String(row.id) !== String(item.id)));
      await refreshPersonalOverview();
      showAction('收藏已取消，可在“最近取消”中恢复');
    } catch (error) {
      showAction(error.message || '取消收藏失败');
    }
  };

  const renderFavoriteCard = (item, compact = false) => {
    const parsedNote = parseFavoriteNote(item.note);
    const sourceText = item.type === '文件'
      ? [item.productName, item.companyName].filter(Boolean).join(' · ') || item.meta || '暂无归属信息'
      : item.meta || item.companyName || item.productName || '暂无来源信息';
    const descText = String(item.desc || '').trim();
    const shouldShowDesc = item.type !== '文件' && descText && descText !== sourceText && !sourceText.includes(descText) && !descText.includes(sourceText);
    const fileTypeLabel = favoriteFileTypeOptions.find((option) => option.value === item.fileType)?.label || '资料';

    const entityStatusText = item.status || '正常';
    const entityStatusClass = entityStatusText === '正常' ? styles.statusOk : styles.statusPending;
    return (
    <article key={item.id || `${item.type}-${item.title}`} className={`${styles.favoriteListCard} ${getFavoriteToneClass(item.type)} ${compact ? styles.favoriteCompactCard : ''} ${item.deleted ? styles.favoriteDeletedCard : ''}`}>
      <div className={styles.favoriteTypeBadge}>{item.type === '文件' ? '资料' : item.type}</div>
      <div className={styles.favoriteContent}>
        <div className={styles.favoriteTitleLine}>
          <button type="button" className={styles.favoriteTitleButton} onClick={() => openFavoriteTarget(item.type, item.itemId)}>{item.title}</button>
          {item.deleted && <em className={styles.favoriteRelationBadge}>收藏已取消</em>}
          <em className={entityStatusClass}>{entityStatusText}</em>
        </div>
        <p>{sourceText}</p>
        <div className={styles.favoriteMetaLine}>
          {item.type === '文件' && <span>{fileTypeLabel}</span>}
          {shouldShowDesc && <span>{descText}</span>}
          {parsedNote.group && <span className={styles.favoriteGroupChip}>{parsedNote.group}</span>}
        </div>
        {parsedNote.note && <div className={styles.favoriteNote}>备注：{parsedNote.note}</div>}
        {item.statusReason && <div className={styles.favoriteNote}>状态原因：{item.statusReason}</div>}
        {item.deletedAt && <div className={styles.favoriteNote}>取消时间：{new Date(item.deletedAt).toLocaleString('zh-CN')}</div>}
      </div>
      <div className={styles.favoriteActions}>
        {item.deleted ? (
          <>
            <button className={styles.primaryBtn} onClick={() => restoreFavorite(item)}>恢复</button>
            <button className={styles.textDangerBtn} onClick={() => permanentlyDeleteFavorite(item)}>永久删除</button>
          </>
        ) : (
          <>
            <button className={styles.secondaryBtn} onClick={() => openFavoriteTarget(item.type, item.itemId)}>查看</button>
            <button className={styles.secondaryBtn} onClick={() => updateFavoriteItemNote(item)}>整理</button>
            <button className={styles.textDangerBtn} onClick={() => cancelFavoriteItem(item)}>取消</button>
          </>
        )}
      </div>
    </article>
    );
  };

  useEffect(() => {
    api.getMyCompanies()
      .then((items) => {
        if (!items.length) {
          setCompanies([]);
          setActiveCompany(null);
          setExpandedCompanies([]);
          return;
        }
        const mappedCompanies = items.map((company) => {
          const verification = getVerificationDisplay(company);
          return {
            id: Number(company.id),
            name: company.name,
            nameEn: company.nameEn || '',
            code: `c-${String(company.id).padStart(6, '0')}`,
            status: verification.label,
            verificationStatus: company.verificationStatus || 'pending',
            rawStatus: company.status || 'draft',
            memberRole: company.memberRole || 'owner',
          };
        });
        setCompanies(mappedCompanies);
        setActiveCompany((current) => mappedCompanies.some((company) => String(company.id) === String(current)) ? Number(current) : mappedCompanies[0].id);
        setExpandedCompanies((current) => current.filter((id) => mappedCompanies.some((company) => String(company.id) === String(id))));
      })
      .catch(() => {
        if (Array.isArray(admin?.companies) && admin.companies.length > 0) {
          const mappedCompanies = admin.companies.map((company) => ({
            id: Number(company.id),
            name: company.name,
            code: `c-${String(company.id).padStart(6, '0')}`,
            status: '已认证',
            memberRole: company.member_role || company.memberRole || 'owner',
          }));
          setCompanies(mappedCompanies);
          setActiveCompany(mappedCompanies[0].id);
          setExpandedCompanies((current) => current.filter((id) => mappedCompanies.some((company) => String(company.id) === String(id))));
        }
      });
  }, [admin?.companies]);

  useEffect(() => {
    if (!activeCompany || Number.isNaN(Number(activeCompany))) {
      setCompanyProducts([]);
      setCompanyDocuments([]);
      return undefined;
    }
    let cancelled = false;
    const companyId = activeCompany;

    setCompanyProducts([]);
    setCompanyDocuments([]);

    api.getCompany(companyId)
      .then((company) => {
        if (cancelled) return;
        setCompanyForm({
          name: company.name || '',
          nameEn: company.nameEn || '',
          slug: company.slug || '',
          contactEmail: company.contactEmail || '',
          contactPhone: company.contactPhone || '',
          website: company.website || '',
          mainCategory: company.mainCategory || '个人防护用品',
          address: company.address || '',
          description: company.description || '',
          publicVisible: company.publicVisible !== 0,
        });
        setVerificationForm({
          businessLicenseNo: company.businessLicenseNo || '',
          contactPerson: company.contactPerson || '',
          contactEmail: company.contactEmail || '',
        });
        const verification = getVerificationDisplay(company);
        setCompanies((list) => list.map((item) => String(item.id) === String(companyId) ? {
          ...item,
          status: verification.label,
          verificationStatus: company.verificationStatus || 'pending',
          rawStatus: company.status || item.rawStatus || 'draft',
        } : item));
        setCompanyLogoUrl(company.logoUrl || '');
      })
      .catch((error) => {
        if (!cancelled) showAction(error.message || '公司资料读取失败');
      });
    api.getCompanyProducts(companyId)
      .then((response) => {
        if (cancelled) return;
        setCompanyProducts((response.data || []).map((item) => ({
          id: item.id,
          name: item.name,
          model: item.model || '-',
          category: item.categoryPath || item.categoryName || '其他 / 待分类',
          categoryPrimaryId: item.categoryPrimaryId || '',
          categoryParentId: item.categoryParentId || '',
          categoryGrandId: item.categoryGrandId || '',
          categoryParentName: item.categoryParentName || '',
          categoryGrandName: item.categoryGrandName || '',
          complianceCategoryIds: item.complianceCategoryIds || (item.complianceCategories || []).map((cat) => cat.id),
          complianceCategories: item.complianceCategories || [],
          files: item.documentCount || 0,
          status: item.status === 'active' ? '公开' : item.status || '草稿',
          rawStatus: item.status || 'active',
          updatedAt: item.updatedAt || item.createdAt || '2026-06-25',
          description: item.description || '',
          nameEn: item.nameEn || '',
          descriptionEn: item.descriptionEn || '',
          dimensions: item.dimensions || '',
          weight: item.weight || '',
          material: item.material || '',
          usageScenario: item.usageScenario || '',
          color: item.color || '',
          packageContents: item.packageContents || '',
          warranty: item.warranty || '',
          originCountry: item.originCountry || '',
          imageUrl: item.imagePath ? `/eu-doc${item.imagePath}` : '',
        })));
      })
      .catch(() => {
        if (!cancelled) setCompanyProducts([]);
      });
    api.getCompanyDocuments(companyId)
      .then((response) => {
        if (cancelled) return;
        setCompanyDocuments((response.data || []).map((item) => ({
          id: item.id,
          name: item.title || item.fileName || '未命名资料',
          type: item.documentType === 'certificate' ? '资质证书' : item.documentType === 'declaration_of_conformity' || item.documentType === 'declaration' ? 'DoC声明文件' : item.documentType === 'manual' ? '使用说明书' : '其他资料',
          documentType: item.documentType || 'other',
          productId: item.productId || item.product_id || '',
          product: item.productName || '-',
          lang: item.language || '未设置',
          backup: item.backupStatus || '待备份',
          updatedAt: item.updatedAt || item.createdAt || '2026-06-25',
          fileUrl: getDocumentAssetUrl(item),
          certNo: item.certNo || '',
          standard: item.standard || '',
          issuer: item.issuer || '',
        })));
      })
      .catch(() => {
        if (!cancelled) setCompanyDocuments([]);
      });

    return () => { cancelled = true; };
  }, [activeCompany]);

  const refreshImportItems = async () => {
    if (!activeCompany) return;
    try {
      const response = await api.getImportItems(activeCompany);
      setImportItems(response.data || []);
    } catch (error) {
      showAction(error.message || '导入资料读取失败');
    }
  };


  const refreshCompanyVerifications = async () => {
    try {
      const items = await api.getCompanyVerifications(verificationFilter);
      setVerificationItems(items);
    } catch (error) {
      showAction(error.message || '企业审核列表读取失败');
    }
  };

  const submitCurrentCompanyVerification = async () => {
    if (!currentCompany?.id) return;
    try {
      await api.submitCompanyVerification(currentCompany.id, verificationForm);
      showAction('认证申请已提交，等待平台审核');
      setCompanies((list) => list.map((item) => String(item.id) === String(currentCompany.id) ? {
        ...item,
        status: '待平台审核',
        verificationStatus: 'pending',
        rawStatus: item.rawStatus || 'draft',
      } : item));
    } catch (error) {
      showAction(error.message || '提交认证失败');
    }
  };

  const reviewCompany = async (companyId, action) => {
    const note = action === 'reject' ? window.prompt('请输入拒绝/补充原因', '资料不完整，请补充后重新提交') || '' : '';
    try {
      await api.reviewCompanyVerification(companyId, action, note);
      showAction(action === 'approve' ? '企业认证已通过' : '已拒绝该认证申请');
      await refreshCompanyVerifications();
      const items = await api.getMyCompanies();
      setCompanies(items.map((company) => {
        const verification = getVerificationDisplay(company);
        return {
          id: Number(company.id),
          name: company.name,
          nameEn: company.nameEn || '',
          code: `c-${String(company.id).padStart(6, '0')}`,
          status: verification.label,
          verificationStatus: company.verificationStatus || 'pending',
          rawStatus: company.status || 'draft',
          memberRole: company.memberRole || 'owner',
        };
      }));
    } catch (error) {
      showAction(error.message || '审核操作失败');
    }
  };

  useEffect(() => {
    if (activeCompany && (activePage === 'bulk-import' || activePage === 'products')) refreshImportItems();
  }, [activeCompany, activePage]);


  useEffect(() => {
    if (activePage === 'company-review') refreshCompanyVerifications();
  }, [activePage, verificationFilter]);

  const uploadImportFiles = async (files) => {
    if (!activeCompany) {
      showAction('请先创建或选择公司');
      setCompanyModal({ open: true, mode: 'create', name: '', nameEn: '', contactEmail: '' });
      return;
    }
    if (!files?.length) return;
    const fileList = Array.from(files || []);
    const companyName = currentCompany?.name || '当前公司';
    if (!window.confirm(`确认把这 ${fileList.length} 份资料上传到「${companyName}」吗？`)) return;
    if (uploadProgressTimer.current) clearTimeout(uploadProgressTimer.current);
    setUploadProgress({
      open: true,
      percent: 2,
      phase: 'uploading',
      title: '正在上传资料',
      detail: `${fileList.length} 份资料 · ${companyName}`,
    });
    try {
      const result = await api.uploadImportFiles(activeCompany, fileList, {
        onProgress: ({ percent, phase }) => {
          setUploadProgress((state) => ({
            ...state,
            open: true,
            percent,
            phase,
            title: phase === 'processing' ? '正在生成待整理资料' : '正在上传资料',
            detail: phase === 'processing' ? '上传已完成，系统正在识别资料信息。' : `${fileList.length} 份资料 · ${companyName}`,
          }));
        },
      });
      setUploadProgress({
        open: true,
        percent: 100,
        phase: 'done',
        title: '上传完成',
        detail: result.message || `已上传 ${fileList.length} 份资料到 ${companyName}`,
      });
      showAction(result.message || `已上传 ${fileList.length} 份资料到 ${companyName}`);
      await refreshImportItems();
      uploadProgressTimer.current = setTimeout(() => setUploadProgress((state) => ({ ...state, open: false })), 2200);
    } catch (error) {
      setUploadProgress({
        open: true,
        percent: 100,
        phase: 'error',
        title: '上传失败',
        detail: error.message || '批量导入失败',
      });
      showAction(error.message || '批量导入失败');
    }
  };

  const deletePendingImportGroup = async (group) => {
    if (!window.confirm(`确认删除这 ${group.items.length} 个待整理资料吗？`)) return;
    try {
      await Promise.all(group.items.map((item) => api.deleteImportItem(item.id)));
      showAction('已删除待整理资料');
      await refreshImportItems();
    } catch (error) {
      showAction(error.message || '删除失败');
    }
  };

  const deleteDuplicateImportItems = async (group) => {
    const duplicates = group.items.filter((item) => item.isDuplicate);
    if (!duplicates.length) {
      showAction('这组没有可批量删除的重复资料');
      return;
    }
    if (!window.confirm(`确认只删除这 ${duplicates.length} 份后上传的重复资料吗？较早资料会保留。`)) return;
    try {
      await Promise.all(duplicates.map((item) => api.deleteImportItem(item.id)));
      showAction('已删除重复资料，较早资料已保留');
      await refreshImportItems();
    } catch (error) {
      showAction(error.message || '删除重复资料失败');
    }
  };

  const reopenImportItem = async (item) => {
    if (!window.confirm('确认撤回到待整理池重新整理吗？对应已归档资料会被标记删除。')) return;
    try {
      await api.reopenImportItem(item.id);
      showAction('已撤回到待整理池');
      await Promise.all([refreshImportItems(), refreshCompanyAssets()]);
    } catch (error) {
      showAction(error.message || '撤回失败');
    }
  };

  const deleteLinkedDocument = async (item) => {
    if (!item.documentId || !window.confirm('确认删除这个已归档资料吗？')) return;
    try {
      await api.deleteDocument(item.documentId);
      await api.reopenImportItem(item.id);
      await api.deleteImportItem(item.id);
      showAction('已删除归档资料');
      await Promise.all([refreshImportItems(), refreshCompanyAssets()]);
    } catch (error) {
      showAction(error.message || '删除失败');
    }
  };

  const selectImportFolder = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.webkitdirectory = true;
    input.directory = true;
    input.onchange = () => uploadImportFiles(input.files);
    input.click();
  };

  const organizeImportItem = async (item) => {
    const form = importSelection[item.id] || {};
    const suggestedClassification = item.suggestedClassification || {};
    try {
      await api.organizeImportItem(item.id, {
        productId: form.productId || '',
        newProductName: form.newProductName || item.suggestedProductName || '',
        newProductModel: form.newProductModel || item.guessedModels || item.guessedModel || '',
        documentType: form.documentType || item.guessedType || 'other',
        title: form.title || item.originalName,
        language: form.language || item.guessedLanguage || 'en',
        certNo: form.certNo || item.guessedCertNo || '',
        standard: form.standard || '',
        issuer: form.issuer || '',
        categoryPrimaryId: form.categoryPrimaryId || suggestedClassification.consumerCategoryId || '',
        complianceCategoryIds: form.complianceCategoryIds || suggestedClassification.complianceCategoryIds || [],
      });
      showAction('资料已整理到产品资料');
      await Promise.all([refreshImportItems(), refreshCompanyAssets()]);
    } catch (error) {
      showAction(error.message || '整理失败');
    }
  };


  const confirmImportStep = (formKey, step) => {
    setImportSelection((state) => ({ ...state, [formKey]: { ...(state[formKey] || {}), confirmedStep: step } }));
    window.setTimeout(() => document.getElementById(`${formKey}-step-${step + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  };

  const addImportModel = (formKey, group) => {
    const baseCount = splitImportModels(group.model).length || 1;
    setImportSelection((state) => {
      const form = state[formKey] || {};
      const extraModels = form.extraModels || [];
      return { ...state, [formKey]: { ...form, extraModels: [...extraModels, ''] } };
    });
    window.setTimeout(() => document.getElementById(`${formKey}-model-${baseCount + (importSelection[formKey]?.extraModels || []).length}`)?.focus(), 60);
  };

  const organizeImportGroup = async (group) => {
    const formKey = `group:${group.key}`;
    const form = importSelection[formKey] || {};
    const itemsToOrganize = group.items.some((item) => item.isDuplicate) ? group.items.filter((item) => !item.isDuplicate) : group.items;
    if (!itemsToOrganize.length) { showAction('这组只有重复资料，请先删除重复或拆分处理'); return; }
    const matchedProductId = Object.prototype.hasOwnProperty.call(form, 'productId') ? form.productId : findMatchingProductId(group, companyProducts);
    const suggestedClassification = getImportSuggestedClassification(group) || {};
    try {
      await api.organizeImportGroup({
        ids: itemsToOrganize.map((item) => item.id),
        productId: matchedProductId || '',
        newProductName: form.newProductName || group.suggestedName || '',
        newProductModel: [...splitImportModels(group.model).map((model, index) => form[`model_${index}`] || model), ...(form.extraModels || [])].map((model) => String(model || '').trim()).filter(Boolean).join(', ') || form.newProductModel || group.model || '',
        documentType: form.documentType || inferImportType(group.items[0], group.type),
        languagesById: Object.fromEntries(itemsToOrganize.map((item) => [String(item.id), form[`language_${item.id}`] || item.guessedLanguage || 'en'])),
        documentTypesById: Object.fromEntries(itemsToOrganize.map((item) => [String(item.id), form[`documentType_${item.id}`] || form.documentType || inferImportType(item, group.type)])),
        categoryPrimaryId: form.categoryPrimaryId || suggestedClassification.consumerCategoryId || '',
        complianceCategoryIds: form.complianceCategoryIds || suggestedClassification.complianceCategoryIds || [],
      });
      showAction('已按同一产品整理这些资料');
      setActiveImportGroupKey(null);
      await Promise.all([refreshImportItems(), refreshCompanyAssets()]);
    } catch (error) {
      showAction(error.message || '分组整理失败');
    }
  };

  const openPage = (group, pageId, companyId) => {
    setActiveGroup(group);
    setActivePage(pageId);
    if (companyId !== undefined && companyId !== null) setActiveCompany(Number(companyId));
    else if (group !== 'company') setActiveCompany(null);
    if (group === 'personal') navigate(`/admin?panel=${pageId}`, { replace: true });
    else if (location.search) navigate('/admin', { replace: true });
  };

  const manageProductFiles = (product) => {
    if (!product?.id) return;
    setFileFilters((form) => ({ ...form, product: String(product.id), type: 'all', query: '', language: 'all', status: 'all' }));
    openPage('company', 'files', activeCompany);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handleSidebarScroll = () => {
    setSidebarScrolling(true);
    if (sidebarScrollTimer.current) clearTimeout(sidebarScrollTimer.current);
    sidebarScrollTimer.current = setTimeout(() => {
      setSidebarScrolling(false);
    }, 900);
  };

  const showAction = (message) => {
    setActionMessage(message);
    setTimeout(() => setActionMessage(''), 1800);
  };

  const copyUserCode = async () => {
    try {
      await navigator.clipboard.writeText(userCode);
      showAction('用户编号已复制');
    } catch {
      showAction('复制失败，请手动复制');
    }
  };

  const saveProfile = async () => {
    try {
      await api.updatePersonalProfile(profileForm);
      showAction('个人资料已保存');
    } catch (error) {
      showAction(error.message || '保存失败');
    }
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    try {
      const result = await api.uploadPersonalAvatar(file);
      const path = result.avatarPath || result.data?.avatarPath;
      if (path) setAvatarUrl(`/eu-doc${path}`);
      showAction('头像已上传');
    } catch (error) {
      showAction(error.message || '头像上传失败');
    }
  };

  const changePassword = async () => {
    if (passwordModal.newPassword.length < 6) {
      showAction('新密码至少需要 6 位');
      return;
    }
    if (passwordModal.newPassword !== passwordModal.confirmPassword) {
      showAction('两次输入的新密码不一致');
      return;
    }
    try {
      await api.updatePassword(passwordModal.oldPassword, passwordModal.newPassword);
      setPasswordModal({ open: false, oldPassword: '', newPassword: '', confirmPassword: '' });
      localStorage.removeItem('admin_token');
      showAction('密码已修改，请使用新密码重新登录');
      setTimeout(() => navigate('/admin/login'), 900);
    } catch (error) {
      showAction(error.message || '密码修改失败');
    }
  };

  const revokeSessions = async () => {
    try {
      await api.revokeOtherSessions();
      localStorage.removeItem('admin_token');
      showAction('其他设备已退出，请重新登录');
      setTimeout(() => navigate('/admin/login'), 800);
    } catch (error) {
      showAction(error.message || '操作失败');
    }
  };

  const saveCompanyProfile = async () => {
    try {
      await api.updateCompany(activeCompany, {
        name: companyForm.name,
        nameEn: companyForm.nameEn,
        slug: companyForm.slug,
        contactEmail: companyForm.contactEmail,
        contactPhone: companyForm.contactPhone,
        website: companyForm.website,
        mainCategory: companyForm.mainCategory,
        address: companyForm.address,
        description: companyForm.description,
        publicVisible: currentCompany.status === '已认证' && companyForm.publicVisible ? 1 : 0,
      });
      setCompanies((items) => items.map((item) => item.id === activeCompany ? { ...item, name: companyForm.name || item.name } : item));
      showAction('公司资料已保存');
    } catch (error) {
      showAction(error.message || '公司资料保存失败');
    }
  };

  const uploadCompanyLogoFile = async (file) => {
    if (!file) return;
    try {
      const result = await api.uploadCompanyLogo(activeCompany, file);
      if (result.logoPath) setCompanyLogoUrl(`/eu-doc${result.logoPath}`);
      showAction('公司 Logo 已上传');
    } catch (error) {
      showAction(error.message || 'Logo 上传失败');
    }
  };

  const submitCompanyModal = async () => {
    if (companyModal.mode === 'claim') {
      showAction('认领公司需要提交认证材料，后续接入企业认证流程');
      return;
    }
    if (!companyModal.name.trim()) {
      showAction('请填写公司名称');
      return;
    }
    try {
      const result = await api.createCompany({
        name: companyModal.name,
        nameEn: companyModal.nameEn,
        contactEmail: companyModal.contactEmail,
      });
      const newCompanyId = result.id || result.data?.id;
      const newCompany = {
        id: newCompanyId,
        name: companyModal.name,
        code: `c-${String(newCompanyId).padStart(6, '0')}`,
        status: '待认证',
        memberRole: 'owner',
      };
      setCompanies((items) => [newCompany, ...items]);
      setActiveCompany(newCompany.id);
      setExpandedCompanies((items) => [newCompany.id, ...items]);
      setCompanyModal({ open: false, mode: 'create', name: '', nameEn: '', contactEmail: '' });
      showAction('公司申请草稿已创建，认证通过前仅自己可见');
      api.getMe().catch(() => null);
    } catch (error) {
      showAction(error.message || '公司创建失败');
    }
  };

  const deleteCurrentCompanyDraft = async () => {
    if (!currentCompany?.id) return;
    if (!window.confirm(`确认删除公司草稿「${currentCompany.name}」吗？此操作会移除该公司的草稿资料。`)) return;
    try {
      await api.deleteCompany(currentCompany.id);
      showAction('公司草稿已删除');
      const nextCompanies = companies.filter((company) => company.id !== currentCompany.id);
      setCompanies(nextCompanies);
      setActiveCompany(nextCompanies[0]?.id || null);
      setExpandedCompanies((items) => items.filter((id) => String(id) !== String(currentCompany.id)));
      if (!nextCompanies.length) openPage('import', 'bulk-import');
    } catch (error) {
      showAction(error.message || '删除公司草稿失败');
    }
  };

  const refreshCompanyAssets = async () => {
    const [productResponse, documentResponse] = await Promise.all([
      api.getCompanyProducts(activeCompany),
      api.getCompanyDocuments(activeCompany),
    ]);
    setCompanyProducts((productResponse.data || []).map((item) => ({
      id: item.id,
      name: item.name,
      model: item.model || '-',
      category: item.categoryPath || item.categoryName || '其他 / 待分类',
      categoryPrimaryId: item.categoryPrimaryId || '',
      categoryParentId: item.categoryParentId || '',
      categoryGrandId: item.categoryGrandId || '',
      categoryParentName: item.categoryParentName || '',
      categoryGrandName: item.categoryGrandName || '',
      complianceCategoryIds: item.complianceCategoryIds || (item.complianceCategories || []).map((cat) => cat.id),
      complianceCategories: item.complianceCategories || [],
      files: item.documentCount || 0,
      status: item.status === 'active' ? '公开' : item.status || '草稿',
      rawStatus: item.status || 'active',
      updatedAt: item.updatedAt || item.createdAt || '2026-06-25',
      description: item.description || '',
      nameEn: item.nameEn || '',
      descriptionEn: item.descriptionEn || '',
      dimensions: item.dimensions || '',
      weight: item.weight || '',
      material: item.material || '',
      usageScenario: item.usageScenario || '',
      color: item.color || '',
      packageContents: item.packageContents || '',
      warranty: item.warranty || '',
      originCountry: item.originCountry || '',
      imageUrl: item.imagePath ? `/eu-doc${item.imagePath}` : '',
    })));
    setCompanyDocuments((documentResponse.data || []).map((item) => ({
      id: item.id,
      name: item.title || item.fileName || '未命名资料',
      type: item.documentType === 'certificate' ? '资质证书' : item.documentType === 'declaration_of_conformity' ? 'DoC声明文件' : item.documentType === 'manual' ? '使用说明书' : '其他资料',
      product: item.productName || '-',
      productId: item.productId,
      documentType: item.documentType,
      lang: item.language || '未设置',
      backup: item.backupStatus || '待备份',
      updatedAt: item.updatedAt || item.createdAt || '2026-06-25',
      fileUrl: getDocumentAssetUrl(item),
      certNo: item.certNo || '',
      standard: item.standard || '',
      issuer: item.issuer || '',
    })));
  };

  const closeProductModal = () => setProductModal(emptyProductModal);

  const updateProductModel = (index, value) => {
    setProductModal((form) => ({
      ...form,
      models: form.models.map((model, modelIndex) => (modelIndex === index ? value : model)),
    }));
  };

  const addProductModel = () => {
    setProductModal((form) => ({ ...form, models: [...form.models, ''] }));
  };

  const removeProductModel = (index) => {
    setProductModal((form) => ({
      ...form,
      models: form.models.length > 1 ? form.models.filter((_, modelIndex) => modelIndex !== index) : [''],
    }));
  };

  const createOrEditProduct = async () => {
    const modelText = productModal.models.map((model) => model.trim()).filter(Boolean).join(', ');
    const payload = {
      name: productModal.name.trim(),
      nameEn: productModal.nameEn.trim() || null,
      model: modelText,
      description: productModal.description.trim() || null,
      descriptionEn: productModal.descriptionEn.trim() || null,
      categoryPrimaryId: productModal.categoryPrimaryId || null,
      complianceCategoryIds: productModal.complianceCategoryIds || [],
      dimensions: productModal.dimensions.trim() || null,
      weight: productModal.weight.trim() || null,
      material: productModal.material.trim() || null,
      usageScenario: productModal.usageScenario.trim() || null,
      color: productModal.color.trim() || null,
      packageContents: productModal.packageContents.trim() || null,
      warranty: productModal.warranty.trim() || null,
      originCountry: productModal.originCountry.trim() || null,
      status: productModal.status || 'active',
    };
    if (!payload.name) {
      showAction('请先填写产品名称');
      return;
    }
    try {
      if (productModal.product?.id) {
        await api.updateProduct(productModal.product.id, payload);
        showAction('产品已更新');
      } else {
        await api.createProduct({ companyId: activeCompany, ...payload });
        showAction('产品已新增');
      }
      closeProductModal();
      await refreshCompanyAssets();
    } catch (error) {
      showAction(error.message || '产品保存失败');
    }
  };

  const openProductModal = (product = null) => {
    setProductModal({
      ...emptyProductModal,
      open: true,
      product,
      name: product?.name || '',
      nameEn: product?.nameEn || '',
      models: splitImportModels(product?.model).length ? splitImportModels(product?.model) : [''],
      categoryPrimaryId: product?.categoryPrimaryId || '',
      complianceCategoryIds: product?.complianceCategoryIds || (product?.complianceCategories || []).map((cat) => cat.id),
      status: product?.rawStatus || (product?.status === '草稿' ? 'draft' : 'active'),
      dimensions: product?.dimensions || '',
      weight: product?.weight || '',
      material: product?.material || '',
      usageScenario: product?.usageScenario || '',
      color: product?.color || '',
      packageContents: product?.packageContents || '',
      warranty: product?.warranty || '',
      originCountry: product?.originCountry || '',
      imageUrl: product?.imageUrl || '',
      description: product?.description || '',
      descriptionEn: product?.descriptionEn || '',
    });
  };


  const deleteProductFromModal = async () => {
    const product = productModal.product;
    if (!product?.id) return;
    const relatedDocs = getProductDocuments(product, companyDocuments);
    if (relatedDocs.length) {
      showAction(`该产品下还有 ${relatedDocs.length} 份资料，请先在资料管理中删除或转移资料`);
      return;
    }
    const firstConfirm = window.confirm(`确认删除产品「${product.name}」吗？删除后前台将不再展示这个产品。`);
    if (!firstConfirm) return;
    const typed = window.prompt('为避免误删，请输入 DELETE 确认删除');
    if (typed !== 'DELETE') {
      showAction('已取消删除');
      return;
    }
    try {
      await api.deleteProduct(product.id);
      showAction('产品已删除');
      closeProductModal();
      await refreshCompanyAssets();
    } catch (error) {
      showAction(error.message || '删除产品失败');
    }
  };

  const uploadProductImageFile = async (product) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        await api.uploadProductImage(product.id, file);
        setProductModal((form) => ({ ...form, imageUrl: URL.createObjectURL(file) }));
        showAction('产品图已上传');
        await refreshCompanyAssets();
      } catch (error) {
        showAction(error.message || '产品图上传失败');
      }
    };
    input.click();
  };

  const uploadDocumentFile = async () => {
    const product = companyProducts[0] || {};
    setDocumentModal(emptyDocumentModalState({
      open: true,
      mode: 'upload',
      productId: String(product.id || ''),
      productName: product.name || '',
    }));
  };

  const openDocumentSlotModal = (product, documentType, docs = []) => {
    const firstDoc = docs[0] || null;
    setDocumentModal(emptyDocumentModalState({
      open: true,
      mode: firstDoc ? 'edit' : 'upload',
      source: 'slot',
      doc: firstDoc,
      docs,
      title: firstDoc?.name || '',
      productId: String(product?.id || firstDoc?.productId || ''),
      productName: product?.name || firstDoc?.product || '',
      documentType,
      language: firstDoc?.lang || 'en',
      certNo: firstDoc?.certNo || '',
      standard: firstDoc?.standard || '',
      issuer: firstDoc?.issuer || '',
      lockedProduct: true,
      lockedType: true,
    }));
  };

  const editDocumentInfo = async (doc) => {
    const product = companyProducts.find((item) => String(item.id) === String(doc.productId)) || {};
    setDocumentModal(emptyDocumentModalState({
      open: true,
      mode: 'edit',
      doc,
      docs: [doc],
      title: doc.name || '',
      productId: String(doc.productId || ''),
      productName: product.name || doc.product || '',
      documentType: doc.documentType || 'certificate',
      language: doc.lang || 'en',
      certNo: doc.certNo || '',
      standard: doc.standard || '',
      issuer: doc.issuer || '',
    }));
  };

  const selectDocumentInSlotModal = (doc) => {
    setDocumentModal((form) => {
      if (form.filePreviewUrl) URL.revokeObjectURL(form.filePreviewUrl);
      const product = companyProducts.find((item) => String(item.id) === String(doc.productId)) || {};
      return {
        ...form,
        open: true,
        mode: 'edit',
        doc,
        docs: form.docs?.length ? form.docs : [doc],
        title: doc.name || '',
        productId: String(doc.productId || form.productId || ''),
        productName: form.productName || product.name || doc.product || '',
        documentType: doc.documentType || form.documentType || 'certificate',
        language: doc.lang || 'en',
        certNo: doc.certNo || '',
        standard: doc.standard || '',
        issuer: doc.issuer || '',
        file: null,
        filePreviewUrl: '',
      };
    });
  };

  const openDocumentPreview = () => {
    if (documentModal.file) {
      const objectUrl = URL.createObjectURL(documentModal.file);
      setDocumentPreview({ open: true, url: objectUrl, title: documentModal.file.name, objectUrl });
      return;
    }
    const docUrl = getDocumentAssetUrl(documentModal.doc);
    if (docUrl) {
      setDocumentPreview({ open: true, url: docUrl, title: documentModal.doc.name || '资料预览', objectUrl: '' });
      return;
    }
    showAction(hasDocumentRecord(documentModal.doc) ? '该资料暂无可预览地址，可点击替换补充资料' : '请先上传或选择资料');
  };

  const closeDocumentPreview = () => {
    setDocumentPreview((preview) => {
      if (preview.objectUrl) URL.revokeObjectURL(preview.objectUrl);
      return { open: false, url: '', title: '', objectUrl: '' };
    });
  };

  const setDocumentModalFile = (file) => {
    setDocumentModal((form) => {
      if (form.filePreviewUrl) URL.revokeObjectURL(form.filePreviewUrl);
      return {
        ...form,
        file,
        filePreviewUrl: file && file.type?.startsWith('image/') ? URL.createObjectURL(file) : '',
        title: file && !form.title ? titleFromFileName(file.name) : form.title,
        language: file ? inferLanguageFromFileName(file.name) : form.language,
      };
    });
  };

  const closeDocumentModal = () => {
    setDocumentModal((form) => {
      if (form.filePreviewUrl) URL.revokeObjectURL(form.filePreviewUrl);
      return emptyDocumentModalState();
    });
  };

  const submitDocumentModal = async () => {
    try {
      if (documentModal.mode === 'upload') {
        if (!documentModal.file) {
          showAction('请选择要上传的资料');
          return;
        }
        const result = await api.createDocument({
          companyId: activeCompany,
          productId: documentModal.productId,
          documentType: documentModal.documentType,
          title: documentModal.title,
          language: documentModal.language,
          file: documentModal.file,
          confirmedAuthentic: '1',
          confirmedAuthorized: '1',
          acceptedDisclaimer: '1',
          certNo: documentModal.certNo,
          standard: documentModal.standard,
          issuer: documentModal.issuer,
        });
        if (!getUploadResultFileUrl(result)) throw new Error('资料已提交但未返回资料地址，请重新上传');
        showAction('资料已上传并保存成功');
      } else {
        await api.updateDocument(documentModal.doc.id, {
          title: documentModal.title,
          language: documentModal.language,
          certNo: documentModal.certNo,
          standard: documentModal.standard,
          issuer: documentModal.issuer,
        });
        if (documentModal.file) {
          const result = await api.replaceDocumentFile(documentModal.doc.id, documentModal.file);
          if (!getUploadResultFileUrl(result)) throw new Error('资料替换失败：未返回新资料地址');
          showAction('资料信息和资料本体已更新');
        } else {
          showAction('资料信息已更新');
        }
      }
      closeDocumentModal();
      await refreshCompanyAssets();
    } catch (error) {
      showAction(error.message || '资料保存失败');
    }
  };

  const replaceFile = async (doc) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/png,image/jpeg';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        await api.replaceDocumentFile(doc.id, file);
        showAction('资料已替换');
        await refreshCompanyAssets();
      } catch (error) {
        showAction(error.message || '资料替换失败');
      }
    };
    input.click();
  };

  const renderUploadPanel = ({ compact = false } = {}) => {
    const pendingCount = importItems.filter((item) => item.status === 'pending').length;
    return (
      <div className={`${styles.workspaceUploadPanel} ${compact ? styles.workspaceUploadCompact : ''}`}>
        <div>
          <h3>上传资料</h3>
          <p>支持批量上传 PDF / 图片或整个文件夹。上传后会先进入待整理资料池，不会自动公开，确认归档后再由企业控制展示状态。</p>
          <p>请仅上传适合对外展示的产品资料，例如证书、DoC 声明、说明书和公开检测报告；不要上传图纸、配方、BOM、报价、供应商或内部工艺等商业敏感资料。</p>
          <div className={styles.importStats}>
            <span><strong>{importItems.length}</strong>全部资料</span>
            <span><strong>{pendingCount}</strong>待整理</span>
            <span><strong>{importItems.length - pendingCount}</strong>已关联</span>
          </div>
        </div>
        <div className={styles.importActions}>
          <label className={styles.importCompanyPicker}>
            <span>导入公司</span>
            <select value={activeCompany || ''} onChange={(event) => setActiveCompany(Number(event.target.value))}>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name} · {company.code}</option>)}
            </select>
          </label>
          <input ref={importInputRef} type="file" multiple accept="application/pdf,image/png,image/jpeg,image/webp,.doc,.docx" className={styles.hiddenInput} onChange={(event) => uploadImportFiles(event.target.files)} />
          <button className={styles.primaryBtn} onClick={() => importInputRef.current?.click()}>选择资料批量上传</button>
          <button className={styles.secondaryBtn} onClick={selectImportFolder}>上传整个文件夹</button>
          <button className={styles.secondaryBtn} onClick={refreshImportItems}>刷新</button>
        </div>
      </div>
    );
  };

  const pageTitle = useMemo(() => {
    const all = [...personalMenus, ...companyMenus, ...platformMenus];
    const current = all.find((item) => item.id === activePage);
    return current?.labelKey ? t(current.labelKey) : '后台';
  }, [activePage, t]);

  const renderContent = () => {
    if (activeGroup === 'personal') {
      if (activePage === 'profile') {
        return (
          <Section title={t('admin.profile.title')} desc={t('admin.profile.desc')}>
            <div className={styles.profileLayout}>
              <aside className={styles.profileSummary}>
                <div className={styles.avatarLarge}>
                  {avatarUrl ? <img src={avatarUrl} alt={t('admin.profile.name')} /> : (profileForm.displayName || admin?.display_name || admin?.username || 'A').slice(0, 1).toUpperCase()}
                </div>
                <h3>{profileForm.displayName || admin?.display_name || admin?.username || 'admin'}</h3>
                <p>{admin?.email || 'admin@legacy.local'}</p>
                <div className={styles.userCodeBox}>
                  <span>{t('admin.common.userId')}</span>
                  <strong>{userCode}</strong>
                  <button type="button" onClick={copyUserCode}>{t('admin.common.copy')}</button>
                </div>
              </aside>

              <div className={styles.profileFormCard}>
                <div className={styles.formHeader}>
                  <div>
                    <h3>{t('admin.profile.basicInfo')}</h3>
                    <p>{t('admin.profile.basicInfoDesc')}</p>
                  </div>
                  <>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className={styles.hiddenInput}
                      onChange={(event) => uploadAvatar(event.target.files?.[0])}
                    />
                    <button className={styles.secondaryBtn} onClick={() => avatarInputRef.current?.click()}>{t('admin.profile.uploadAvatar')}</button>
                  </>
                </div>

                <div className={styles.editGrid}>
                  <label>
                    <span>{t('admin.profile.displayName')}</span>
                    <input value={profileForm.displayName} onChange={(event) => setProfileForm((form) => ({ ...form, displayName: event.target.value }))} />
                  </label>
                  <label>
                    <span>{t('admin.profile.realName')}</span>
                    <input value={profileForm.realName} onChange={(event) => setProfileForm((form) => ({ ...form, realName: event.target.value }))} placeholder={t('admin.profile.realNamePlaceholder')} />
                  </label>
                  <label>
                    <span>{t('admin.profile.position')}</span>
                    <input value={profileForm.position} onChange={(event) => setProfileForm((form) => ({ ...form, position: event.target.value }))} placeholder={t('admin.profile.positionPlaceholder')} />
                  </label>
                  <label>
                    <span>{t('admin.profile.department')}</span>
                    <input value={profileForm.department} onChange={(event) => setProfileForm((form) => ({ ...form, department: event.target.value }))} placeholder={t('admin.profile.departmentPlaceholder')} />
                  </label>
                  <label className={styles.fullField}>
                    <span>{t('admin.profile.bio')}</span>
                    <textarea value={profileForm.bio} onChange={(event) => setProfileForm((form) => ({ ...form, bio: event.target.value }))} placeholder={t('admin.profile.bioPlaceholder')} rows="4" />
                  </label>
                </div>

                <div className={styles.profileNote}>
                  {t('admin.profile.securityNote')}
                </div>

                <div className={styles.formActions}>
                  <button className={styles.secondaryBtn} onClick={() => showAction(t('admin.profile.cancelNote'))}>{t('admin.common.cancel')}</button>
                  <button className={styles.primaryBtn} onClick={saveProfile}>{t('admin.profile.saveChanges')}</button>
                </div>
              </div>
            </div>
          </Section>
        );
      }

      if (activePage === 'security') {
        return (
          <Section title={t('admin.security.title')} desc={t('admin.security.desc')}>
            <div className={styles.securityGrid}>
              <div className={styles.securityCard}>
                <div className={styles.securityIcon}>@</div>
                <div>
                  <h3>{t('admin.security.loginEmail')}</h3>
                  <p>{admin?.email || 'admin@legacy.local'}</p>
                  <span className={styles.safeTag}>{t('admin.security.bound')}</span>
                </div>
                <button className={styles.secondaryBtn} onClick={() => showAction(t('admin.security.emailChangeNote'))}>{t('admin.security.changeEmail')} <span className={styles.todoBadge}>{t('admin.security.todoPending')}</span></button>
              </div>

              <div className={styles.securityCard}>
                <div className={styles.securityIcon}>☎</div>
                <div>
                  <h3>{t('admin.security.loginPhone')}</h3>
                  <p>{t('admin.security.phoneDesc')}</p>
                  <span className={styles.warnTag}>{t('admin.security.unbound')}</span>
                </div>
                <button className={styles.primaryBtn} onClick={() => showAction(t('admin.security.phoneBindNote'))}>{t('admin.security.bindPhone')} <span className={styles.todoBadgeLight}>{t('admin.security.todoPending')}</span></button>
              </div>

              <div className={styles.securityCard}>
                <div className={styles.securityIcon}>⌘</div>
                <div>
                  <h3>{t('admin.security.loginPassword')}</h3>
                  <p>{t('admin.security.passwordDesc')}</p>
                  <span className={styles.safeTag}>{t('admin.security.set')}</span>
                </div>
                <button className={styles.secondaryBtn} onClick={() => setPasswordModal({ open: true, oldPassword: '', newPassword: '', confirmPassword: '' })}>{t('admin.security.changePassword')}</button>
              </div>

              <div className={styles.securityCard}>
                <div className={styles.securityIcon}>2F</div>
                <div>
                  <h3>{t('admin.security.twoFactorAuth')}</h3>
                  <p>{t('admin.security.twoFactorDesc')}</p>
                  <span className={styles.warnTag}>{t('admin.security.notEnabled')}</span>
                </div>
                <button className={styles.secondaryBtn} onClick={() => showAction(t('admin.security.twoFactorNote'))}>{t('admin.security.enableVerification')} <span className={styles.todoBadge}>{t('admin.security.todoPending')}</span></button>
              </div>
            </div>

            <div className={styles.securityPanel}>
              <div className={styles.formHeader}>
                <div>
                  <h3>{t('admin.security.recentLogins')}</h3>
                  <p>{t('admin.security.recentLoginsDesc')}</p>
                </div>
                <button className={styles.secondaryBtn} onClick={revokeSessions}>{t('admin.security.logoutOthers')}</button>
              </div>
              <DataTable
                columns={[t('admin.security.time'), t('admin.security.device'), t('admin.security.location'), t('admin.security.ip'), t('admin.common.status')]}
                rows={(loginRecords.length ? loginRecords : [{ createdAt: '刚刚', ipAddress: '127.0.0.1' }]).map((record, index) => [
                  record.createdAt || record.created_at || t('admin.security.justNow'),
                  index === 0 ? t('admin.security.currentBrowser') : t('admin.security.historicalDevice'),
                  t('admin.security.locationPending'),
                  record.ipAddress || record.ip_address || '-',
                  index === 0 ? t('admin.security.currentLogin') : t('admin.security.normal'),
                ])}
              />
            </div>
          </Section>
        );
      }

      if (activePage === 'favorites') {
        return (
          <Section title={t('admin.favorites.title')} desc={t('admin.favorites.desc')}>
            <div className={styles.favoriteTopBar}>
              <div>
                <h3>收藏夹</h3>
                <p>收藏会按公司、产品、资料自动归类，也可以通过搜索和筛选快速回到目标资料。</p>
              </div>
              <div className={styles.favoriteStatsPills}>
                <span>全部 {favoriteStats.all}</span>
                <span>资料 {favoriteStats.file}</span>
                <span>提醒 {favoriteStats.warning}</span>
              </div>
            </div>

            <div className={styles.favoriteWorkspace}>
              <aside className={styles.favoriteSidebar}>
                <div className={styles.favoriteSidebarBlock}>
                  <strong>系统分组</strong>
                  {favoriteTypeOptions.map((item) => {
                    const countMap = {
                      全部收藏: favoriteStats.all,
                      公司: favoriteStats.company,
                      产品: favoriteStats.product,
                      资质证书: favoriteStats.certificate,
                      'DoC 声明': favoriteStats.doc,
                      说明书: favoriteStats.manual,
                      检测报告: favoriteStats.report,
                      有提醒: favoriteStats.warning,
                      最近取消: favoriteStats.deleted
                    };
                    return (
                      <button key={item} className={favoriteFilter === item ? styles.favoriteNavActive : ''} onClick={() => { setFavoriteFilter(item); setFavoriteGroup('全部收藏'); setFavoriteFileType('all'); setFavoriteStatusFilter(item === '最近取消' ? 'deleted' : 'all'); }}>
                        <span>{item}</span><em>{countMap[item]}</em>
                      </button>
                    );
                  })}
                </div>
                <div className={styles.favoriteSidebarBlock}>
                  <strong>我的分组</strong>
                  {favoriteGroupOptions.map((group) => (
                    <button key={group.name} className={favoriteGroup === group.name ? styles.favoriteNavActive : ''} onClick={() => setFavoriteGroup(group.name)}>
                      <span>{group.name}</span><em>{group.count}</em>
                    </button>
                  ))}
                  <button className={styles.favoriteAddGroup} onClick={() => { setFavoriteFilter('全部收藏'); setFavoriteGroup('未分组'); }}>查看未分组</button>
                </div>
              </aside>

              <div className={styles.favoriteMain}>
                <div className={styles.favoriteFilterPanel}>
                  <input value={favoriteSearch} onChange={(event) => setFavoriteSearch(event.target.value)} placeholder="搜索标题、公司、产品、证书编号或备注" />
                  <select value={favoriteFileType} onChange={(event) => setFavoriteFileType(event.target.value)}>
                    {favoriteFileTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <select value={favoriteStatusFilter} onChange={(event) => setFavoriteStatusFilter(event.target.value)}>
                    {favoriteStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <button className={styles.secondaryBtn} onClick={() => { setFavoriteSearch(''); setFavoriteGroup('全部收藏'); setFavoriteFileType('all'); setFavoriteStatusFilter(favoriteFilter === '最近取消' ? 'deleted' : 'all'); }}>重置</button>
                </div>

                <div className={styles.favoriteResultBar}>
                  <span>{favoriteResultText}{activeFavoriteFilterLabels.length ? ` · ${activeFavoriteFilterLabels.join(' / ')}` : ''}</span>
                  <em>{favoriteFileType !== 'all' ? favoriteFileTypeOptions.find((item) => item.value === favoriteFileType)?.label : '全部资料类型'}</em>
                </div>

                <div className={styles.favoriteList}>
                  {visibleFavoriteCount > 0 ? (
                    useFavoriteHierarchy ? favoriteHierarchy.map((company) => (
                      <section key={company.key} className={styles.favoriteTreeGroup}>
                        <div className={`${styles.favoriteTreeHeader} ${styles.favoriteToneCompany}`}>
                          <div>
                            <span>公司</span>
                            <button type="button" className={styles.favoriteTreeTitleButton} onClick={() => company.companyId && openFavoriteTarget('公司', company.companyId)}>{company.name}</button>
                          </div>
                          <div className={styles.favoriteTreeHeaderActions}>
                            <em>{getCompanyFavoriteTotal(company)} 条收藏</em>
                            {company.favorite ? <>
                              <button className={styles.secondaryBtn} onClick={() => openFavoriteTarget('公司', company.favorite.itemId)}>查看</button>
                              <button className={styles.secondaryBtn} onClick={() => updateFavoriteItemNote(company.favorite)}>整理</button>
                              <button className={styles.textDangerBtn} onClick={() => cancelFavoriteItem(company.favorite)}>取消收藏</button>
                            </> : company.companyId && <button className={styles.secondaryBtn} onClick={() => openFavoriteTarget('公司', company.companyId)}>查看</button>}
                          </div>
                        </div>
                        <div className={styles.favoriteTreeChildren}>
                          {company.products.map((product) => (
                            <div key={product.key} className={styles.favoriteProductGroup}>
                              <div className={`${styles.favoriteProductHeader} ${styles.favoriteToneProduct}`}>
                                <div>
                                  <span>产品</span>
                                  <button type="button" className={styles.favoriteProductTitleButton} onClick={() => product.productId && openFavoriteTarget('产品', product.productId)}>{product.name}</button>
                                </div>
                                <div className={styles.favoriteTreeHeaderActions}>
                                  <em>{getProductFavoriteTotal(product)} 条收藏</em>
                                  {product.favorite ? <>
                                    <button className={styles.secondaryBtn} onClick={() => openFavoriteTarget('产品', product.favorite.itemId)}>查看</button>
                                    <button className={styles.secondaryBtn} onClick={() => updateFavoriteItemNote(product.favorite)}>整理</button>
                                    <button className={styles.textDangerBtn} onClick={() => cancelFavoriteItem(product.favorite)}>取消收藏</button>
                                  </> : product.productId && <button className={styles.secondaryBtn} onClick={() => openFavoriteTarget('产品', product.productId)}>查看</button>}
                                </div>
                              </div>
                              {product.files.length > 0 ? product.files.map((file) => renderFavoriteCard(file, true)) : product.favorite && <div className={styles.favoriteTreeHint}>已收藏该产品，暂无下级资料收藏。</div>}
                            </div>
                          ))}
                          {company.files.map((file) => renderFavoriteCard(file, true))}
                        </div>
                      </section>
                    )) : displayFavorites.map((item) => renderFavoriteCard(item))
                  ) : (
                    <div className={styles.favoriteEmptyState}>
                      <strong>没有找到匹配的收藏</strong>
                      <p>可以换一个关键词，或重置资料类型、状态筛选。</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Section>
        );
      }

      if (activePage === 'history') {
        const activeTypeLabel = historyTypeOptions.find((item) => item.value === historyTypeFilter)?.label || '全部';
        const activeRangeLabel = historyRangeOptions.find((item) => item.value === historyRange)?.label || '全部时间';
        return (
          <Section title={t('admin.history.title')} desc={t('admin.history.desc')}>
            <div className={styles.historyHeroPanel}>
              <div>
                <span className={styles.historyEyebrow}>浏览历史</span>
                <h3>继续上次查看的资料</h3>
                <p>按 B 站历史记录的逻辑整理：最近看过的公司、产品和资料会按时间线归档，方便快速回到现场。</p>
              </div>
              <div className={styles.historyHeroStats}>
                <span><strong>{historyStats.all}</strong>全部</span>
                <span><strong>{historyStats.file}</strong>资料</span>
                <span><strong>{historyStats.product}</strong>产品</span>
              </div>
            </div>

            <div className={styles.historyControlPanel}>
              <div className={styles.historySearchBox}>
                <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="搜索浏览历史：资料名、产品、公司" />
              </div>
              <div className={styles.historyQuickFilters}>
                {historyTypeOptions.map((item) => (
                  <button key={item.value} className={historyTypeFilter === item.value ? styles.historyFilterActive : ''} onClick={() => setHistoryTypeFilter(item.value)}>
                    {item.short}
                  </button>
                ))}
              </div>
              <select value={historyRange} onChange={(event) => setHistoryRange(event.target.value)}>
                {historyRangeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <button className={styles.secondaryBtn} onClick={() => { setHistorySearch(''); setHistoryTypeFilter('all'); setHistoryRange('all'); }}>重置</button>
            </div>

            <div className={styles.historyActionRow}>
              <div>
                <strong>{activeTypeLabel} · {filteredHistoryRows.length} 条</strong>
                <span>{activeRangeLabel}{historySearch ? ` · 搜索“${historySearch}”` : ''}</span>
              </div>
              <div className={styles.historySwitchBox}>
                <span>{historyEnabled ? '正在记录浏览历史' : '已暂停记录历史'}</span>
                <button className={historyEnabled ? styles.switchOn : styles.switchOff} onClick={async () => { const next = !historyEnabled; try { await api.updateHistorySetting(next); setHistoryEnabled(next); showAction(next ? '浏览历史已开启' : '浏览历史已关闭'); } catch (error) { showAction(error.message || '设置保存失败'); } }}>{historyEnabled ? '暂停记录' : '恢复记录'}</button>
                <button className={styles.textDangerBtn} onClick={async () => { if (!confirm('确定清空全部浏览历史吗？')) return; try { await api.clearHistory(); setHistoryRows([]); showAction('浏览历史已清空'); } catch (error) { showAction(error.message || '清空历史失败'); } }}>清空</button>
              </div>
            </div>

            <div className={styles.historyTimeline}>
              {groupedHistoryRows.length > 0 ? groupedHistoryRows.map((group) => (
                <section key={group.label} className={styles.historyDayGroup}>
                  <div className={styles.historyDayLabel}>{group.label}<em>{group.items.length} 条</em></div>
                  <div className={styles.historyList}>
                    {group.items.map((item) => {
                      const timeLabel = new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <article key={item.historyId || `${item.time}-${item.name}`} className={styles.historyItem}>
                          <div className={`${styles.historyType} ${item.type === '公司' ? styles.historyTypeCompany : item.type === '产品' ? styles.historyTypeProduct : styles.historyTypeFile}`}>{item.type}</div>
                          <div className={styles.historyMainText}>
                            <button type="button" onClick={() => item.targetPath ? navigate(item.targetPath) : showAction('这条历史记录缺少跳转目标')}>{item.name}</button>
                            <p>{item.company || '暂无来源信息'}</p>
                          </div>
                          <div className={styles.historyTimeBlock}>
                            <strong>{timeLabel}</strong>
                            <span>{item.action || '查看'}</span>
                          </div>
                          <div className={styles.historyActions}>
                            <button className={styles.secondaryBtn} disabled={!item.targetPath} onClick={() => item.targetPath ? navigate(item.targetPath) : showAction('这条历史记录缺少跳转目标')}>继续查看</button>
                            {item.historyId && <button className={styles.textDangerBtn} onClick={async () => { try { await api.deleteHistoryItem(item.historyId); setHistoryRows((rows) => rows.filter((row) => row[5] !== item.historyId)); showAction('浏览记录已删除'); } catch (error) { showAction(error.message || '删除失败'); } }}>删除</button>}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )) : (
                <div className={styles.historyEmptyState}>
                  <strong>暂无匹配的浏览记录</strong>
                  <p>可以切换类型、时间范围，或清空搜索关键词后再试。</p>
                </div>
              )}
            </div>

            <div className={styles.profileNote}>历史记录最多保留最近 200 条；关闭记录后，继续查看资料不会写入新的历史。</div>
          </Section>
        );
      }

      if (activePage === 'notifications') {
        return (
          <Section title={t('admin.notifications.title')} desc={t('admin.notifications.desc')}>
            <div className={styles.notificationTopBar}>
              <div>
                <h3>通知中心</h3>
                <p>重要通知会置顶显示，后续可扩展邮件通知。</p>
              </div>
              <button className={styles.secondaryBtn} onClick={async () => { try { await api.markAllNotificationsRead(); setNotificationItems((items) => items.map((item) => ({ ...item, status: item.status === '待处理' ? item.status : '已读' }))); showAction('已全部标记为已读'); } catch (error) { showAction(error.message || '标记失败'); } }}>全部标记已读</button>
            </div>

            <div className={styles.toolbar}>
              {['全部', '未读', '企业邀请', '资料更新', '举报处理', '系统公告'].map((item, index) => (
                <button key={item} className={index === 0 ? styles.primaryBtn : styles.secondaryBtn}>{item}</button>
              ))}
            </div>

            <div className={styles.notificationList}>
              {notificationItems.map(({ id, title, desc, status, tone, pinned }) => (
                <article key={title} className={`${styles.notificationItem} ${pinned ? styles.notificationPinned : ''}`}>
                  <div className={`${styles.noticeDot} ${styles[tone]}`} />
                  <div>
                    <h3>{pinned ? '置顶 · ' : ''}{title}</h3>
                    <p>{desc}</p>
                  </div>
                  <span>{status}</span>
                  <button className={styles.secondaryBtn} onClick={async () => { if (status === '待处理') { showAction('企业邀请处理流程后续在员工权限中接入'); return; } try { await api.markNotificationRead(id); setNotificationItems((items) => items.map((item) => item.id === id ? { ...item, status: '已读' } : item)); showAction('通知已标记为已读'); } catch (error) { showAction(error.message || '操作失败'); } }}>{status === '待处理' ? '处理' : '标记已读'}{status === '待处理' && <span className={styles.todoBadge}>待完善</span>}</button>
                </article>
              ))}
            </div>
          </Section>
        );
      }

      return <Placeholder title={pageTitle} desc="这里后续展示普通用户的收藏、历史和通知数据。" />;
    }

    if (activeGroup === 'import') {
      if (!companies.length || !activeCompany) {
        return (
          <Section title="批量导入" desc="先把资料一股脑上传到待整理资料池，再慢慢关联到产品。">
            <div className={styles.importBlockedState}>
              <div className={styles.importBlurPreview}>
                <div />
                <div />
                <div />
              </div>
              <div className={styles.importBlockedCard}>
                <h3>请先创建或选择公司</h3>
                <p>批量导入的资料必须归属于某一家公司。请先创建公司，或者选择左侧已有公司后再上传。</p>
                <button className={styles.primaryBtn} onClick={() => setCompanyModal({ open: true, mode: 'create', name: '', nameEn: '', contactEmail: '' })}>创建 / 认领公司</button>
              </div>
            </div>
          </Section>
        );
      }

      const pendingCount = importItems.filter((item) => item.status === 'pending').length;
      const importGroups = buildImportGroups(importItems).flatMap((group) => {
        if (splitImportGroups[group.key]) {
          return group.items.map((item) => ({
            key: `single:${item.id}`,
            items: [item],
            type: item.guessedType || 'other',
            model: item.guessedModels || item.guessedModel || '',
            suggestedName: item.suggestedProductName || item.guessedModels || item.guessedModel || '新产品',
            languages: [item.guessedLanguage || 'en'],
            originalGroupKey: group.key,
          }));
        }
        const keepItems = group.items.filter((item) => !item.isDuplicate);
        const duplicateItems = group.items.filter((item) => item.isDuplicate);
        const groups = [];
        if (keepItems.length) groups.push({ ...group, key: `${group.key}:keep`, items: keepItems, isDuplicateGroup: false });
        if (duplicateItems.length) groups.push({ ...group, key: `${group.key}:dups`, items: duplicateItems, isDuplicateGroup: true });
        return groups.length ? groups : [group];
      });
      const organizedItems = importItems.filter((item) => item.status === 'organized');
      const activeImportGroup = importGroups.find((group) => group.key === activeImportGroupKey && !group.isDuplicateGroup);
      return (
        <Section title="批量导入" desc="先把资料一股脑上传到待整理资料池，再慢慢关联到产品。">
          {renderUploadPanel()}

          <div className={styles.importDropHint} onClick={() => importInputRef.current?.click()}>
            <strong>点击这里选择多份资料</strong>
            <p>支持多选文件或整个文件夹；资料会先进入待整理状态，不会自动公开。请不要上传图纸、配方、报价、供应商等商业敏感资料。</p>
          </div>

          <div className={styles.importList}>
            {importItems.length === 0 ? <Placeholder title="暂无待整理资料" desc="上传资料后会显示在这里。" /> : (
              <>
                <div className={styles.importCardGrid}>
                  {importGroups.map((group) => {
                    const formKey = `group:${group.key}`;
                    const form = importSelection[formKey] || {};
                    const typeValue = form.documentType || inferImportType(group.items[0], group.type);
                    const confidence = getImportConfidence(group);
                    return (
                      <button key={group.key} className={`${styles.importMiniCard} ${group.isDuplicateGroup ? styles.importDuplicateCard : ''}`} onClick={() => { if (group.isDuplicateGroup) showAction('这是重复资料卡片，可直接删除重复资料'); else { setActiveImportGroupKey(group.key); openPage('import', 'bulk-import', activeCompany); } }}>
                        <div className={styles.importMiniTop}>
                          <span className={styles.fileTypeIcon}>{typeValue.slice(0, 3)}</span>
                          <span className={`${styles.confidenceDot} ${styles[confidence.tone]}`} />
                          {group.isDuplicateGroup && <span className={styles.duplicateBadge}>疑似重复</span>}
                        </div>
                        <strong>{group.model || group.suggestedName}</strong>
                        <p>{group.isDuplicateGroup ? `${group.items.length} 份重复资料` : `${group.items.length} 份资料`} · {group.languages.join(' / ')} · {group.items.some((item) => item.extractedTextStatus === 'pdf_text_layer') ? '已读PDF文字' : '文件名识别'}</p>
                        <div className={styles.importMiniFiles}>
                          {group.items.slice(0, 3).map((item) => <span key={item.id} className={styles.fileStackRow}>
                            <span className={styles.fileStackName}>{item.originalName}</span>
                            <span className={styles.fileStackBadges}><em className={group.isDuplicateGroup ? styles.fileDupTag : styles.fileKeepTag}>{group.isDuplicateGroup ? '重复' : '保留'}</em></span>
                          </span>)}
                          {group.items.length > 3 && <span>+{group.items.length - 3}</span>}
                        </div>
                        <em className={`${styles.duplicateReason} ${!group.isDuplicateGroup ? styles.normalCardHint : ''}`}>{group.isDuplicateGroup ? '这些是后上传的重复资料，删除它们不会影响正常卡片。' : '正常资料，可点击卡片继续编辑和归档。'}</em>
                        <span className={styles.importMiniDanger} onClick={(event) => { event.stopPropagation(); group.isDuplicateGroup ? deleteDuplicateImportItems(group) : deletePendingImportGroup(group); }}>{group.isDuplicateGroup ? '删除重复卡片' : '删除'}</span>
                      </button>
                    );
                  })}
                </div>

                {activeImportGroup && createPortal((() => {
                  const group = activeImportGroup;
                  const formKey = `group:${group.key}`;
                  const form = importSelection[formKey] || {};
                  const typeValue = form.documentType || inferImportType(group.items[0], group.type);
                  const recommendedProduct = findMatchingProduct(group, companyProducts);
                  const recommendedProductId = recommendedProduct ? String(recommendedProduct.id) : '';
                  const matchedProductId = Object.prototype.hasOwnProperty.call(form, 'productId') ? form.productId : recommendedProductId;
                  const hasSelectedProduct = Boolean(matchedProductId);
                  const confidence = getImportConfidence(group);
                  const suggestedClassification = getImportSuggestedClassification(group) || {};
                  const selectedImportCategoryId = form.categoryPrimaryId || suggestedClassification.consumerCategoryId || '';
                  const selectedImportChain = buildCategoryChain(selectedImportCategoryId, consumerCategoryById);
                  const importTopCategoryId = selectedImportChain[0]?.id || '';
                  const importSecondCategoryId = selectedImportChain[1]?.id || '';
                  const importThirdCategoryId = selectedImportChain[2]?.id || '';
                  const importSecondOptions = importTopCategoryId ? getConsumerChildren(importTopCategoryId) : [];
                  const importThirdOptions = importSecondCategoryId ? getConsumerChildren(importSecondCategoryId) : [];
                  const selectedComplianceIds = (form.complianceCategoryIds || suggestedClassification.complianceCategoryIds || []).map(String);
                  return (
                    <div className={styles.importModalBackdrop} onClick={() => setActiveImportGroupKey(null)}>
                      <div className={styles.importModal} onClick={(event) => event.stopPropagation()}>
                        <div className={styles.importModalHeader}>
                          <div>
                            <p>待整理资料</p>
                            <h3>{group.model || group.suggestedName}</h3>
                          </div>
                          <button className={styles.secondaryBtn} onClick={() => setActiveImportGroupKey(null)}>关闭</button>
                        </div>

                        <div className={styles.importGroupHeader}>
                          <div>
                            <div className={styles.importFileNameRow}>
                              {group.items.map((item) => <strong key={item.id}>{item.originalName}</strong>)}
                            </div>
                            <p className={styles.importGroupHint}>系统根据资料名称和可读取的PDF文字判断它们可能属于同一个产品。</p>
                            <div className={styles.freeRecognizeChips}>
                              {group.items.some((item) => item.extractedTextStatus === 'pdf_text_layer') && <span>PDF文字层已提取</span>}
                              {[...new Set(group.items.map((item) => item.guessedStandard).filter(Boolean))].map((value) => <span key={value}>标准：{value}</span>)}
                              {[...new Set(group.items.map((item) => item.guessedIssuer).filter(Boolean))].map((value) => <span key={value}>机构：{value}</span>)}
                              {[...new Set(group.items.map((item) => item.guessedValidUntil).filter(Boolean))].map((value) => <span key={value}>有效期：{value}</span>)}
                            </div>
                            {group.items.some((item) => item.isDuplicate) && (() => {
                              const duplicate = group.items.find((item) => item.isDuplicate);
                              return <div className={styles.duplicatePanel}>
                                <strong>检测到可能重复</strong>
                                <p>本次上传资料可能已经归档：{duplicate?.duplicateDocumentProduct || '已归档产品'} / {duplicate?.duplicateDocumentTitle || duplicate?.duplicateReason}</p>
                                <span>你可以批量删除后上传的重复资料，较早资料仍可继续编辑和归档。</span>
                              </div>;
                            })()}
                          </div>
                          <div className={styles.importHeaderActions}>
                            <span className={`${styles.confidenceBadge} ${styles[confidence.tone]}`}>{confidence.label} · {confidence.desc}</span>
                          </div>
                        </div>

                        <div className={styles.importQuestionnaire}>
                          <section id={`${formKey}-step-1`} className={importStepClass(styles, form.confirmedStep || 0, 1)}>
                            <div className={styles.questionIndex}>{(form.confirmedStep || 0) >= 1 ? '✓' : '1'}</div>
                            <div className={styles.questionBody}>
                              <h4>确认这些资料是否属于同一个产品</h4>
                              <p>如果属于同一个产品就继续；如果系统分错了，直接拆分成单份资料整理。</p>
                              <div className={styles.finalActions}>
                                <button className={styles.secondaryBtn} onClick={() => confirmImportStep(formKey, 1)}>{(form.confirmedStep || 0) >= 1 ? '已确认同一产品' : '确认是同一产品'}</button>
                                {group.items.length > 1 && <button className={styles.secondaryBtn} onClick={() => { setSplitImportGroups((state) => ({ ...state, [group.key]: true })); setActiveImportGroupKey(null); }}>识别错误？拆分整理</button>}
                              </div>
                            </div>
                          </section>

                          <section id={`${formKey}-step-2`} className={importStepClass(styles, form.confirmedStep || 0, 2)}>
                            <div className={styles.questionIndex}>{(form.confirmedStep || 0) >= 2 ? '✓' : '2'}</div>
                            <div className={styles.questionBody}>
                              <h4>确认归属产品</h4>
                              <p>新公司通常选择“创建新产品”；已有产品则选择对应产品。适用型号按独立型号确认。</p>
                              <div className={styles.productAssignGrid}>
                                <label><span>归档方式</span><select value={matchedProductId || ''} onChange={(event) => {
                                  const nextValue = event.target.value;
                                  if (!nextValue && recommendedProductId) {
                                    const ok = window.confirm(`检测到已有相似产品：${recommendedProduct.name} / ${recommendedProduct.model || '未填型号'}。确认仍要创建新产品吗？`);
                                    if (!ok) return;
                                  }
                                  setImportSelection((state) => ({ ...state, [formKey]: { ...form, productId: nextValue } }));
                                }}>{recommendedProduct && <option value={recommendedProductId}>{recommendedProduct.name} / {recommendedProduct.model}</option>}{companyProducts.filter((product) => String(product.id) !== recommendedProductId).map((product) => <option key={product.id} value={product.id}>{product.name} / {product.model}</option>)}<option value="">创建新产品</option></select>{recommendedProduct && <em className={styles.matchHint}>系统检测到该资料可能属于上方已选产品，建议优先关联，避免重复创建。</em>}</label>
                                {!hasSelectedProduct && <label><span>产品/系列名称</span><input value={form.newProductName || group.suggestedName || ''} onChange={(event) => setImportSelection((state) => ({ ...state, [formKey]: { ...form, newProductName: event.target.value } }))} placeholder="例如：F60-608" /></label>}
                              </div>
                              {!hasSelectedProduct && <div className={styles.modelEditor}>
                                <div className={styles.modelChipGrid}>
                                  {[...(splitImportModels(group.model).length ? splitImportModels(group.model) : ['']), ...(form.extraModels || [])].map((model, index) => {
                                    const baseCount = splitImportModels(group.model).length || 1;
                                    const isBase = index < baseCount;
                                    const value = isBase ? (form[`model_${index}`] ?? model) : model;
                                    return <label key={`${model}-${index}`} className={styles.modelChipInput}><span>适用型号 {index + 1}</span><div className={styles.modelInputWrap}><input id={`${formKey}-model-${index}`} value={value} onChange={(event) => {
                                      if (isBase) setImportSelection((state) => ({ ...state, [formKey]: { ...form, [`model_${index}`]: event.target.value } }));
                                      else setImportSelection((state) => ({ ...state, [formKey]: { ...form, extraModels: (form.extraModels || []).map((extraValue, extraIndex) => extraIndex === index - baseCount ? event.target.value : extraValue) } }));
                                    }} placeholder="例如：F20-201AL" />{!isBase && <button type="button" onClick={() => setImportSelection((state) => ({ ...state, [formKey]: { ...form, extraModels: (form.extraModels || []).filter((_, extraIndex) => extraIndex !== index - baseCount) } }))}>×</button>}</div></label>;
                                  })}
                                  <button className={styles.addModelMiniBtn} onClick={() => addImportModel(formKey, group)}>+ 型号</button>
                                </div>
                              </div>}
                              {!hasSelectedProduct ? (
                                <div className={styles.importCategoryReview}>
                                  <div className={styles.suggestionBanner}>
                                    <strong>系统建议分类</strong>
                                    <span>{suggestedClassification.consumerCategoryPath || '暂未识别到明确分类'}{suggestedClassification.complianceCategoryPaths?.length ? ` · ${suggestedClassification.complianceCategoryPaths.join(' / ')}` : ''}</span>
                                    {suggestedClassification.reason && <em>{suggestedClassification.reason}</em>}
                                  </div>
                                  <div className={styles.categoryGroupStack}>
                                    <div className={styles.categoryGroupBox}>
                                      <div className={styles.categoryGroupTitle}>C端分类</div>
                                      <div className={styles.modalFormGrid}>
                                        <label>
                                          <span>一级分类</span>
                                          <select value={importTopCategoryId} onChange={(event) => setImportSelection((state) => ({ ...state, [formKey]: { ...form, categoryPrimaryId: event.target.value || '' } }))}>
                                            <option value="">其他 / 待分类</option>
                                            {topConsumerCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                                          </select>
                                        </label>
                                        <label>
                                          <span>二级分类</span>
                                          <select value={importSecondCategoryId} disabled={!importTopCategoryId || !importSecondOptions.length} onChange={(event) => setImportSelection((state) => ({ ...state, [formKey]: { ...form, categoryPrimaryId: event.target.value || String(importTopCategoryId || '') } }))}>
                                            <option value="">{importTopCategoryId ? '不选择二级分类' : '请先选择一级分类'}</option>
                                            {importSecondOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                                          </select>
                                        </label>
                                        {importThirdOptions.length > 0 && <label>
                                          <span>三级分类（可选）</span>
                                          <select value={importThirdCategoryId} onChange={(event) => setImportSelection((state) => ({ ...state, [formKey]: { ...form, categoryPrimaryId: event.target.value || String(importSecondCategoryId || importTopCategoryId || '') } }))}>
                                            <option value="">不选择三级分类</option>
                                            {importThirdOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                                          </select>
                                        </label>}
                                      </div>
                                    </div>
                                    <div className={styles.categoryGroupBox}>
                                      <div className={styles.categoryGroupTitle}>审核分类</div>
                                      <div className={styles.categoryCheckGrid}>
                                        {topComplianceCategories.map((category) => {
                                          const checked = selectedComplianceIds.includes(String(category.id));
                                          return <label key={category.id} className={checked ? styles.categoryCheckActive : ''}>
                                            <input type="checkbox" checked={checked} onChange={(event) => {
                                              const next = event.target.checked
                                                ? [...selectedComplianceIds, String(category.id)]
                                                : selectedComplianceIds.filter((id) => id !== String(category.id));
                                              setImportSelection((state) => ({ ...state, [formKey]: { ...form, complianceCategoryIds: [...new Set(next)].map(Number) } }));
                                            }} />
                                            <span>{category.name}</span>
                                          </label>;
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : <p className={styles.matchHint}>已选择已有产品，将沿用该产品当前分类；如需调整分类，请到产品编辑里修改。</p>}
                              <button className={styles.secondaryBtn} onClick={() => confirmImportStep(formKey, 2)}>{(form.confirmedStep || 0) >= 2 ? '已确认产品信息' : '确认产品信息'}</button>
                            </div>
                          </section>

                          <section id={`${formKey}-step-3`} className={importStepClass(styles, form.confirmedStep || 0, 3)}>
                            <div className={styles.questionIndex}>{(form.confirmedStep || 0) >= 3 ? '✓' : '3'}</div>
                            <div className={styles.questionBody}>
                              <h4>确认每份资料的类型和语言</h4>
                              <p>同一产品下，不同资料可以分别是证书、DoC 或说明书，也可以对应不同语言。</p>
                              <div className={styles.fileConfirmRows}>
                                {group.items.map((item) => <div key={item.id} className={styles.fileConfirmRow}>
                                  <strong>{item.originalName}{item.isDuplicate && <em className={styles.fileDupTag}>后上传重复</em>}</strong>
                                  <select value={form[`documentType_${item.id}`] || form.documentType || inferImportType(item, group.type)} onChange={(event) => setImportSelection((state) => ({ ...state, [formKey]: { ...form, [`documentType_${item.id}`]: event.target.value } }))}><option value="certificate">资质证书</option><option value="declaration_of_conformity">DoC声明文件</option><option value="manual">使用说明书</option><option value="other">其他资料</option></select>
                                  <select value={form[`language_${item.id}`] || item.guessedLanguage || 'en'} onChange={(event) => setImportSelection((state) => ({ ...state, [formKey]: { ...form, [`language_${item.id}`]: event.target.value } }))}><option value="en">英语 EN</option><option value="de">德语 DE</option><option value="zh">中文 ZH</option><option value="fr">法语 FR</option><option value="es">西语 ES</option><option value="it">意语 IT</option><option value="other">其他</option></select>
                                </div>)}
                              </div>
                              <button className={styles.secondaryBtn} onClick={() => confirmImportStep(formKey, 3)}>{(form.confirmedStep || 0) >= 3 ? '已确认资料信息' : '确认资料信息'}</button>
                            </div>
                          </section>

                          <section id={`${formKey}-step-4`} className={`${importStepClass(styles, form.confirmedStep || 0, 4)} ${styles.finalQuestion}`}>
                            <div className={styles.questionIndex}>4</div>
                            <div className={styles.questionBody}>
                              <h4>最终提交</h4>
                              <p>将{hasSelectedProduct ? '关联到已有产品' : '创建新产品'}，并归档 {group.items.filter((item) => !item.isDuplicate).length || group.items.length} 份保留资料。</p>
                              <div className={styles.finalActions}>
                                <button className={styles.primaryBtn} onClick={() => organizeImportGroup(group)}>确认提交归档</button>
                                {group.items.some((item) => item.isDuplicate) && <button className={styles.dangerSoftBtn} onClick={() => deleteDuplicateImportItems(group)}>只删除重复资料</button>}
                                <button className={styles.secondaryBtn} onClick={() => { showAction('已保留在待整理池，之后可继续处理'); setActiveImportGroupKey(null); }}>跳过整理，稍后处理</button>
                                <button className={styles.dangerSoftBtn} onClick={() => deletePendingImportGroup(group)}>删除整组资料</button>
                              </div>
                            </div>
                          </section>
                        </div>
                      </div>
                    </div>
                  );
                })(), document.body)}

                {organizedItems.length > 0 && <div className={styles.importCompletedTitle}>已完成归档</div>}
                <div className={styles.importCardGrid}>
                  {organizedItems.map((item) => {
                    const linkedDoc = companyDocuments.find((doc) => String(doc.id) === String(item.documentId));
                    return (
                      <button key={item.id} className={`${styles.importMiniCard} ${styles.importCompletedCard}`} onClick={() => linkedDoc ? editDocumentInfo(linkedDoc) : openPage('company', 'files', activeCompany)}>
                        <div className={styles.importMiniTop}>
                          <span className={styles.fileTypeIcon}>{(item.guessedType || 'other').slice(0, 3)}</span>
                          <span className={styles.completedBadge}>已完成</span>
                        </div>
                        <strong>{item.originalName}</strong>
                        <p>{item.productName || '产品'} · {item.documentTitle || '资料'}</p>
                        <div className={styles.importMiniFiles}>
                          <span>点击可继续编辑资料信息</span>
                        </div>
                        <div className={styles.completedActions} onClick={(event) => event.stopPropagation()}>
                          <span onClick={() => linkedDoc ? editDocumentInfo(linkedDoc) : openPage('company', 'files', activeCompany)}>编辑</span>
                          <span onClick={() => reopenImportItem(item)}>撤回重整</span>
                          <span className={styles.dangerText} onClick={() => deleteLinkedDocument(item)}>删除</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Section>
      );
    }

    if (activeGroup === 'company') {
      if (activePage === 'company-info') {
        return (
          <Section title={t('admin.companyInfo.title')} desc={t('admin.companyInfo.desc')}>
            <div className={styles.companyProfileLayout}>
              <aside className={styles.companySummaryCard}>
                <div className={styles.companyLogoBox}>{companyLogoUrl ? <img src={companyLogoUrl} alt="公司 Logo" /> : 'LOGO'}</div>
                <h3>{companyForm.name || currentCompany.name}</h3>
                <p>{currentCompany.code}</p>
                <div className={styles.companyStatusRows}>
                  <span><strong>我的角色</strong><em>{currentCompany.status === '已认证' ? '企业拥有者' : '申请人'}</em></span>
                  <span><strong>认证状态</strong><em>{currentCompany.status}</em></span>
                  <span><strong>公开状态</strong><em>{currentCompany.status === '已认证' && companyForm.publicVisible ? '公开展示' : '未认证不公开'}</em></span>
                  <span><strong>主营分类</strong><em>{companyForm.mainCategory || '待填写'}</em></span>
                </div>
                <>
                  <input ref={companyLogoInputRef} type="file" accept="image/png,image/jpeg" className={styles.hiddenInput} onChange={(event) => uploadCompanyLogoFile(event.target.files?.[0])} />
                  <button className={styles.secondaryBtn} onClick={() => companyLogoInputRef.current?.click()}>上传 Logo</button>
                  {currentCompany.status !== '已认证' && <button className={styles.dangerSoftBtn} onClick={deleteCurrentCompanyDraft}>删除公司草稿</button>}
                </>
              </aside>

              <div className={styles.companyFormCard}>
                <div className={styles.formHeader}>
                  <div>
                    <h3>基础信息</h3>
                    <p>这些内容会展示在公司详情页，方便用户和审核机构了解企业。</p>
                  </div>
                  <button className={styles.secondaryBtn} onClick={() => navigate(`/companies/${activeCompany}`)}>预览公司主页</button>
                </div>

                <div className={styles.editGrid}>
                  <label>
                    <span>公司中文名称</span>
                    <input value={companyForm.name} onChange={(event) => setCompanyForm((form) => ({ ...form, name: event.target.value }))} placeholder="例如：广州某某安全用品有限公司" />
                  </label>
                  <label>
                    <span>公司英文名称</span>
                    <input value={companyForm.nameEn} onChange={(event) => setCompanyForm((form) => ({ ...form, nameEn: event.target.value }))} placeholder="例如：Guangzhou Safety Equipment Co., Ltd." />
                  </label>
                  <label>
                    <span>公司编号</span>
                    <input value={currentCompany.code} readOnly />
                  </label>
                  <label>
                    <span>公司网址名</span>
                    <input value={companyForm.slug} onChange={(event) => setCompanyForm((form) => ({ ...form, slug: event.target.value }))} placeholder="例如：guangzhou-safety-equipment" />
                  </label>
                  <label>
                    <span>联系邮箱</span>
                    <input value={companyForm.contactEmail} onChange={(event) => setCompanyForm((form) => ({ ...form, contactEmail: event.target.value }))} placeholder="contact@example.com" />
                  </label>
                  <label>
                    <span>联系电话</span>
                    <input value={companyForm.contactPhone} onChange={(event) => setCompanyForm((form) => ({ ...form, contactPhone: event.target.value }))} placeholder="+86 ..." />
                  </label>
                  <label>
                    <span>公司官网</span>
                    <input value={companyForm.website} onChange={(event) => setCompanyForm((form) => ({ ...form, website: event.target.value }))} placeholder="https://www.example.com" />
                  </label>
                  <label>
                    <span>主营分类</span>
                    <select value={companyForm.mainCategory} onChange={(event) => setCompanyForm((form) => ({ ...form, mainCategory: event.target.value }))}>
                      <option value="个人防护用品">个人防护用品</option>
                      <option value="电子电器">电子电器</option>
                      <option value="玩具儿童用品">玩具儿童用品</option>
                      <option value="机械设备">机械设备</option>
                      <option value="其他 / 待分类">其他 / 待分类</option>
                    </select>
                  </label>
                  <label className={styles.fullField}>
                    <span>公司地址</span>
                    <input value={companyForm.address} onChange={(event) => setCompanyForm((form) => ({ ...form, address: event.target.value }))} placeholder="国家、省/州、城市、详细地址" />
                  </label>
                  <label className={styles.fullField}>
                    <span>公司介绍</span>
                    <textarea value={companyForm.description} onChange={(event) => setCompanyForm((form) => ({ ...form, description: event.target.value }))} placeholder="介绍公司的主营业务、资质、服务范围。" rows="5" />
                  </label>
                </div>

                <div className={styles.companySwitchRow}>
                  <div>
                    <strong>公开展示公司主页</strong>
                    <p>{currentCompany.status === '已认证' ? '关闭后，普通用户无法在前台直接查看公司主页。' : '认证通过前，公司主页不会公开展示，也不会被搜索收录。'}</p>
                  </div>
                  <button className={currentCompany.status === '已认证' && companyForm.publicVisible ? styles.switchOn : styles.switchOff} onClick={() => currentCompany.status === '已认证' ? setCompanyForm((form) => ({ ...form, publicVisible: !form.publicVisible })) : showAction('企业认证通过前不能公开展示')}>{currentCompany.status === '已认证' && companyForm.publicVisible ? '已开启' : '已关闭'}</button>
                </div>

                <div className={styles.formActions}>
                  <button className={styles.secondaryBtn} onClick={() => showAction('如需恢复，请刷新页面重新读取已保存资料')}>取消</button>
                  <button className={styles.primaryBtn} onClick={saveCompanyProfile}>保存公司资料</button>
                </div>
              </div>
            </div>
          </Section>
        );
      }

      if (activePage === 'products') {
        return (
          <Section>
            <div className={styles.workspaceProductsPanel}>
              <div className={styles.productWorkspaceTop}>
                <div className={styles.productTools}>
                  <input
                    value={productSearchQuery}
                    onChange={(event) => setProductSearchQuery(event.target.value)}
                    placeholder="搜索产品名称、型号、资料名"
                  />
                </div>
                <div className={styles.headerActionsInline}>
                  <button className={styles.secondaryBtn} onClick={() => openPage('import', 'bulk-import', activeCompany)}>批量上传</button>
                  <button className={styles.primaryBtn} onClick={() => openProductModal()}>新增产品</button>
                </div>
              </div>

              <div className={styles.productControlBar}>
                <div className={styles.productFilterButtons}>
                  <div className={styles.productStatusButtons}>
                    {[
                      ['all', '全部'],
                      ['complete', '资料完整'],
                      ['missing', '缺资料'],
                    ].map(([value, label]) => <button key={value} className={productStatusFilter === value ? styles.stackFilterActive : ''} onClick={() => setProductStatusFilter(value)}>{label}</button>)}
                  </div>
                  <div className={styles.productCategorySelectGroup}>
                    <strong>C端分类</strong>
                    <select
                      value={productCategoryTopFilter}
                      onChange={(event) => {
                        setProductCategoryTopFilter(event.target.value);
                        setProductCategorySecondFilter('');
                        setProductCategoryThirdFilter('');
                      }}
                    >
                      <option value="">全部分类</option>
                      {topConsumerCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                      <option value="uncategorized">其他 / 待分类</option>
                    </select>
                    {productFilterSecondCategories.length > 0 && (
                      <select
                        value={productCategorySecondFilter}
                        onChange={(event) => {
                          setProductCategorySecondFilter(event.target.value);
                          setProductCategoryThirdFilter('');
                        }}
                      >
                        <option value="">全部二级</option>
                        {productFilterSecondCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </select>
                    )}
                    {productFilterThirdCategories.length > 0 && (
                      <select
                        value={productCategoryThirdFilter}
                        onChange={(event) => setProductCategoryThirdFilter(event.target.value)}
                      >
                        <option value="">全部三级</option>
                        {productFilterThirdCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </select>
                    )}
                  </div>
                </div>

                <div className={styles.workspaceViewTools}>
                  <div className={styles.stackViewSwitch}>
                    {['overview', 'standard', 'detail'].map((mode) => (
                      <button key={mode} className={workspaceViewMode === mode ? styles.stackFilterActive : ''} onClick={() => setWorkspaceViewMode(mode)}>{mode === 'overview' ? '概览' : mode === 'standard' ? '标准' : '详细'}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`${styles.workspaceProductGrid} ${styles[`stackView_${workspaceViewMode}`]}`}>
                {companyProducts.filter((product) => {
                  const productStatus = getProductFileStatus(product, companyDocuments);
                  const statusMatch = productStatusFilter === 'all' || (productStatusFilter === 'complete' ? !productStatus.missing.length : productStatus.missing.length);
                  const categoryMatch = productCategoryTopFilter === 'uncategorized'
                    ? !product.categoryPrimaryId
                    : !activeProductCategoryFilterId
                      || [product.categoryPrimaryId, product.categoryParentId, product.categoryGrandId].map(String).includes(String(activeProductCategoryFilterId));
                  const query = productSearchQuery.trim().toLowerCase();
                  const productDocs = productStatus.productDocs || [];
                  const searchText = [
                    product.name,
                    product.nameEn,
                    product.model,
                    product.category,
                    product.description,
                    product.dimensions,
                    product.material,
                    ...productDocs.flatMap((doc) => [doc.name, doc.type, doc.lang, doc.certNo, doc.standard, doc.issuer]),
                  ].filter(Boolean).join(' ').toLowerCase();
                  const searchMatch = !query || searchText.includes(query);
                  return statusMatch && categoryMatch && searchMatch;
                }).map((product) => {
                  const status = getProductFileStatus(product, companyDocuments);
                  const models = splitImportModels(product.model);
                  const isExpanded = String(workspaceExpandedProduct || '') === String(product.id || product.model);
                  const productKey = product.id || product.model;
                  const completedTypes = [status.hasCert, status.hasDoc, status.hasManual].filter(Boolean).length;
                  const health = {
                    progress: Math.round((completedTypes / 3) * 100),
                    progressClass: completedTypes === 3 ? styles.progressGood : completedTypes === 2 ? styles.progressWarn : completedTypes === 1 ? styles.progressPoor : styles.progressEmpty,
                    className: status.missing.length ? styles.stackMissing : styles.stackOk,
                    label: status.missing.length ? '缺资料' : '资料完整',
                  };
                  const fileRows = [
                    ['资质证书', 'certificate', status.productDocs.filter((doc) => doc.documentType === 'certificate' || doc.type === '资质证书')],
                    ['DoC声明', 'declaration_of_conformity', status.productDocs.filter((doc) => doc.documentType === 'declaration_of_conformity' || doc.type === 'DoC声明文件')],
                    ['说明书', 'manual', status.productDocs.filter((doc) => doc.documentType === 'manual' || doc.type === '使用说明书')],
                  ];
                  return (
                    <article key={productKey} className={`${styles.stackProductCard} ${isExpanded ? styles.stackProductSelected : ''}`}>
                      <button className={styles.stackProductClickLayer} onClick={() => { setWorkspaceExpandedProduct(productKey); setWorkspaceExpandedPile(isExpanded ? workspaceExpandedPile : '全部资料'); }} aria-label={`查看 ${product.name}`} />
                      <div className={styles.stackProductHead}>
                        <div>
                          <h3 className={styles.smartProductTitle}><SmartProductTitle title={product.name} /></h3>
                          <p>{product.category} · {product.updatedAt || '未记录时间'}</p>
                        </div>
                        <span className={health.className}>{health.label}</span>
                      </div>
                      <div className={`${styles.stackProgressTrack} ${health.progressClass}`}><span style={{ width: `${health.progress}%` }} /></div>
                      {workspaceViewMode !== 'overview' && <div className={styles.stackNextAction}>{status.missing.length ? `下一步建议：补充${status.missing[0]}` : '资料完整：可以直接对外展示，也适合生成二维码。'}</div>}
                      <div className={styles.stackFileRows}>
                        {fileRows.map(([label, type, docs]) => {
                          const active = isExpanded && workspaceExpandedPile === label;
                          const shouldShowFiles = workspaceViewMode === 'detail' || (workspaceViewMode === 'standard' && active);
                          const primaryDoc = docs[0];
                          return (
                            <div key={label} className={`${styles.stackFileRowWrap} ${!docs.length ? styles.stackFileRowMissing : ''} ${active || workspaceViewMode === 'detail' ? styles.stackFileRowOpen : ''}`}>
                              <button className={styles.stackFileRow} onClick={(event) => { event.stopPropagation(); openDocumentSlotModal(product, type, docs); }}>
                                <span className={styles.stackFileThumb}>{primaryDoc ? documentFileExt(primaryDoc.name) : '无'}</span>
                                <span className={styles.stackFileMain}>
                                  <em>{label}</em>
                                  <small>{primaryDoc ? primaryDoc.name : '暂无资料，点击上传'}</small>
                                </span>
                                <strong>{docs.length || '+'}</strong>
                              </button>
                              {shouldShowFiles && docs.length > 0 && (
                                <div className={styles.stackRowFiles}>
                                  {docs.map((doc) => <button key={doc.id} onClick={(event) => { event.stopPropagation(); editDocumentInfo(doc); }}><span>{doc.name}</span><em>{doc.lang} · {doc.backup}</em></button>)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {workspaceViewMode === 'detail' && (
                        <>
                          <div className={styles.stackInlineModels}>{(models.length ? models : [product.model]).map((model) => <span key={model}>{model}</span>)}</div>
                          <div className={styles.stackDetailMeta}><span>分类：{product.category}</span><span>资料：{status.productDocs.length} 份</span></div>
                        </>
                      )}
                      {workspaceViewMode !== 'overview' && <div className={styles.stackCardActions}>
                        <button onClick={(event) => { event.stopPropagation(); manageProductFiles(product); }}>管理资料</button>
                        <button onClick={(event) => { event.stopPropagation(); openProductModal(product); }}>编辑产品</button>
                        <button onClick={(event) => { event.stopPropagation(); navigate(`/products/${product.id}`); }}>预览</button>
                      </div>}
                    </article>
                  );
                })}
              </div>
            </div>
          </Section>
        );
      }

      if (activePage === 'files') {
        const fileTypeOptions = [
          ['all', '全部资料'],
          ['certificate', '资质证书'],
          ['declaration_of_conformity', 'DoC声明文件'],
          ['manual', '使用说明书'],
          ['unbound', '未绑定产品'],
        ];
        const getDocHealth = (doc) => {
          if (!doc.productId) return { label: '未绑定产品', tone: 'warn' };
          if (!doc.language || doc.lang === '未设置' || doc.documentType === 'other') return { label: '待完善', tone: 'warn' };
          return { label: '正常', tone: 'safe' };
        };
        const uniqueLanguages = [...new Set(companyDocuments.map((doc) => doc.lang).filter(Boolean))];
        const filteredDocuments = companyDocuments.filter((doc) => {
          const query = fileFilters.query.trim().toLowerCase();
          const health = getDocHealth(doc).label;
          const matchesQuery = !query || [doc.name, doc.product, doc.lang, doc.certNo, doc.standard, doc.issuer].some((value) => String(value || '').toLowerCase().includes(query));
          const matchesType = fileFilters.type === 'all' || (fileFilters.type === 'unbound' ? !doc.productId : doc.documentType === fileFilters.type);
          const matchesProduct = fileFilters.product === 'all' || String(doc.productId || '') === String(fileFilters.product);
          const matchesLanguage = fileFilters.language === 'all' || doc.lang === fileFilters.language;
          const matchesStatus = fileFilters.status === 'all' || health === fileFilters.status;
          return matchesQuery && matchesType && matchesProduct && matchesLanguage && matchesStatus;
        });

        return (
          <Section title="资料管理" desc="这里是公司资料库：检查资料归属、语言、类型、证书信息，并处理替换和预览。">
            <div className={styles.fileOverviewGrid}>
              {[
                ['全部资料', companyDocuments.length, '当前公司已归档的全部资料'],
                ['资质证书', companyDocuments.filter((doc) => doc.documentType === 'certificate').length, '证明产品测试和认证状态'],
                ['DoC声明文件', companyDocuments.filter((doc) => doc.documentType === 'declaration_of_conformity').length, '供审核机构查看合规声明'],
                ['使用说明书', companyDocuments.filter((doc) => doc.documentType === 'manual').length, '帮助用户了解产品使用方式'],
                ['未绑定产品', companyDocuments.filter((doc) => !doc.productId).length, '这些资料前台产品页可能看不到'],
                ['待完善', companyDocuments.filter((doc) => getDocHealth(doc).label === '待完善').length, '类型或语言等信息需要补齐'],
              ].map(([name, count, desc]) => (
                <button key={name} className={styles.fileOverviewCard} onClick={() => setFileFilters((form) => ({ ...form, type: name === '未绑定产品' ? 'unbound' : form.type, status: name === '待完善' ? '待完善' : form.status }))}>
                  <strong>{count}</strong><span>{name}</span><p>{desc}</p>
                </button>
              ))}
            </div>

            <div className={styles.fileManageHeader}>
              <div className={styles.fileTabs}>
                {fileTypeOptions.map(([value, label]) => <button key={value} className={fileFilters.type === value ? styles.tabActive : ''} onClick={() => setFileFilters((form) => ({ ...form, type: value }))}>{label}</button>)}
              </div>
              <div className={styles.headerActionsInline}>
                <button className={styles.secondaryBtn} onClick={() => openPage('import', 'bulk-import', activeCompany)}>批量导入</button>
                <button className={styles.primaryBtn} onClick={uploadDocumentFile}>上传资料</button>
              </div>
            </div>

            <div className={`${styles.productTools} ${styles.fileFilterTools}`}>
              <input value={fileFilters.query} onChange={(event) => setFileFilters((form) => ({ ...form, query: event.target.value }))} placeholder="搜索资料名、产品、证书编号、标准" />
              <select value={fileFilters.product} onChange={(event) => setFileFilters((form) => ({ ...form, product: event.target.value }))}><option value="all">全部产品</option>{companyProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
              <select value={fileFilters.language} onChange={(event) => setFileFilters((form) => ({ ...form, language: event.target.value }))}><option value="all">全部语言</option>{uniqueLanguages.map((lang) => <option key={lang} value={lang}>{lang}</option>)}</select>
              <select value={fileFilters.status} onChange={(event) => setFileFilters((form) => ({ ...form, status: event.target.value }))}><option value="all">全部状态</option><option value="正常">正常</option><option value="待完善">待完善</option><option value="未绑定产品">未绑定产品</option></select>
            </div>

            <div className={styles.fileTableHeader}>
              <span>资料</span><span>归属产品</span><span>关键信息</span><span>状态</span><span>操作</span>
            </div>

            <div className={styles.fileLibraryList}>
              {filteredDocuments.length ? filteredDocuments.map((doc) => {
                const health = getDocHealth(doc);
                return (
                  <article key={doc.id || doc.name} className={styles.fileLibraryRow}>
                    <span className={styles.fileTypeIcon}>{doc.type.slice(0, 3)}</span>
                    <div className={styles.fileLibraryMain}>
                      <h3>{doc.name}</h3>
                      <p>{doc.type} · {doc.lang || '未设置语言'} · {doc.updatedAt || '未记录时间'}</p>
                    </div>
                    <div className={styles.fileLibraryProduct}>
                      <strong>{doc.productId ? doc.product : '未绑定产品'}</strong>
                      <span>{doc.productId ? '已归档到产品' : '需要先绑定产品'}</span>
                    </div>
                    <div className={styles.fileLibraryTags}>
                      {doc.certNo && <span>证书号：{doc.certNo}</span>}
                      {doc.standard && <span>{doc.standard}</span>}
                      {doc.issuer && <span>{doc.issuer}</span>}
                      {!doc.certNo && !doc.standard && !doc.issuer && <span>暂无证书信息</span>}
                    </div>
                    <span className={health.tone === 'safe' ? styles.safeTag : styles.warnTag}>{health.label}</span>
                    <div className={styles.fileActions}>
                      <button className={styles.secondaryBtn} onClick={() => doc.fileUrl ? window.open(doc.fileUrl, '_blank') : showAction('该资料暂无可预览地址')}>预览</button>
                      <button className={styles.secondaryBtn} onClick={() => selectDocumentInSlotModal(doc)}>编辑</button>
                      <button className={styles.secondaryBtn} onClick={() => replaceFile(doc)}>替换</button>
                    </div>
                  </article>
                );
              }) : <div className={styles.emptyState}>没有符合筛选条件的资料。</div>}
            </div>
          </Section>
        );
      }

      if (activePage === 'members') {
        return (
          <Section title={t('admin.members.title')} desc={t('admin.members.desc')}>
            <div className={styles.memberHeaderPanel}>
              <div>
                <h3>团队成员</h3>
                <p>企业拥有者可以邀请员工，并控制他们能操作哪些内容。</p>
              </div>
              <button className={styles.primaryBtn}>邀请员工</button>
            </div>

            <div className={styles.memberRoleStrip}>
              <div className={styles.memberRoleIntro}>
                <h3>角色概览</h3>
                <p>不同角色决定员工能操作哪些内容。</p>
              </div>
              {[
                ['企业拥有者', '1'],
                ['企业管理员', '0'],
                ['产品编辑', '1'],
                ['资料上传员', '1'],
                ['只读成员', '0'],
              ].map(([role, count]) => (
                <div key={role} className={styles.memberRolePill}>
                  <strong>{count}</strong>
                  <span>{role}</span>
                </div>
              ))}
            </div>

            <div className={styles.memberListPanel}>
              <div className={styles.listTitleRow}>
                <div>
                  <h3>成员列表</h3>
                  <p>查看成员身份，调整角色或停用权限。</p>
                </div>
              </div>
              <div className={styles.productTools}>
                <input placeholder="搜索姓名、邮箱、用户编号" />
                <select defaultValue="all">
                  <option value="all">全部角色</option>
                  <option value="owner">企业拥有者</option>
                  <option value="admin">企业管理员</option>
                  <option value="editor">产品编辑</option>
                  <option value="uploader">资料上传员</option>
                  <option value="viewer">只读成员</option>
                </select>
                <select defaultValue="all">
                  <option value="all">全部状态</option>
                  <option value="active">正常</option>
                  <option value="pending">待接受邀请</option>
                  <option value="disabled">已停用</option>
                </select>
                <button className={styles.secondaryBtn}>权限模板</button>
              </div>

              <div className={styles.memberCards}>
                {[
                  ['admin', 'U-000001', 'admin@legacy.local', '企业拥有者', '正常', '全部权限'],
                  ['质量部成员', 'U-000128', 'quality@example.com', '产品编辑', '正常', '产品管理'],
                  ['资料上传员', 'U-000256', 'upload@example.com', '资料上传员', '待接受邀请', '资料上传'],
                ].map(([name, code, email, role, status, scope]) => (
                  <article key={code} className={styles.memberCard}>
                    <div className={styles.memberAvatar}>{name.slice(0, 1).toUpperCase()}</div>
                    <div className={styles.memberInfo}>
                      <h3>{name}</h3>
                      <p>{email}</p>
                      <small>{code}</small>
                    </div>
                    <div className={styles.memberMeta}>
                      <span><strong>角色</strong><em>{role}</em></span>
                      <span><strong>权限范围</strong><em>{scope}</em></span>
                      <span><strong>状态</strong><em className={status === '正常' ? styles.statusOk : status === '待接受邀请' ? styles.statusPending : styles.statusMuted}>{status}</em></span>
                    </div>
                    <div className={styles.memberActions}>
                      <button className={styles.primaryTextBtn}>修改权限</button>
                      <button className={styles.secondaryTextBtn}>查看记录</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </Section>
        );
      }

      if (activePage === 'verification') {
        const verification = getVerificationDisplay(currentCompany);
        const stepTitles = [
          ['1', '填写企业资料', '公司名称、联系方式、地址等基础资料。'],
          ['2', '上传资质资料', '营业执照、法人证明或授权书。'],
          ['3', '平台审核', '平台管理员核对资料真实性。'],
          ['4', '认证通过', '公司主页展示认证状态。'],
        ];
        return (
          <Section title={t('admin.verification.title')} desc={t('admin.verification.desc')}>
            <div className={styles.verifyHero}>
              <div>
                <span className={`${styles.verifyBadge} ${styles[`verifyBadge_${verification.tone}`] || ''}`}>当前状态：{verification.label}</span>
                <h3>{currentCompany.name}</h3>
                <p>{verification.desc}</p>
              </div>
              <button className={styles.secondaryBtn}>查看认证记录</button>
            </div>

            <div className={styles.verifySteps}>
              {stepTitles.map(([num, title, desc], index) => {
                const stepNumber = index + 1;
                const done = verification.step > stepNumber || verification.label === '已认证';
                const current = verification.step === stepNumber && verification.label !== '已认证';
                const status = done ? '已完成' : current ? verification.label : '待完成';
                return (
                  <div key={num} className={`${styles.verifyStepCard} ${done ? styles.verifyStepDone : current ? styles.verifyStepCurrent : styles.verifyStepTodo}`}>
                    <strong>{num}</strong>
                    <div>
                      <h4>{title}</h4>
                      <p>{desc}</p>
                    </div>
                    <span>{status}</span>
                  </div>
                );
              })}
            </div>

            <div className={styles.verifyContentGrid}>
              <div className={styles.verifyFormCard}>
                <div className={styles.formHeader}>
                  <div>
                    <h3>认证资料</h3>
                    <p>如果公司信息变化，后续可重新提交认证。</p>
                  </div>
                  <button className={styles.primaryBtn} onClick={submitCurrentCompanyVerification}>{verification.label === '已认证' ? '重新提交认证' : '提交认证申请'}</button>
                </div>
                <div className={styles.editGrid}>
                  <label>
                    <span>认证公司名称</span>
                    <input value={companyForm.nameEn} onChange={(event) => setCompanyForm((form) => ({ ...form, nameEn: event.target.value }))} placeholder="例如：Guangzhou Safety Equipment Co., Ltd." />
                  </label>
                  <label>
                    <span>统一社会信用代码 / 注册号</span>
                    <input value={verificationForm.businessLicenseNo} onChange={(event) => setVerificationForm((form) => ({ ...form, businessLicenseNo: event.target.value }))} placeholder="后续填写企业注册编号" />
                  </label>
                  <label>
                    <span>法人 / 负责人姓名</span>
                    <input value={verificationForm.contactPerson} onChange={(event) => setVerificationForm((form) => ({ ...form, contactPerson: event.target.value }))} placeholder="例如：张三" />
                  </label>
                  <label>
                    <span>联系邮箱</span>
                    <input value={verificationForm.contactEmail} onChange={(event) => setVerificationForm((form) => ({ ...form, contactEmail: event.target.value }))} placeholder="verification@example.com" />
                  </label>
                </div>
              </div>

              <div className={styles.verifyUploadCard}>
                <h3>资质资料</h3>
                <div className={styles.uploadRows}>
                  {[
                    ['营业执照 / 注册资料', '已上传'],
                    ['法人身份证明', '已上传'],
                    ['企业授权书', '可选'],
                  ].map(([name, status]) => (
                    <div key={name} className={styles.uploadRow}>
                      <div>
                        <strong>{name}</strong>
                        <p>{status}</p>
                      </div>
                      <button className={styles.secondaryBtn}>查看</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>
        );
      }

      if (activePage === 'plans') {
        const updatePlanCarouselFade = () => {
          const el = planCarouselRef.current;
          if (!el) return;
          const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
          setPlanCarouselFade({
            left: el.scrollLeft > 8,
            right: el.scrollLeft < maxScroll - 8,
          });
        };
        const planFeatures = [
          ['最多 50 个产品', true, true, true, true],
          ['2GB 资料存储', true, true, true, true],
          ['5 名员工', true, true, true, true],
          ['基础资料展示', true, true, true, true],
          ['自定义公司网址', false, true, true, true],
          ['基础数据统计', false, true, true, true],
          ['批量上传', false, false, true, true],
          ['资料版本管理', false, false, true, true],
          ['缺失资料提醒', false, false, true, true],
          ['高级权限管理', false, false, false, true],
          ['专属支持', false, false, false, true],
          ['企业级数据统计', false, false, false, true],
        ];
        const costViews = {
          website: {
            title: '自建官网放资料',
            tag: '灰色成本项',
            total: '首年约 ¥2,500-9,000+',
            note: '适合展示公司形象，但产品资料、证书版本和型号对应关系通常需要人工维护。',
            items: [
              ['官网制作', '¥1,500-5,000+'],
              ['域名 / 服务器', '¥350-1,600/年'],
              ['功能改版', '¥500-2,000+'],
              ['后续维护', '¥800-5,000/年'],
            ],
          },
          labor: {
            title: '业务员手动维护',
            tag: '隐形时间成本',
            total: '约 50 小时+/年',
            note: '资料越多，找资料、确认版本、发送附件和回复客户的问题就越频繁。',
            items: [
              ['找证书 / DoC', '10-20 小时/年'],
              ['反复发送附件', '15-30 小时/年'],
              ['确认最新版本', '10-20 小时/年'],
              ['错发旧资料风险', '难以量化'],
            ],
          },
          eudoc: {
            title: '使用 EU-DOC',
            tag: '资料入口成本',
            total: '¥99-9,999/年',
            note: '围绕产品组织证书、DoC、说明书和检测报告，支持搜索、分享、二维码和持续更新。',
            items: [
              ['产品资料页', '已包含'],
              ['资料分类展示', '已包含'],
              ['搜索 / 分享 / 二维码', '套餐内开放'],
              ['后续升级', '按产品和资料规模'],
            ],
          },
        };
        return (
          <Section title={t('admin.plans.title')} desc={t('admin.plans.desc')}>
            <div className={styles.planCurrentMerged}>
              <div className={styles.currentPlanIntro}>
                <span className={styles.verifyBadge}>当前套餐</span>
                <h3>免费版</h3>
                <p>适合少量产品资料展示。当前账号可继续使用基础展示能力，更多批量和管理功能可后续升级。</p>
                <button className={styles.primaryBtn}>升级套餐</button>
              </div>
              <div className={styles.currentPlanUsage}>
                {[
                  ['产品数量', '2 / 3', '67%', '正常'],
                  ['资料存储', '120MB / 200MB', '60%', '正常'],
                  ['资料数量', '12 / 20', '60%', '正常'],
                  ['批量上传', '未开启', '0%', '升级可用'],
                ].map(([name, value, percent, status]) => (
                  <div key={name} className={styles.currentUsageBarItem} style={{ '--usage': percent }}>
                    <div>
                      <span>{name}</span>
                      <strong>{value}</strong>
                    </div>
                    <div className={styles.usageTrack}><i /></div>
                    <em>{status}</em>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.planBannerCompareGrid}>
              <article className={`${styles.planFlagCard} ${styles.planCostFlag}`}>
                <div className={styles.planRibbon}>最低成本</div>
                <h3>自建与维护</h3>
                <strong>¥3,000+/年</strong>
                <ul className={styles.planCostList}>
                  {[
                    ['官网制作', '¥2,000+'],
                    ['功能改版', '¥500+/次'],
                    ['域名 / 服务器', '¥500+/年'],
                    ['后续维护', '¥1,000+/年'],
                    ['人工成本', '50h+/年'],
                    ['业务员找资料', ''],
                    ['反复发送附件', ''],
                    ['确认最新版本', ''],
                    ['企业扩张后成本指数级上升', ''],
                  ].map(([name, cost]) => (
                    <li key={name} className={!cost && name !== '企业扩张后成本指数级上升' ? styles.subCostLine : ''}>
                      <span>—</span>{name}{cost && <em>{cost}</em>}
                    </li>
                  ))}
                </ul>
                <div className={styles.planFoot}>可以自建网站，但长期维护成本高</div>
              </article>
              <div className={`${styles.planCarouselShell} ${planCarouselFade.left ? styles.carouselHasLeft : ''} ${planCarouselFade.right ? styles.carouselHasRight : ''}`}>
                <div
                  className={styles.planCarousel}
                  ref={planCarouselRef}
                  onScroll={updatePlanCarouselFade}
                  onMouseEnter={updatePlanCarouselFade}
                >
                  {[
                    ['免费试用', '0/限时', '试用体验', [
                      ['3 个产品', true], ['20 份资料', true], ['200MB 存储', true], ['1GB/月流量', true],
                      ['二维码分享', false], ['自定义网址', false], ['数据统计', false], ['批量 / 版本管理', false],
                    ], '正在使用'],
                    ['入门版', '99/年', '初创企业', [
                      ['5 个产品', true], ['30 份资料', true], ['500MB 存储', true], ['5GB/月流量', true],
                      ['二维码分享', true], ['自定义网址', false], ['数据统计', false], ['批量 / 版本管理', false],
                    ], '后续开放'],
                    ['基础版', '499/年', '扩张企业', [
                      ['10 个产品', true], ['100 份资料', true], ['2GB 存储', true], ['30GB/月流量', true],
                      ['二维码分享', true], ['自定义网址', true], ['基础数据统计', true], ['批量 / 版本管理', false],
                    ], '后续开放'],
                    ['标准版', '1999/年', '成长企业', [
                      ['30 个产品', true], ['500 份资料', true], ['10GB 存储', true], ['150GB/月流量', true],
                      ['二维码分享', true], ['自定义网址', true], ['数据统计', true], ['批量 / 版本管理', true],
                    ], '推荐方案'],
                    ['专业版', '4999/年', '规模企业', [
                      ['80 个产品', true], ['1500 份资料', true], ['50GB 存储', true], ['1TB/月流量', true],
                      ['多成员权限', true], ['高级数据统计', true], ['优先支持', true], ['缺失资料提醒', true],
                    ], '后续开放'],
                    ['企业版', '10000+/年', '旗舰企业', [
                      ['产品数定制', true], ['资料数定制', true], ['存储 / 流量定制', true], ['专属品牌页', true],
                      ['高级权限', true], ['API / 数据导出', true], ['专属支持', true], ['适合 RIF 级企业', true],
                    ], '联系开通'],
                  ].map(([name, price, tag, benefits, foot]) => {
                    return (
                      <article key={name} className={`${styles.planFlagCard} ${name === '标准版' ? styles.recommendedPlan : ''}`}>
                        <div className={styles.planRibbon}>{tag}</div>
                        <h3>{name}</h3>
                        <strong>{price}</strong>
                        <ul>
                          {benefits.map(([benefit, enabled]) => (
                            <li key={benefit} className={enabled ? styles.benefitOn : styles.benefitOff}>
                              <span>{enabled ? '✓' : '—'}</span>{benefit}
                            </li>
                          ))}
                        </ul>
                        <div className={styles.planFoot}>{foot}</div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </Section>
        );
      }

      if (activePage === 'logs') {
        return (
          <Section title={t('admin.logs.title')} desc={t('admin.logs.desc')}>
            <div className={styles.logSummaryGrid}>
              {[
                ['今日操作', '12', '最近活跃'],
                ['资料修改', '4', '公司 / 产品'],
                ['资料操作', '6', '上传 / 替换'],
                ['权限变更', '2', '成员 / 角色'],
              ].map(([name, count, desc]) => (
                <div key={name} className={styles.logSummaryCard}>
                  <strong>{count}</strong>
                  <span>{name}</span>
                  <p>{desc}</p>
                </div>
              ))}
            </div>

            <div className={styles.logToolbar}>
              <input placeholder="搜索操作人、对象、内容" />
              <select defaultValue="all">
                <option value="all">全部类型</option>
                <option value="company">公司资料</option>
                <option value="product">产品资料</option>
                <option value="file">资料管理</option>
                <option value="member">员工权限</option>
              </select>
              <select defaultValue="7d">
                <option value="7d">最近 7 天</option>
                <option value="30d">最近 30 天</option>
                <option value="all">全部时间</option>
              </select>
              <button className={styles.secondaryBtn}>导出记录</button>
            </div>

            <div className={styles.timelineList}>
              {[
                ['今天 15:42', 'admin', '上传资料', '为 Equestrian Helmet F20 上传 DoC 声明文件', '资料管理'],
                ['今天 14:18', '质量部成员', '编辑产品', '修改产品 F20-201AL 的适用型号', '产品资料'],
                ['昨天 20:05', 'admin', '修改权限', '将 quality@example.com 设置为产品编辑', '员工权限'],
                ['昨天 18:30', '资料上传员', '替换资料', '替换 CE Certificate - F20 文件版本', '资料管理'],
              ].map(([time, user, action, content, type]) => (
                <article key={`${time}-${action}`} className={styles.timelineItem}>
                  <div className={styles.timelineDot} />
                  <div className={styles.timelineMain}>
                    <div>
                      <h3>{action}</h3>
                      <p>{content}</p>
                    </div>
                    <span>{type}</span>
                  </div>
                  <div className={styles.timelineMeta}>
                    <strong>{user}</strong>
                    <em>{time}</em>
                  </div>
                </article>
              ))}
            </div>
          </Section>
        );
      }

      return <Placeholder title={pageTitle} desc={`这里后续处理 ${currentCompany.name} 的 ${pageTitle}。`} />;
    }

    const hasPlatformPermission = isAdmin || admin?.platformRole === 'platform_admin' || admin?.platform_role === 'platform_admin' || admin?.role === 'admin' || admin?.role === 'platform_admin';
    if (activeGroup === 'platform' && !hasPlatformPermission) {
      return (
        <Section title={pageTitle} desc="平台管理功能仅限平台管理员使用。">
          <div className={styles.importBlockedState}>
            <div className={styles.importBlurPreview}>
              <div />
              <div />
              <div />
            </div>
            <div className={styles.importBlockedCard}>
              <h3>没有权限</h3>
              <p>当前账号不是平台管理员，无法查看企业审核、用户查询、内容举报和平台设置等平台管理功能。</p>
              <button className={styles.secondaryBtn} onClick={() => openPage('personal', 'profile')}>返回个人资料</button>
            </div>
          </div>
        </Section>
      );
    }

    if (activePage === 'company-review') {
      const counts = verificationItems.reduce((acc, item) => {
        const status = item.verificationStatus || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      const statusLabel = (status) => status === 'verified' ? '已通过' : status === 'rejected' ? '已拒绝' : '待审核';
      return (
        <Section title={t('admin.companyReview.title')} desc={t('admin.companyReview.desc')}>
          <div className={styles.reviewSummaryGrid}>
            {[
              ['待审核', String(counts.pending || 0), '需要平台处理'],
              ['已通过', String(counts.verified || 0), '认证成功企业'],
              ['已拒绝', String(counts.rejected || 0), '资料不完整或不通过'],
              ['当前筛选', verificationFilter === 'all' ? '全部' : statusLabel(verificationFilter), '可切换审核状态'],
            ].map(([name, count, desc]) => (
              <div key={name} className={styles.reviewSummaryCard}>
                <strong>{count}</strong>
                <span>{name}</span>
                <p>{desc}</p>
              </div>
            ))}
          </div>

          <div className={styles.reviewToolbar}>
            <input placeholder="搜索公司名称、申请人、公司编号" />
            <select value={verificationFilter} onChange={(event) => setVerificationFilter(event.target.value)}>
              <option value="pending">待审核</option>
              <option value="verified">已通过</option>
              <option value="rejected">已拒绝</option>
              <option value="all">全部状态</option>
            </select>
            <button className={styles.secondaryBtn} onClick={refreshCompanyVerifications}>刷新</button>
          </div>

          <div className={styles.reviewList}>
            {verificationItems.length === 0 && <div className={styles.emptyState}>当前没有需要显示的企业认证申请。</div>}
            {verificationItems.map((item) => {
              const status = statusLabel(item.verificationStatus);
              const companyId = item.companyId || item.id;
              const code = `c-${String(companyId).padStart(6, '0')}`;
              return (
                <article key={companyId} className={styles.reviewCard}>
                  <div className={styles.reviewCompanyBlock}>
                    <h3>{item.companyName || item.name}</h3>
                    <p>{code}</p>
                  </div>
                  <div className={styles.reviewInfoGrid}>
                    <span><strong>申请人</strong><em>{item.contactPerson || '-'}</em></span>
                    <span><strong>注册号</strong><em>{item.businessLicenseNo || '待补充'}</em></span>
                    <span><strong>提交时间</strong><em>{item.updatedAt || item.createdAt || '-'}</em></span>
                    <span><strong>审核状态</strong><em className={status === '待审核' ? styles.reviewStatusPending : status === '已通过' ? styles.reviewStatusPass : status === '已拒绝' ? styles.reviewStatusReject : styles.statusMuted}>{status}</em></span>
                  </div>
                  <div className={styles.reviewActions}>
                    <button className={styles.primaryBtn} onClick={() => showAction('查看材料功能待完善')}>查看材料</button>
                    {item.verificationStatus === 'pending' && <button className={styles.secondaryBtn} onClick={() => reviewCompany(companyId, 'approve')}>通过</button>}
                    {item.verificationStatus === 'pending' && <button className={styles.reviewRejectBtn} onClick={() => reviewCompany(companyId, 'reject')}>拒绝/要求补充</button>}
                  </div>
                </article>
              );
            })}
          </div>
        </Section>
      );
    }

    if (activePage === 'users') {
      return (
        <Section title={t('admin.userManagement.title')} desc={t('admin.userManagement.desc')}>
          <div className={styles.userSummaryGrid}>
            {[
              ['全部用户', '128', '平台注册账号'],
              ['企业用户', '36', '已加入或拥有公司'],
              ['普通用户', '89', '收藏和浏览资料'],
              ['风险账号', '3', '需要关注'],
            ].map(([name, count, desc]) => (
              <div key={name} className={styles.userSummaryCard}>
                <strong>{count}</strong>
                <span>{name}</span>
                <p>{desc}</p>
              </div>
            ))}
          </div>

          <div className={styles.userToolbar}>
            <input placeholder="搜索用户名、邮箱、手机号、用户编号" />
            <select defaultValue="all">
              <option value="all">全部角色</option>
              <option value="platform_admin">平台管理员</option>
              <option value="company_owner">企业拥有者</option>
              <option value="user">普通用户</option>
            </select>
            <select defaultValue="all">
              <option value="all">全部状态</option>
              <option value="active">正常</option>
              <option value="disabled">已禁用</option>
              <option value="risk">风险账号</option>
              <option value="manual">特殊权限处理</option>
            </select>
          </div>

          <div className={styles.riskNoticePanel}>
            <strong>权限原则</strong>
            <p>企业拥有者应通过企业认证自然产生；企业管理员和员工应由企业邀请或批准加入。平台只在申诉、误操作、账号异常等特殊情况下进行人工权限处理。</p>
          </div>

          <div className={styles.userList}>
            {[
              ['admin', 'U-000001', 'admin@legacy.local', '平台管理员', '2 家公司', '正常'],
              ['quality-user', 'U-000128', 'quality@example.com', '企业成员', '1 家公司', '正常'],
              ['visitor', 'U-000389', 'visitor@example.com', '普通用户', '无公司', '正常'],
              ['risk-account', 'U-000512', 'risk@example.com', '普通用户', '无公司', '风险账号'],
            ].map(([name, code, email, role, companyCount, status]) => (
              <article key={code} className={styles.userCard}>
                <div className={styles.memberAvatar}>{name.slice(0, 1).toUpperCase()}</div>
                <div className={styles.userMainInfo}>
                  <h3>{name}</h3>
                  <p>{email}</p>
                  <small>{code}</small>
                </div>
                <div className={styles.userInfoGrid}>
                  <span><strong>账号角色</strong><em>{role}</em></span>
                  <span><strong>关联公司</strong><em>{companyCount}</em></span>
                  <span><strong>账号状态</strong><em className={status === '正常' ? styles.statusOk : styles.reviewStatusReject}>{status}</em></span>
                </div>
                <div className={styles.userActions}>
                  <button className={styles.primaryTextBtn}>查看用户</button>
                  <button className={styles.secondaryTextBtn}>特殊权限处理</button>
                  <button className={status === '正常' ? styles.reviewRejectBtn : styles.secondaryTextBtn}>{status === '正常' ? '禁用' : '恢复'}</button>
                </div>
              </article>
            ))}
          </div>
        </Section>
      );
    }

    if (activePage === 'reports') {
      return (
        <Section title="举报处理" desc="处理用户提交的错误、虚假资料、侵权和过期资料举报。">
          <div className={styles.reportSummaryGrid}>
            {[
              ['待处理', '8', '需要平台确认'],
              ['处理中', '3', '等待企业回应'],
              ['已处理', '21', '已完成关闭'],
              ['高风险', '2', '疑似虚假或侵权'],
            ].map(([name, count, desc]) => (
              <div key={name} className={styles.reportSummaryCard}>
                <strong>{count}</strong>
                <span>{name}</span>
                <p>{desc}</p>
              </div>
            ))}
          </div>

          <div className={styles.reportToolbar}>
            <input placeholder="搜索举报对象、公司、产品、资料" />
            <select defaultValue="pending">
              <option value="pending">待处理</option>
              <option value="processing">处理中</option>
              <option value="resolved">已处理</option>
              <option value="all">全部状态</option>
            </select>
            <select defaultValue="all">
              <option value="all">全部类型</option>
              <option value="wrong_info">信息错误</option>
              <option value="fake">疑似虚假</option>
              <option value="expired">资料过期</option>
              <option value="copyright">侵权</option>
            </select>
          </div>

          <div className={styles.reportList}>
            {[
              ['疑似虚假证书', 'CE Certificate - F20', '高风险', '用户反馈证书编号与资料内容不一致', '待处理'],
              ['资料过期', 'Declaration of Conformity', '普通', 'DoC 资料可能不是最新版本', '处理中'],
              ['产品型号错误', 'Equestrian Helmet F20', '普通', '适用型号显示不完整', '待处理'],
              ['侵权投诉', 'User Manual', '高风险', '举报说明书疑似未经授权上传', '待处理'],
            ].map(([type, target, risk, desc, status]) => (
              <article key={`${type}-${target}`} className={styles.reportCard}>
                <div className={risk === '高风险' ? styles.reportAccentHigh : styles.reportAccentNormal} />
                <div className={styles.reportMain}>
                  <div className={styles.reportTitleRow}>
                    <div>
                      <span className={risk === '高风险' ? styles.reportRiskHigh : styles.reportRiskNormal}>{risk}</span>
                      <h3>{type}</h3>
                    </div>
                    <em className={status === '待处理' ? styles.reviewStatusPending : styles.reviewStatusMore}>{status}</em>
                  </div>
                  <p>{desc}</p>
                  <div className={styles.reportObject}>举报对象：{target}</div>
                </div>
                <div className={styles.reportActions}>
                  <button className={styles.primaryBtn}>查看详情</button>
                  <button className={styles.secondaryBtn}>联系企业</button>
                  <button className={styles.secondaryBtn}>标记处理</button>
                </div>
              </article>
            ))}
          </div>
        </Section>
      );
    }

    if (activePage === 'system') {
      return (
        <Section title="平台设置" desc="管理员只修改低风险运营信息；底层规则由平台技术配置维护。">
          <div className={styles.platformSettingNotice}>
            <strong>设置原则</strong>
            <p>平台公告、联系方式、帮助入口等可以由管理员维护；资料限制、备份、安全策略等属于基础规则，只展示给管理员查看，不能在后台随意修改。</p>
          </div>

          <div className={styles.systemGrid}>
            <div className={styles.systemCard}>
              <h3>可编辑：运营信息</h3>
              <div className={styles.editGrid}>
                <label>
                  <span>平台公告</span>
                  <textarea rows="3" placeholder="例如：系统维护通知、重要更新提醒。" />
                </label>
                <label>
                  <span>平台联系邮箱</span>
                  <input placeholder="327114305@qq.com" />
                </label>
                <label>
                  <span>帮助中心链接</span>
                  <input placeholder="https://..." />
                </label>
                <label>
                  <span>入驻咨询联系方式</span>
                  <input placeholder="327114305@qq.com / 18069839326" />
                </label>
                <label className={styles.fullField}>
                  <span>维护提醒文案</span>
                  <textarea rows="3" placeholder="当网站维护或部分功能不可用时展示。" />
                </label>
              </div>
            </div>

            <div className={styles.systemCard}>
              <h3>可编辑：页面与法律入口</h3>
              <div className={styles.settingRows}>
                {[
                  ['服务条款链接', '/terms'],
                  ['隐私政策链接', '/privacy'],
                  ['免责声明链接', '/disclaimer'],
                  ['企业入驻协议', '/enterprise-agreement'],
                  ['联系我们页面', '/contact'],
                ].map(([name, value]) => (
                  <div key={name} className={styles.settingRow}>
                    <span>{name}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.systemCardReadonly}>
              <h3>只读：资料与存储规则</h3>
              <div className={styles.settingRows}>
                {[
                  ['单文件大小限制', '未认证企业 10MB / 个'],
                  ['允许文件类型', 'PDF / JPG / PNG / WebP / Word'],
                  ['资料备份策略', '服务器 / 对象存储 / 定时备份'],
                  ['资料安全扫描', '后续接入'],
                ].map(([name, value]) => (
                  <div key={name} className={styles.settingRowReadonly}>
                    <span>{name}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.systemCardReadonly}>
              <h3>只读：安全与审核规则</h3>
              <div className={styles.settingRows}>
                {[
                  ['上传责任确认', '强制'],
                  ['企业认证审核', '人工审核'],
                  ['操作日志', '重要操作必须记录'],
                  ['权限干预', '仅超级管理员特殊处理'],
                  ['登录安全策略', '由系统配置决定'],
                ].map(([name, value]) => (
                  <div key={name} className={styles.settingRowReadonly}>
                    <span>{name}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <button className={styles.secondaryBtn}>取消</button>
            <button className={styles.primaryBtn}>保存可编辑设置</button>
          </div>
        </Section>
      );
    }

    if (activePage === 'categories') {
      const currentCategories = categoryMode === 'consumer' ? consumerCategories : complianceCategories;
      const categoryCopy = categoryMode === 'consumer'
        ? {
          title: 'C端产品分类',
          desc: '用于普通用户按产品用途查找产品与资料，例如运动户外、马术头盔、智能家居。',
          hint: '产品一般选择一个主分类，保证前台导航清晰。',
        }
        : {
          title: '审核/合规分类',
          desc: '用于审核机构按法规、认证路径、标准号快速定位 DoC、证书、测试报告。',
          hint: '一个产品可关联多个合规分类，资料类型仍由 documentType 单独管理。',
        };
      const topCategories = currentCategories.filter((item) => !item.parentId);
      return (
        <Section title="分类管理" desc="分类现在拆为 C端产品分类和审核/合规分类；资料类型不混入分类树。">
          <div className={styles.categoryHeaderPanel}>
            <div>
              <h3>{categoryCopy.title}</h3>
              <p>{categoryCopy.desc}</p>
            </div>
            <button className={styles.primaryBtn}>新增分类</button>
          </div>

          <div className={styles.categoryTools}>
            <button className={categoryMode === 'consumer' ? styles.primaryBtn : styles.secondaryBtn} onClick={() => setCategoryMode('consumer')}>C端产品分类</button>
            <button className={categoryMode === 'compliance' ? styles.primaryBtn : styles.secondaryBtn} onClick={() => setCategoryMode('compliance')}>审核/合规分类</button>
            <input placeholder="搜索分类名称" />
          </div>

          <div className={styles.profileNote}>{categoryCopy.hint}</div>

          <div className={styles.categoryTreeList}>
            {topCategories.map((parent) => {
              const children = currentCategories.filter((item) => String(item.parentId || '') === String(parent.id));
              return (
              <article key={parent.id} className={styles.categoryTreeCard}>
                <div className={styles.categoryParentRow}>
                  <div>
                    <h3>{parent.name}</h3>
                    <p>{parent.productCount || 0} 个产品 · {parent.status === 'active' ? '启用' : parent.status}</p>
                  </div>
                  <div className={styles.categoryActions}>
                    <button className={styles.secondaryBtn}>新增子类</button>
                    <button className={styles.secondaryBtn}>编辑</button>
                  </div>
                </div>
                <div className={styles.categoryChildren}>
                  {children.length ? children.map((child) => (
                    <span key={child.id}>{child.name}</span>
                  )) : (
                    <span>暂无子分类</span>
                  )}
                </div>
              </article>
            );})}
          </div>
        </Section>
      );
    }

    return <Placeholder title={pageTitle} desc="平台管理员功能入口，后续接入真实审核、用户、举报和系统设置数据。" />;
  };

  if (location.pathname === '/admin/test-stacklands-products') {
    return <StacklandsProductsTestPage onBack={() => navigate('/admin')} />;
  }

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>

        <nav
          className={`${styles.nav} ${sidebarScrolling ? styles.navScrolling : ''}`}
          onScroll={handleSidebarScroll}
        >
          <div className={styles.quickImportBox}>
            <button className={activeGroup === 'import' ? styles.quickImportActive : ''} onClick={() => openPage('import', 'bulk-import', activeCompany || companies[0]?.id)}>
              <MenuIcon type="import" />
              <span>批量上传</span>
            </button>
          </div>
          <MenuGroup title={t('admin.menu.personal')} items={personalMenus} activePage={activePage} onSelect={(id) => openPage('personal', id)} />

          <div className={styles.group}>
            <div className={styles.groupTitle}>{t('admin.menu.company')}</div>
            {companies.map((company) => (
              <div key={company.id} className={styles.companyBlock}>
                <button
                  className={`${styles.companyBtn} ${expandedCompanies.includes(company.id) ? styles.companyActive : ''}`}
                  onClick={() => setExpandedCompanies((current) => current.includes(company.id) ? current.filter((id) => id !== company.id) : [...current, company.id])}
                >
                  <span className={styles.companyName}><MenuIcon type="company-info" />{company.name}</span>
                  <small>{company.code}</small>
                </button>
                {expandedCompanies.includes(company.id) && (
                  <div className={styles.subMenu}>
                    {companyMenus.map((item) => (
                      <button
                        key={item.id}
                        className={activeGroup === 'company' && String(activeCompany) === String(company.id) && activePage === item.id ? styles.activeItem : ''}
                        onClick={() => openPage('company', item.id, company.id)}
                      >
                        <MenuIcon type={item.id} />
                        <span>{t(item.labelKey)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button className={styles.addCompanyBtn} onClick={() => setCompanyModal({ open: true, mode: 'create', name: '', nameEn: '', contactEmail: '' })}>
              + {t('admin.common.add')} / {t('admin.companyInfo.title')}
            </button>
          </div>

          <MenuGroup title={t('admin.menu.platform')} items={platformMenus} activePage={activePage} onSelect={(id) => openPage('platform', id)} />
        </nav>

      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1>{pageTitle}</h1>
          </div>
          <div className={styles.headerMeta}>
            <span>{admin?.email || '当前账号'}</span>
          </div>
        </header>


        <div>
          {actionMessage && <div className={styles.actionToast}>{actionMessage}</div>}
          {uploadProgress.open && (
            <div className={`${styles.uploadProgressToast} ${uploadProgress.phase === 'done' ? styles.uploadProgressDone : ''} ${uploadProgress.phase === 'error' ? styles.uploadProgressError : ''}`}>
              <div className={styles.uploadProgressHeader}>
                <span>{uploadProgress.phase === 'done' ? '✓' : uploadProgress.phase === 'error' ? '!' : '↑'}</span>
                <div>
                  <strong>{uploadProgress.title}</strong>
                  <em>{uploadProgress.detail}</em>
                </div>
              </div>
              <div className={styles.uploadProgressTrack}><i style={{ width: `${uploadProgress.percent}%` }} /></div>
              <p>{uploadProgress.phase === 'processing' ? '请稍等，不要关闭页面。' : uploadProgress.phase === 'error' ? '请检查文件大小、格式或网络后重试。' : `${uploadProgress.percent}%`}</p>
            </div>
          )}
          {renderContent()}





          {favoriteEditModal.open && (
            <div className={styles.modalBackdrop} onClick={closeFavoriteEditModal}>
              <div className={`${styles.adminModal} ${styles.favoriteEditModal}`} onClick={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <div>
                    <h3>整理收藏</h3>
                    <p>分组用于整理收藏，备注用于记录为什么收藏；两者会一起保存在这条收藏里。</p>
                  </div>
                  <button className={styles.iconCloseBtn} onClick={closeFavoriteEditModal}>×</button>
                </div>
                <div className={styles.favoriteEditTarget}>
                  <span className={`${styles.favoriteTypeBadge} ${getFavoriteToneClass(favoriteEditModal.item?.type)}`}>{favoriteEditModal.item?.type || '收藏'}</span>
                  <div>
                    <strong>{favoriteEditModal.item?.title || '未命名收藏'}</strong>
                    <p>{favoriteEditModal.item?.companyName || favoriteEditModal.item?.productName || favoriteEditModal.item?.meta || '暂无来源信息'}</p>
                  </div>
                </div>
                <div className={styles.modalFormGrid}>
                  <div className={styles.fullField}>
                    <span>选择收藏夹</span>
                    <div className={styles.favoriteFolderGrid}>
                      {favoriteGroupOptions.filter((group) => group.name !== '全部收藏').map((group) => (
                        <button
                          key={group.name}
                          type="button"
                          className={favoriteEditModal.group === group.name ? styles.favoriteFolderActive : ''}
                          onClick={() => setFavoriteEditModal((form) => ({ ...form, group: group.name, newGroup: '' }))}
                        >
                          <strong>{group.name}</strong>
                          <em>{group.count} 条</em>
                        </button>
                      ))}
                      <button
                        type="button"
                        className={favoriteEditModal.group === '__new__' ? styles.favoriteFolderActive : ''}
                        onClick={() => setFavoriteEditModal((form) => ({ ...form, group: '__new__' }))}
                      >
                        <strong>+ 新建分组</strong>
                        <em>类似新建收藏夹</em>
                      </button>
                    </div>
                  </div>
                  {favoriteEditModal.group === '__new__' && (
                    <label className={styles.fullField}>
                      <span>新分组名称</span>
                      <input value={favoriteEditModal.newGroup} onChange={(event) => setFavoriteEditModal((form) => ({ ...form, newGroup: event.target.value }))} placeholder="例如：客户A项目 / 投标资料 / 待采购" />
                    </label>
                  )}
                  <label className={styles.fullField}>
                    <span>备注</span>
                    <textarea rows="4" value={favoriteEditModal.note} onChange={(event) => setFavoriteEditModal((form) => ({ ...form, note: event.target.value }))} placeholder="例如：客户下周要核对；投标资料可能会用到。" />
                  </label>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.secondaryBtn} onClick={closeFavoriteEditModal}>取消</button>
                  <button className={styles.primaryBtn} onClick={saveFavoriteEdit}>保存整理</button>
                </div>
              </div>
            </div>
          )}

          {companyModal.open && (
            <div className={styles.modalBackdrop} onClick={() => setCompanyModal({ open: false, mode: 'create', name: '', nameEn: '', contactEmail: '' })}>
              <div className={styles.adminModal} onClick={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <div>
                    <h3>创建 / 认领公司</h3>
                    <p>这里创建的是公司申请草稿，认证通过前不会公开展示，也不代表正式拥有该企业。</p>
                  </div>
                  <button className={styles.iconCloseBtn} onClick={() => setCompanyModal({ open: false, mode: 'create', name: '', nameEn: '', contactEmail: '' })}>×</button>
                </div>
                <div className={styles.modalTabs}>
                  <button className={companyModal.mode === 'create' ? styles.tabActive : ''} onClick={() => setCompanyModal((form) => ({ ...form, mode: 'create' }))}>创建新公司</button>
                  <button className={companyModal.mode === 'claim' ? styles.tabActive : ''} onClick={() => setCompanyModal((form) => ({ ...form, mode: 'claim' }))}>认领已有公司 <span className={styles.todoBadge}>待完善</span></button>
                </div>
                {companyModal.mode === 'create' ? (
                  <div className={styles.modalFormGrid}>
                    <label><span>公司名称</span><input value={companyModal.name} onChange={(event) => setCompanyModal((form) => ({ ...form, name: event.target.value }))} placeholder="例如：广州某某安全用品有限公司" /></label>
                    <label><span>英文名称（可选）</span><input value={companyModal.nameEn} onChange={(event) => setCompanyModal((form) => ({ ...form, nameEn: event.target.value }))} placeholder="Company English Name" /></label>
                    <label className={styles.fullField}><span>联系邮箱（可选）</span><input value={companyModal.contactEmail} onChange={(event) => setCompanyModal((form) => ({ ...form, contactEmail: event.target.value }))} placeholder="contact@example.com" /></label>
                  </div>
                ) : (
                  <div className={styles.pendingPanel}>
                    <strong>认领公司需要审核</strong>
                    <p>后续这里会支持搜索已有公司、提交营业执照/授权书，然后由平台管理员审核。</p>
                  </div>
                )}
                <div className={styles.modalActions}>
                  <button className={styles.secondaryBtn} onClick={() => setCompanyModal({ open: false, mode: 'create', name: '', nameEn: '', contactEmail: '' })}>取消</button>
                  <button className={styles.primaryBtn} onClick={submitCompanyModal}>{companyModal.mode === 'create' ? '创建申请草稿' : '提交认领申请'}</button>
                </div>
              </div>
            </div>
          )}

          {passwordModal.open && (
            <div className={styles.modalBackdrop} onClick={() => setPasswordModal({ open: false, oldPassword: '', newPassword: '', confirmPassword: '' })}>
              <div className={styles.adminModal} onClick={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <div>
                    <h3>修改密码</h3>
                    <p>为了账号安全，请先输入当前密码，再设置新密码。</p>
                  </div>
                  <button className={styles.iconCloseBtn} onClick={() => setPasswordModal({ open: false, oldPassword: '', newPassword: '', confirmPassword: '' })}>×</button>
                </div>
                <div className={styles.modalFormGrid}>
                  <label className={styles.fullField}><span>当前密码</span><input type="password" value={passwordModal.oldPassword} onChange={(event) => setPasswordModal((form) => ({ ...form, oldPassword: event.target.value }))} /></label>
                  <label><span>新密码</span><input type="password" value={passwordModal.newPassword} onChange={(event) => setPasswordModal((form) => ({ ...form, newPassword: event.target.value }))} /></label>
                  <label><span>确认新密码</span><input type="password" value={passwordModal.confirmPassword} onChange={(event) => setPasswordModal((form) => ({ ...form, confirmPassword: event.target.value }))} /></label>
                </div>
                <div className={styles.profileNote}>修改成功后，下次登录请使用新密码。</div>
                <div className={styles.modalActions}>
                  <button className={styles.secondaryBtn} onClick={() => setPasswordModal({ open: false, oldPassword: '', newPassword: '', confirmPassword: '' })}>取消</button>
                  <button className={styles.primaryBtn} onClick={changePassword}>确认修改</button>
                </div>
              </div>
            </div>
          )}

          {productModal.open && (
            <div className={styles.modalBackdrop} onClick={closeProductModal}>
              <div className={`${styles.adminModal} ${styles.productEditModal}`} onClick={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <div>
                    <h3>{productModal.product ? '编辑产品' : '新增产品'}</h3>
                    <p>产品页要能说明“这是什么产品、适用哪些型号、资料是否完整”。</p>
                  </div>
                  <button className={styles.iconCloseBtn} onClick={closeProductModal}>×</button>
                </div>

                <div className={styles.productEditLayout}>
                  <section className={`${styles.productEditBlock} ${styles.productEditHeroBlock}`}>
                    <div className={styles.productEditHeroInfo}>
                      <div className={styles.productEditBlockTitle}>基础信息</div>
                      <div className={styles.modalFormGrid}>
                        <label><span>产品/系列名称</span><input value={productModal.name} onChange={(event) => setProductModal((form) => ({ ...form, name: event.target.value }))} placeholder="例如 Equestrian Helmet F20" /></label>
                        <label><span>英文名称（可选）</span><input value={productModal.nameEn} onChange={(event) => setProductModal((form) => ({ ...form, nameEn: event.target.value }))} placeholder="用于多语言页面" /></label>
                        <label><span>展示状态</span><select value={productModal.status} onChange={(event) => setProductModal((form) => ({ ...form, status: event.target.value }))}><option value="active">公开展示</option><option value="draft">草稿 / 待完善</option><option value="inactive">暂不公开</option></select></label>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.productImageUploadBox}
                      onClick={() => productModal.product ? uploadProductImageFile(productModal.product) : showAction('请先保存产品，再上传产品图')}
                    >
                      {productModal.imageUrl ? (
                        <img src={productModal.imageUrl} alt={productModal.name || '产品图'} />
                      ) : (
                        <span>
                          <strong>产品图片</strong>
                          <em>{productModal.product ? '点击上传 / 替换' : '保存后可上传'}</em>
                        </span>
                      )}
                    </button>
                  </section>

                  <section className={styles.productEditBlock}>
                    <div className={styles.productEditBlockTitle}>
                      分类信息
                      <span className={styles.infoTip} tabIndex="0" aria-label="分类说明">
                        i
                        <span className={styles.infoTipBubble}>C端产品分类用于普通用户按用途查找；审核/合规分类用于机构按法规、标准查找。</span>
                      </span>
                    </div>
                    {productClassificationSuggestion ? (
                      <div className={styles.productCategorySuggestion}>
                        <div>
                          <strong>系统推荐分类</strong>
                          <span>{productClassificationSuggestion.consumerCategoryPath || '其他 / 待分类'}{productClassificationSuggestion.complianceCategoryPaths?.length ? ` · ${productClassificationSuggestion.complianceCategoryPaths.join(' / ')}` : ''}</span>
                          <em>{productClassificationSuggestion.confidence} · {productClassificationSuggestion.reason}</em>
                        </div>
                        <button type="button" className={styles.secondaryBtn} onClick={applyProductClassificationSuggestion}>套用推荐</button>
                      </div>
                    ) : (
                      <div className={styles.productCategorySuggestion}>
                        <div>
                          <strong>暂无明确推荐</strong>
                          <span>可补充产品名称、型号、说明，或上传带标准号的证书后再识别。</span>
                        </div>
                      </div>
                    )}
                    <div className={styles.categoryGroupStack}>
                      <div className={styles.categoryGroupBox}>
                        <div className={styles.categoryGroupTitle}>C端分类</div>
                        <div className={styles.modalFormGrid}>
                          <label>
                            <span>一级分类</span>
                            <select value={selectedConsumerTopId} onChange={(event) => changeConsumerTopCategory(event.target.value)}>
                              <option value="">其他 / 待分类</option>
                              {topConsumerCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                            </select>
                          </label>
                          <label>
                            <span>二级分类</span>
                            <select value={selectedConsumerSecondId} onChange={(event) => changeConsumerSecondCategory(event.target.value)} disabled={!selectedConsumerTopId || !secondConsumerCategories.length}>
                              <option value="">{selectedConsumerTopId ? '不选择二级分类' : '请先选择一级分类'}</option>
                              {secondConsumerCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                            </select>
                          </label>
                          {thirdConsumerCategories.length > 0 && (
                            <label>
                              <span>三级分类（可选）</span>
                              <select value={selectedConsumerThirdId} onChange={(event) => changeConsumerThirdCategory(event.target.value)}>
                                <option value="">不选择三级分类</option>
                                {thirdConsumerCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                              </select>
                            </label>
                          )}
                        </div>
                      </div>

                      <div className={styles.categoryGroupBox}>
                        <div className={styles.categoryGroupTitle}>审核分类</div>
                        <div className={styles.modalFormGrid}>
                          <label>
                            <span>一级分类</span>
                            <select value={selectedComplianceTopId} onChange={(event) => changeComplianceTopCategory(event.target.value)}>
                              <option value="">暂不选择</option>
                              {topComplianceCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                            </select>
                          </label>
                          <label>
                            <span>二级分类</span>
                            <select value={selectedComplianceSecondId} onChange={(event) => changeComplianceSecondCategory(event.target.value)} disabled={!selectedComplianceTopId || !secondComplianceCategories.length}>
                              <option value="">{selectedComplianceTopId ? '不选择二级分类' : '请先选择一级分类'}</option>
                              {secondComplianceCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                            </select>
                          </label>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className={styles.productEditBlock}>
                    <div className={styles.productEditBlockTitle}>适用型号</div>
                    <p className={styles.productEditHint}>一个产品系列可以包含多个型号；每个型号单独成框，避免后续证书和资料归档混乱。</p>
                    <div className={styles.productModelEditor}>
                      {productModal.models.map((model, index) => (
                        <div key={`${index}-${productModal.models.length}`} className={styles.productModelPill}>
                          <input value={model} onChange={(event) => updateProductModel(index, event.target.value)} placeholder={`型号 ${index + 1}`} />
                          <button type="button" onClick={() => removeProductModel(index)}>×</button>
                        </div>
                      ))}
                      <button type="button" className={styles.addModelMiniBtn} onClick={addProductModel}>+ 型号</button>
                    </div>
                  </section>

                  <section className={styles.productEditBlock}>
                    <div className={styles.productEditBlockTitle}>前台展示参数</div>
                    <div className={styles.modalFormGrid}>
                      <label><span>产品尺寸</span><input value={productModal.dimensions} onChange={(event) => setProductModal((form) => ({ ...form, dimensions: event.target.value }))} placeholder="例如 280 × 220 × 180 mm" /></label>
                      <label><span>重量</span><input value={productModal.weight} onChange={(event) => setProductModal((form) => ({ ...form, weight: event.target.value }))} placeholder="例如 520 g" /></label>
                      <label><span>材质</span><input value={productModal.material} onChange={(event) => setProductModal((form) => ({ ...form, material: event.target.value }))} placeholder="例如 ABS 外壳 / EPS 内衬" /></label>
                      <label><span>适用场景</span><input value={productModal.usageScenario} onChange={(event) => setProductModal((form) => ({ ...form, usageScenario: event.target.value }))} placeholder="例如 马术训练、骑乘防护" /></label>
                      <label><span>颜色/外观</span><input value={productModal.color} onChange={(event) => setProductModal((form) => ({ ...form, color: event.target.value }))} placeholder="例如 黑色、白色、哑光" /></label>
                      <label><span>产地/生产地</span><input value={productModal.originCountry} onChange={(event) => setProductModal((form) => ({ ...form, originCountry: event.target.value }))} placeholder="例如 China / EU" /></label>
                      <label><span>保修/服务</span><input value={productModal.warranty} onChange={(event) => setProductModal((form) => ({ ...form, warranty: event.target.value }))} placeholder="例如 12个月有限保修" /></label>
                      <label><span>包装内容</span><input value={productModal.packageContents} onChange={(event) => setProductModal((form) => ({ ...form, packageContents: event.target.value }))} placeholder="例如 头盔、说明书、收纳袋" /></label>
                    </div>
                  </section>

                  <section className={styles.productEditBlock}>
                    <div className={styles.productEditBlockTitle}>页面展示内容</div>
                    <div className={styles.modalFormGrid}>
                      <label className={styles.fullField}><span>产品说明</span><textarea rows="4" value={productModal.description} onChange={(event) => setProductModal((form) => ({ ...form, description: event.target.value }))} placeholder="给用户看的简短介绍、用途、注意事项" /></label>
                      <label className={styles.fullField}><span>英文说明（可选）</span><textarea rows="3" value={productModal.descriptionEn} onChange={(event) => setProductModal((form) => ({ ...form, descriptionEn: event.target.value }))} placeholder="多语言页面可用" /></label>
                    </div>
                  </section>

                  {productModal.product && (
                    <section className={styles.productEditBlock}>
                      <div className={styles.productEditBlockTitle}>关联资料</div>
                      <div className={styles.productEditFiles}>
                        {getProductDocuments(productModal.product, companyDocuments).length ? getProductDocuments(productModal.product, companyDocuments).map((doc) => (
                          <button key={doc.id} onClick={() => selectDocumentInSlotModal(doc)}><strong>{doc.type}</strong><span>{doc.name}</span><em>{doc.lang}</em></button>
                        )) : <p>这个产品还没有绑定资料，可通过“添加资料”或“批量导入”补充。</p>}
                      </div>
                      <div className={styles.productEditInlineActions}>
                        <button className={styles.secondaryBtn} onClick={uploadDocumentFile}>添加资料</button>
                        <button className={styles.secondaryBtn} onClick={() => openPage('import', 'bulk-import', activeCompany)}>批量导入</button>
                      </div>
                    </section>
                  )}
                </div>

                <div className={`${styles.modalActions} ${styles.productEditModalActions}`}>
                  <div>
                    {productModal.product?.id && <button className={styles.dangerSoftBtn} onClick={deleteProductFromModal}>删除产品</button>}
                  </div>
                  <div>
                    <button className={styles.secondaryBtn} onClick={closeProductModal}>取消</button>
                    <button className={styles.primaryBtn} onClick={createOrEditProduct}>保存产品</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {documentModal.open && (
            <div className={styles.modalBackdrop} onClick={() => closeDocumentModal()}>
              <div className={`${styles.adminModal} ${styles.documentSlotModal} ${styles.documentSplitModal}`} onClick={(event) => event.stopPropagation()}>
                <section className={styles.documentMediaColumn}>
                  <div className={styles.documentPreviewPanel}>
                    <div className={styles.documentPreviewCard}>
                      {(() => {
                        const docUrl = getDocumentAssetUrl(documentModal.doc);
                        const hasRecord = hasDocumentRecord(documentModal.doc);
                        const hasActualFile = Boolean(documentModal.file || docUrl);
                        const isMissingFile = hasRecord && !hasActualFile;
                        const canPreview = hasActualFile;
                        const previewImageUrl = documentModal.filePreviewUrl || (!documentModal.file && isImageUrl(docUrl) ? docUrl : '');
                        return (
                          <>
                            <button type="button" className={`${styles.documentPreviewBody} ${!hasRecord && !documentModal.file ? styles.documentUploadEmpty : ''} ${isMissingFile ? styles.documentFileMissing : ''}`} onClick={() => canPreview ? openDocumentPreview() : documentFileInputRef.current?.click()}>
                              {previewImageUrl ? (
                                <img src={previewImageUrl} alt={documentModal.file?.name || documentModal.doc?.name || '资料缩略图'} />
                              ) : hasActualFile ? (
                                <strong>{documentModal.file ? documentFileExt(documentModal.file.name) : documentFileExt(documentModal.doc?.name || docUrl || 'FILE')}</strong>
                              ) : isMissingFile ? (
                                <span className={styles.documentMissingPrompt}>
                                  <b>!</b>
                                  <strong>资料信息已存在</strong>
                                  <em>但没有找到对应资料，请补传或替换资料</em>
                                </span>
                              ) : (
                                <span className={styles.documentUploadPrompt}>
                                  <b>+</b>
                                  <strong>点击上传资料</strong>
                                  <em>支持 PDF、PNG、JPG、WebP、Word，单份资料不超过 10MB</em>
                                </span>
                              )}
                            </button>
                            <div className={styles.documentPreviewMeta}>
                              <div>
                                <span>{documentModal.file?.name || documentModal.doc?.name || '当前槽位暂无资料'}</span>
                                <em>{hasActualFile ? '点击图片放大查看资料' : isMissingFile ? '已有资料信息，但服务器未关联资料地址' : '上传后会自动带入标题与语言，可继续修改'}</em>
                              </div>
                              {(hasRecord || documentModal.file) && <button type="button" onClick={() => documentFileInputRef.current?.click()}>{isMissingFile ? '补传' : '替换'}</button>}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <input ref={documentFileInputRef} className={styles.documentHiddenFile} type="file" accept="application/pdf,image/png,image/jpeg,image/webp,.doc,.docx" onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setDocumentModalFile(file);
                      event.target.value = '';
                    }} />
                  </div>
                </section>

                <section className={styles.documentInfoColumn}>
                  <button className={styles.iconCloseBtn} onClick={() => closeDocumentModal()}>×</button>
                  <div className={styles.documentSplitHeader}>
                    <h3>{documentModal.mode === 'upload' ? '补充产品资料' : '维护产品资料'}</h3>
                    <p>{documentModal.source === 'slot' ? '已根据入口锁定产品和资料类型，只需要上传或校对资料信息。' : '资质证书、DoC 声明和使用说明书都可以在这里维护。'}请仅维护适合对外展示的产品资料，不要上传商业敏感资料。</p>
                  </div>

                  {documentModal.docs?.length > 1 && (
                    <div className={styles.documentPageTabs}>
                      {documentModal.docs.map((doc, index) => (
                        <button key={doc.id} className={String(documentModal.doc?.id) === String(doc.id) ? styles.documentPageActive : ''} onClick={() => selectDocumentInSlotModal(doc)}>
                          <span>资料 {index + 1}</span>
                          <strong>{doc.name}</strong>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`${styles.modalFormGrid} ${styles.documentInfoGrid}`}>
                    {documentModal.lockedProduct ? (
                      <label className={styles.documentLockedField}><span>绑定产品</span><input value={documentModal.productName || companyProducts.find((product) => String(product.id) === String(documentModal.productId))?.name || '请选择产品'} readOnly /></label>
                    ) : (
                      <label><span>绑定产品</span><select value={documentModal.productId} onChange={(event) => setDocumentModal((form) => ({ ...form, productId: event.target.value, productName: companyProducts.find((product) => String(product.id) === String(event.target.value))?.name || '' }))}>{companyProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                    )}
                    {documentModal.lockedType ? (
                      <label className={styles.documentLockedField}><span>资料类型</span><input value={importTypeLabel(documentModal.documentType)} readOnly /></label>
                    ) : (
                      <label><span>资料类型</span><select value={documentModal.documentType} onChange={(event) => setDocumentModal((form) => ({ ...form, documentType: event.target.value }))}><option value="certificate">资质证书</option><option value="declaration_of_conformity">DoC声明文件</option><option value="manual">使用说明书</option><option value="other">其他资料</option></select></label>
                    )}
                    <label><span>资料标题</span><input value={documentModal.title} placeholder="选择资料后自动带入，可修改" onChange={(event) => setDocumentModal((form) => ({ ...form, title: event.target.value }))} /></label>
                    <label><span>语言</span><input value={documentModal.language} onChange={(event) => setDocumentModal((form) => ({ ...form, language: event.target.value }))} /></label>
                    {documentModal.documentType === 'certificate' && <label><span>证书编号</span><input value={documentModal.certNo} placeholder="可稍后补充" onChange={(event) => setDocumentModal((form) => ({ ...form, certNo: event.target.value }))} /></label>}
                    {documentModal.documentType === 'certificate' && <label><span>认证标准</span><input value={documentModal.standard} placeholder="例如 EN 1384 / CE" onChange={(event) => setDocumentModal((form) => ({ ...form, standard: event.target.value }))} /></label>}
                    {documentModal.documentType === 'certificate' && <label><span>发证机构</span><input value={documentModal.issuer} placeholder="例如 TÜV / SGS" onChange={(event) => setDocumentModal((form) => ({ ...form, issuer: event.target.value }))} /></label>}
                  </div>
                  <div className={styles.modalActions}>
                    <button className={styles.secondaryBtn} onClick={() => closeDocumentModal()}>取消</button>
                    <button className={styles.primaryBtn} onClick={submitDocumentModal}>{documentModal.mode === 'upload' ? '确认上传' : documentModal.file ? '保存并替换' : '保存信息'}</button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {documentPreview.open && (
            <div className={styles.previewBackdrop} onClick={closeDocumentPreview}>
              <div className={styles.previewModal} onClick={(event) => event.stopPropagation()}>
                <div className={styles.previewHeader}>
                  <div>
                    <h3>{documentPreview.title || '资料预览'}</h3>
                    <p>用于快速核对资料内容，不会修改当前资料。</p>
                  </div>
                  <button className={styles.iconCloseBtn} onClick={closeDocumentPreview}>×</button>
                </div>
                <div className={styles.previewFrameWrap}>
                  {documentPreview.url.match(/\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/i) || documentPreview.objectUrl ? (
                    <img src={documentPreview.url} alt={documentPreview.title || '资料预览'} />
                  ) : (
                    <iframe src={documentPreview.url} title={documentPreview.title || '资料预览'} />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function MenuGroup({ title, items, activePage, onSelect }) {
  const { t } = useTranslation();
  return (
    <div className={styles.group}>
      <div className={styles.groupTitle}>{title}</div>
      <div className={styles.subMenu}>
        {items.map((item) => (
          <button key={item.id} className={activePage === item.id ? styles.activeItem : ''} onClick={() => onSelect(item.id)}>
            <MenuIcon type={item.id} />
            <span>{t(item.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ children }) {
  return <section className={styles.section}>{children}</section>;
}

function Placeholder({ title = '功能待接入', desc = '' }) {
  return (
    <div className={styles.placeholder}>
      <strong>{title}</strong>
      {desc && <p>{desc}</p>}
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className={styles.tableWrap}>
      <table>
        <thead>
          <tr>{columns.map((col) => <th key={col}>{col}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function StacklandsProductsTestPage({ onBack }) {
  const initialProducts = [
    {
      id: 'f66',
      name: 'Product F66 Series',
      company: 'Cavali Safety Equipment',
      models: ['F66-660', 'F66-661', 'F66-662', 'F66-663'],
      status: '缺说明书',
      updated: '今天 10:42',
      files: [
        { id: 'f66-cert-1', type: '资质证书', name: 'F66 CE Certificate.pdf', lang: 'EN', status: '已归档' },
        { id: 'f66-cert-2', type: '资质证书', name: 'F66 UKCA Certificate.pdf', lang: 'EN', status: '已归档' },
        { id: 'f66-doc-1', type: 'DoC声明', name: 'F66 DoC EN.pdf', lang: 'EN', status: '已归档' },
        { id: 'f66-doc-2', type: 'DoC声明', name: 'F66 DoC DE.pdf', lang: 'DE', status: '已归档' },
      ],
    },
    {
      id: 'f20',
      name: 'Equestrian Helmet F20',
      company: 'Guangzhou Safety Equipment',
      models: ['F20-201AL', 'F20-201AE', 'F20-202AL'],
      status: '资料完整',
      updated: '昨天 18:20',
      files: [
        { id: 'f20-cert-1', type: '资质证书', name: 'F20 CE Certificate.pdf', lang: 'EN', status: '已归档' },
        { id: 'f20-cert-2', type: '资质证书', name: 'F20 Test Report.pdf', lang: 'EN', status: '已归档' },
        { id: 'f20-doc-1', type: 'DoC声明', name: 'F20 DoC EN.pdf', lang: 'EN', status: '已归档' },
        { id: 'f20-doc-2', type: 'DoC声明', name: 'F20 DoC FR.pdf', lang: 'FR', status: '已归档' },
        { id: 'f20-manual-1', type: '说明书', name: 'F20 User Manual.pdf', lang: 'EN', status: '已归档' },
      ],
    },
    {
      id: 'f60',
      name: 'Riding Helmet F60',
      company: 'RIF Riding Gear',
      models: ['F60-608', 'F60-609'],
      status: '待整理',
      updated: '2 天前',
      files: [
        { id: 'f60-cert-1', type: '资质证书', name: 'F60 Certificate.pdf', lang: 'EN', status: '已归档' },
        { id: 'f60-manual-1', type: '说明书', name: 'F60 Manual.pdf', lang: 'EN', status: '已归档' },
      ],
    },
  ];
  const initialPendingFiles = [
    { id: 'p1', name: 'F66_manual_EN.pdf', desc: '疑似说明书 · EN', type: '说明书', target: 'f66' },
    { id: 'p2', name: 'F66_manual_DE.pdf', desc: '疑似说明书 · DE', type: '说明书', target: 'f66' },
    { id: 'p3', name: 'F60_DOC_EN.pdf', desc: '疑似 DoC · EN', type: 'DoC声明', target: 'f60' },
    { id: 'p4', name: 'duplicate_F20.pdf', desc: '疑似重复 · F20', type: '资质证书', target: 'f20', duplicate: true },
  ];

  const [products, setProducts] = useState(initialProducts);
  const [pendingFiles, setPendingFiles] = useState(initialPendingFiles);
  const [selectedProductId, setSelectedProductId] = useState('f66');
  const [selectedPile, setSelectedPile] = useState('全部资料');
  const [focusMode, setFocusMode] = useState('all');
  const [viewMode, setViewMode] = useState('standard');
  const visibleProducts = products.filter((product) => focusMode === 'all' || getStackProductHealth(product).status === focusMode);

  const addPendingToProduct = (pendingFile) => {
    setProducts((items) => items.map((product) => product.id === pendingFile.target ? {
      ...product,
      files: [...product.files, { id: `new-${pendingFile.id}`, type: pendingFile.type, name: pendingFile.name, lang: pendingFile.name.includes('_DE') ? 'DE' : 'EN', status: '刚归档' }],
      status: '刚更新',
      updated: '刚刚',
    } : product));
    setPendingFiles((items) => items.filter((item) => item.id !== pendingFile.id));
    setSelectedProductId(pendingFile.target);
    setSelectedPile(pendingFile.type);
  };

  const removePendingFile = (pendingFile) => {
    setPendingFiles((items) => items.filter((item) => item.id !== pendingFile.id));
  };

  const addMissingFile = (productId, type) => {
    setProducts((items) => items.map((product) => product.id === productId ? {
      ...product,
      files: [...product.files, { id: `mock-${Date.now()}`, type, name: `${product.name} ${type}.pdf`, lang: 'EN', status: '模拟新增' }],
      status: '刚更新',
      updated: '刚刚',
    } : product));
    setSelectedProductId(productId);
    setSelectedPile(type);
  };

  return (
    <div className={styles.stackPage}>
      <div className={styles.stackTopbar}>
        <div>
          <span className={styles.stackEyebrow}>TEST PAGE · Stacklands style</span>
          <h1>产品资料桌面</h1>
          <p>用“产品卡 + 资料堆 + 空卡槽”替代复杂表格，先体验效率和缺陷。</p>
        </div>
        <div className={styles.stackTopActions}>
          <button className={styles.secondaryBtn} onClick={() => setProducts(initialProducts)}>重置产品</button>
          <button className={styles.secondaryBtn} onClick={onBack}>返回正式后台</button>
        </div>
      </div>

      <div className={styles.stackBoard}>
        <aside className={styles.stackInbox}>
          <div className={styles.stackPanelTitle}>待整理资料堆</div>
          <p>点击“归档”会模拟把资料放进推荐产品；重复资料可直接删除。</p>
          <div className={styles.stackPendingPile}>
            {pendingFiles.length ? pendingFiles.map((file, index) => (
              <div key={file.id} className={`${styles.stackPendingCard} ${file.duplicate ? styles.stackDuplicatePending : ''}`} style={{ '--tilt': `${index % 2 ? 1.5 : -1.2}deg` }}>
                <strong>{file.name}</strong>
                <span>{file.desc}</span>
                <div className={styles.stackPendingActions}>
                  {!file.duplicate && <button onClick={() => addPendingToProduct(file)}>归档</button>}
                  <button onClick={() => removePendingFile(file)}>{file.duplicate ? '删除重复' : '删除'}</button>
                </div>
              </div>
            )) : <div className={styles.stackEmptyPile}>待整理资料已清空</div>}
          </div>
        </aside>

        <main className={styles.stackDesk}>
          <div className={styles.stackDeskHeader}>
            <div>
              <h2>产品卡片</h2>
              <p>默认只看产品名、完整度和资料堆；缺失资料会直接变成空卡槽。</p>
            </div>
            <div className={styles.stackFilters}>
              {['all', '资料完整', '缺资料', '待整理'].map((item) => <button key={item} className={focusMode === item ? styles.stackFilterActive : ''} onClick={() => setFocusMode(item)}>{item === 'all' ? '全部' : item}</button>)}
            </div>
          </div>

          <div className={styles.stackViewTools}>
            <div className={styles.stackViewSwitch}>
              {['overview', 'standard', 'detail'].map((mode) => (
                <button key={mode} className={viewMode === mode ? styles.stackFilterActive : ''} onClick={() => setViewMode(mode)}>{mode === 'overview' ? '概览' : mode === 'standard' ? '标准' : '详细'}</button>
              ))}
            </div>
            <span>{viewMode === 'overview' ? '快速看哪些产品缺资料。' : viewMode === 'standard' ? '日常整理用，信息和效率平衡。' : '核对资料名、语言和型号时使用。'}</span>
          </div>

          <div className={`${styles.stackProductGrid} ${styles[`stackView_${viewMode}`]}`}>
            {visibleProducts.map((product) => {
              const health = getStackProductHealth(product);
              return (
                <article key={product.id} className={`${styles.stackProductCard} ${selectedProductId === product.id ? styles.stackProductSelected : ''}`}>
                  <button className={styles.stackProductClickLayer} onClick={() => { setSelectedProductId(product.id); setSelectedPile(selectedProductId === product.id ? selectedPile : '全部资料'); }} aria-label={`查看 ${product.name}`} />
                  <div className={styles.stackProductHead}>
                    <div>
                      <h3 className={styles.smartProductTitle}><SmartProductTitle title={product.name} /></h3>
                      <p>{product.company} · {product.updated}</p>
                    </div>
                    <span className={health.className}>{health.status}</span>
                  </div>

                  <div className={`${styles.stackProgressTrack} ${health.progressClass}`}><span style={{ width: `${health.progress}%` }} /></div>

                  {viewMode !== 'overview' && <div className={styles.stackNextAction}>{getStackNextAction(product)}</div>}

                  <div className={styles.stackFileRows}>
                    {['资质证书', 'DoC声明', '说明书'].map((type) => {
                      const files = product.files.filter((file) => file.type === type);
                      const active = selectedProductId === product.id && selectedPile === type;
                      const shouldShowFiles = viewMode === 'detail' || (viewMode === 'standard' && active);
                      return (
                        <div key={type} className={`${styles.stackFileRowWrap} ${active || viewMode === 'detail' ? styles.stackFileRowOpen : ''}`}>
                          <button className={styles.stackFileRow} onClick={(event) => { event.stopPropagation(); viewMode === 'overview' ? setSelectedProductId(product.id) : files.length ? (setSelectedProductId(product.id), setSelectedPile(active ? '全部资料' : type)) : addMissingFile(product.id, type); }}>
                            <span>{type}</span>
                            <strong>{files.length || '+'}</strong>
                          </button>
                          {shouldShowFiles && files.length > 0 && (
                            <div className={styles.stackRowFiles}>
                              {files.map((file) => <button key={file.id}><span>{file.name}</span><em>{file.lang} · {file.status}</em></button>)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {viewMode === 'detail' && (
                    <>
                      <div className={styles.stackInlineModels}>{product.models.map((model) => <span key={model}>{model}</span>)}</div>
                      <div className={styles.stackDetailMeta}><span>公司：{product.company}</span><span>更新：{product.updated}</span></div>
                    </>
                  )}

                  {viewMode !== 'overview' && <div className={styles.stackCardActions}>
                    <button onClick={(event) => { event.stopPropagation(); setSelectedProductId(product.id); setSelectedPile('资质证书'); }}>管理资料</button>
                    <button onClick={(event) => event.stopPropagation()}>编辑产品</button>
                    <button onClick={(event) => event.stopPropagation()}>预览</button>
                  </div>}
                </article>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

function getStackNextAction(product) {
  const missing = ['资质证书', 'DoC声明', '说明书'].filter((type) => !product.files.some((file) => file.type === type));
  if (!missing.length) return '资料完整：可以直接对外展示，也适合生成二维码。';
  return `下一步建议：补充${missing[0]}，让产品资料更完整。`;
}

function getStackProductHealth(product) {
  const required = ['资质证书', 'DoC声明', '说明书'];
  const presentCount = required.filter((type) => product.files.some((file) => file.type === type)).length;
  if (presentCount === required.length) return { status: '资料完整', progress: 100, className: styles.stackOk };
  if (product.status === '待整理') return { status: '待整理', progress: Math.round((presentCount / required.length) * 100), className: styles.stackWarn };
  return { status: '缺资料', progress: Math.round((presentCount / required.length) * 100), className: styles.stackMissing };
}
