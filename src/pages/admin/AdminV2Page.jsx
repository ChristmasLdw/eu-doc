import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../../contexts/AdminContext';
import * as api from '../../services/api';
import styles from './AdminV2Page.module.css';

const fallbackCompanies = [];

const personalMenus = [
  { id: 'profile', labelKey: 'admin.menu.profile' },
  { id: 'security', labelKey: 'admin.menu.security' },
  { id: 'favorites', labelKey: 'admin.menu.favorites' },
  { id: 'history', labelKey: 'admin.menu.history' },
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


function getImportConfidence(group) {
  const hasModel = Boolean(group.model);
  const hasLanguages = group.items.every((item) => item.guessedLanguage);
  const sameType = new Set(group.items.map((item) => item.guessedType || 'other')).size === 1;
  if (hasModel && hasLanguages && sameType) return { label: '高可信', tone: 'green', desc: '型号、类型和语言都较明确' };
  if (hasModel && sameType) return { label: '中可信', tone: 'orange', desc: '型号和类型基本明确，建议确认语言' };
  return { label: '低可信', tone: 'red', desc: '识别信息不足，建议仔细检查' };
}

function importTypeLabel(type) {
  if (type === 'declaration_of_conformity') return 'DoC声明文件';
  if (type === 'certificate') return '资质证书';
  if (type === 'manual') return '使用说明书';
  return '其他文件';
}

function importStepClass(styles, confirmedStep = 0, step) {
  if (confirmedStep >= step) return `${styles.importQuestion} ${styles.questionDone}`;
  if (confirmedStep + 1 === step) return `${styles.importQuestion} ${styles.questionActive}`;
  return `${styles.importQuestion} ${styles.questionWaiting}`;
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
    import: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
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
  const { admin, logout } = useAdmin();
  const [activeGroup, setActiveGroup] = useState('personal');
  const [companies, setCompanies] = useState(fallbackCompanies);
  const [activeCompany, setActiveCompany] = useState(null);
  const [expandedCompanies, setExpandedCompanies] = useState([]);
  const [activePage, setActivePage] = useState('profile');
  const [sidebarScrolling, setSidebarScrolling] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [favoriteFilter, setFavoriteFilter] = useState('全部收藏');
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [historyRows, setHistoryRows] = useState([
    ['刚刚', '产品', 'Equestrian Helmet F20', 'Guangzhou Safety Equipment Co., Ltd.', '继续查看'],
    ['今天 20:15', '文件', 'Declaration of Conformity', 'Guangzhou Safety Equipment Co., Ltd.', '打开文件'],
    ['昨天 18:02', '公司', 'EU Riding Gear GmbH', '-', '查看公司'],
    ['3 天前', '文件', 'CE Certificate - F20', 'Guangzhou Safety Equipment Co., Ltd.', '重新打开'],
  ]);
  const [favoriteItems, setFavoriteItems] = useState([
    ['产品', 'Equestrian Helmet F20', 'Guangzhou Safety Equipment Co., Ltd.', '资质证书、DoC、说明书已收录', '客户 A 需要核对证书', '正常'],
    ['公司', 'Guangzhou Safety Equipment Co., Ltd.', '公司主页', '常用供应商资料', '后续关注产品更新', '正常'],
    ['文件', 'CE Certificate - F20', '资质证书', '有效期至 2031-01-27', '投标资料可能会用到', '正常'],
    ['文件', 'Old User Manual', '使用说明书', '该文件可能已被替换', '需要确认是否最新版本', '需注意'],
  ]);
  const [recentlyDeletedItems, setRecentlyDeletedItems] = useState([]);
  const [notificationItems, setNotificationItems] = useState([
    { title: '企业邀请', desc: 'Guangzhou Safety Equipment Co., Ltd. 邀请你成为企业管理员。', status: '待处理', tone: 'blue', pinned: true },
    { title: '文件更新', desc: '你收藏的产品 Equestrian Helmet F20 有新的 DoC 声明文件。', status: '未读', tone: 'orange', pinned: true },
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
  const [fileFilters, setFileFilters] = useState({ query: '', type: 'all', product: 'all', language: 'all', status: 'all' });
  const emptyProductModal = { open: false, product: null, name: '', nameEn: '', models: [''], categoryPrimaryId: '', status: 'active', description: '', descriptionEn: '' };
  const [productModal, setProductModal] = useState(emptyProductModal);
  const [documentModal, setDocumentModal] = useState({ open: false, mode: 'upload', doc: null, title: '', productId: '', documentType: 'certificate', language: 'en', certNo: '', standard: '', issuer: '', file: null });
  const [passwordModal, setPasswordModal] = useState({ open: false, oldPassword: '', newPassword: '', confirmPassword: '' });
  const [companyModal, setCompanyModal] = useState({ open: false, mode: 'create', name: '', nameEn: '', contactEmail: '' });
  const [importItems, setImportItems] = useState([]);
  const [importSelection, setImportSelection] = useState({});
  const [splitImportGroups, setSplitImportGroups] = useState({});
  const [activeImportGroupKey, setActiveImportGroupKey] = useState(null);
  const importInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const companyLogoInputRef = useRef(null);
  const sidebarScrollTimer = useRef(null);
  const userCode = savedUserCode || admin?.user_code || `U-${String(admin?.id || 1).padStart(6, '0')}`;

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
        setFavoriteItems((data.favorites || []).map((item) => [
          item.itemType,
          item.title,
          item.meta || '',
          item.description || '',
          item.note || '',
          item.status || '正常',
          item.id,
          item.itemId,
        ]));
        setRecentlyDeletedItems((data.recentlyDeleted || []).map((item) => [
          item.itemType,
          item.title,
          item.meta || '',
          item.description || '',
          item.note || '',
          item.status || '正常',
          item.id,
          item.itemId,
          item.deletedAt,
        ]));
        setHistoryRows((data.history || []).map((item) => [
          item.viewedAt || item.createdAt || '刚刚',
          item.itemType,
          item.title,
          item.company || '-',
          item.actionLabel || '查看',
          item.id,
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

  useEffect(() => {
    api.getMyCompanies()
      .then((items) => {
        if (!items.length) {
          setCompanies([]);
          setActiveCompany(null);
          setExpandedCompanies([]);
          return;
        }
        const mappedCompanies = items.map((company) => ({
          id: Number(company.id),
          name: company.name,
          code: `c-${String(company.id).padStart(6, '0')}`,
          status: company.verificationStatus === 'verified' ? '已认证' : '待认证',
          memberRole: company.memberRole || 'owner',
        }));
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
          category: item.categoryName || '其他 / 待分类',
          categoryPrimaryId: item.categoryPrimaryId || '',
          files: item.documentCount || 0,
          status: item.status === 'active' ? '公开' : item.status || '草稿',
          rawStatus: item.status || 'active',
          updatedAt: item.updatedAt || item.createdAt || '2026-06-25',
          description: item.description || '',
          nameEn: item.nameEn || '',
          descriptionEn: item.descriptionEn || '',
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
          name: item.title || item.fileName || '未命名文件',
          type: item.documentType === 'certificate' ? '资质证书' : item.documentType === 'declaration_of_conformity' || item.documentType === 'declaration' ? 'DoC声明文件' : item.documentType === 'manual' ? '使用说明书' : '其他文件',
          documentType: item.documentType || 'other',
          productId: item.productId || item.product_id || '',
          product: item.productName || '-',
          lang: item.language || '未设置',
          backup: item.backupStatus || '待备份',
          updatedAt: item.updatedAt || item.createdAt || '2026-06-25',
          fileUrl: item.filePath ? `/eu-doc${item.filePath}` : '',
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

  useEffect(() => {
    if (activeCompany && activePage === 'bulk-import') refreshImportItems();
  }, [activeCompany, activePage]);

  const uploadImportFiles = async (files) => {
    if (!activeCompany) {
      showAction('请先创建或选择公司');
      setCompanyModal({ open: true, mode: 'create', name: '', nameEn: '', contactEmail: '' });
      return;
    }
    if (!files?.length) return;
    const companyName = currentCompany?.name || '当前公司';
    if (!window.confirm(`确认把这 ${files.length} 个文件上传到「${companyName}」吗？`)) return;
    try {
      const result = await api.uploadImportFiles(activeCompany, files);
      showAction(result.message || `已上传 ${files.length} 个文件到 ${companyName}`);
      await refreshImportItems();
    } catch (error) {
      showAction(error.message || '批量导入失败');
    }
  };

  const deletePendingImportGroup = async (group) => {
    if (!window.confirm(`确认删除这 ${group.items.length} 个待整理文件吗？`)) return;
    try {
      await Promise.all(group.items.map((item) => api.deleteImportItem(item.id)));
      showAction('已删除待整理文件');
      await refreshImportItems();
    } catch (error) {
      showAction(error.message || '删除失败');
    }
  };

  const deleteDuplicateImportItems = async (group) => {
    const duplicates = group.items.filter((item) => item.isDuplicate);
    if (!duplicates.length) {
      showAction('这组没有可批量删除的重复文件');
      return;
    }
    if (!window.confirm(`确认只删除这 ${duplicates.length} 个后上传的重复文件吗？较早文件会保留。`)) return;
    try {
      await Promise.all(duplicates.map((item) => api.deleteImportItem(item.id)));
      showAction('已删除重复文件，较早文件已保留');
      await refreshImportItems();
    } catch (error) {
      showAction(error.message || '删除重复文件失败');
    }
  };

  const reopenImportItem = async (item) => {
    if (!window.confirm('确认撤回到待整理池重新整理吗？对应已归档文件会被标记删除。')) return;
    try {
      await api.reopenImportItem(item.id);
      showAction('已撤回到待整理池');
      await Promise.all([refreshImportItems(), refreshCompanyAssets()]);
    } catch (error) {
      showAction(error.message || '撤回失败');
    }
  };

  const deleteLinkedDocument = async (item) => {
    if (!item.documentId || !window.confirm('确认删除这个已归档文件吗？')) return;
    try {
      await api.deleteDocument(item.documentId);
      await api.reopenImportItem(item.id);
      await api.deleteImportItem(item.id);
      showAction('已删除归档文件');
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
    try {
      await api.organizeImportItem(item.id, {
        product_id: form.productId || '',
        new_product_name: form.newProductName || item.suggestedProductName || '',
        new_product_model: form.newProductModel || item.guessedModels || item.guessedModel || '',
        document_type: form.documentType || item.guessedType || 'other',
        title: form.title || item.originalName,
        language: form.language || item.guessedLanguage || 'en',
        cert_no: form.certNo || item.guessedCertNo || '',
        standard: form.standard || '',
        issuer: form.issuer || '',
      });
      showAction('文件已整理到产品资料');
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
    if (!itemsToOrganize.length) { showAction('这组只有重复文件，请先删除重复或拆分处理'); return; }
    const matchedProductId = Object.prototype.hasOwnProperty.call(form, 'productId') ? form.productId : findMatchingProductId(group, companyProducts);
    try {
      await api.organizeImportGroup({
        ids: itemsToOrganize.map((item) => item.id),
        product_id: matchedProductId || '',
        new_product_name: form.newProductName || group.suggestedName || '',
        new_product_model: [...splitImportModels(group.model).map((model, index) => form[`model_${index}`] || model), ...(form.extraModels || [])].map((model) => String(model || '').trim()).filter(Boolean).join(', ') || form.newProductModel || group.model || '',
        document_type: form.documentType || inferImportType(group.items[0], group.type),
        languages_by_id: Object.fromEntries(itemsToOrganize.map((item) => [String(item.id), form[`language_${item.id}`] || item.guessedLanguage || 'en'])),
        document_types_by_id: Object.fromEntries(itemsToOrganize.map((item) => [String(item.id), form[`documentType_${item.id}`] || form.documentType || inferImportType(item, group.type)])),
      });
      showAction('已按同一产品整理这些文件');
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
        name_en: companyForm.nameEn,
        slug: companyForm.slug,
        contact_email: companyForm.contactEmail,
        contact_phone: companyForm.contactPhone,
        website: companyForm.website,
        main_category: companyForm.mainCategory,
        address: companyForm.address,
        description: companyForm.description,
        public_visible: currentCompany.status === '已认证' && companyForm.publicVisible ? 1 : 0,
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
        name_en: companyModal.nameEn,
        contact_email: companyModal.contactEmail,
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
      category: item.categoryName || '其他 / 待分类',
      categoryPrimaryId: item.categoryPrimaryId || '',
      files: item.documentCount || 0,
      status: item.status === 'active' ? '公开' : item.status || '草稿',
      rawStatus: item.status || 'active',
      updatedAt: item.updatedAt || item.createdAt || '2026-06-25',
      description: item.description || '',
      nameEn: item.nameEn || '',
      descriptionEn: item.descriptionEn || '',
      imageUrl: item.imagePath ? `/eu-doc${item.imagePath}` : '',
    })));
    setCompanyDocuments((documentResponse.data || []).map((item) => ({
      id: item.id,
      name: item.title || item.fileName || '未命名文件',
      type: item.documentType === 'certificate' ? '资质证书' : item.documentType === 'declaration_of_conformity' ? 'DoC声明文件' : item.documentType === 'manual' ? '使用说明书' : '其他文件',
      product: item.productName || '-',
      productId: item.productId,
      documentType: item.documentType,
      lang: item.language || '未设置',
      backup: item.backupStatus || '待备份',
      updatedAt: item.updatedAt || item.createdAt || '2026-06-25',
      fileUrl: item.filePath ? `/eu-doc${item.filePath}` : '',
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
      name_en: productModal.nameEn.trim() || null,
      model: modelText,
      description: productModal.description.trim() || null,
      description_en: productModal.descriptionEn.trim() || null,
      category_primary_id: productModal.categoryPrimaryId || null,
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
        await api.createProduct({ company_id: activeCompany, ...payload });
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
      status: product?.rawStatus || (product?.status === '草稿' ? 'draft' : 'active'),
      description: product?.description || '',
      descriptionEn: product?.descriptionEn || '',
    });
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
        showAction('产品图已上传');
        await refreshCompanyAssets();
      } catch (error) {
        showAction(error.message || '产品图上传失败');
      }
    };
    input.click();
  };

  const uploadDocumentFile = async () => {
    setDocumentModal({ open: true, mode: 'upload', doc: null, title: '', productId: String(companyProducts[0]?.id || ''), documentType: 'certificate', language: 'en', certNo: '', standard: '', issuer: '', file: null });
  };

  const editDocumentInfo = async (doc) => {
    setDocumentModal({ open: true, mode: 'edit', doc, title: doc.name || '', productId: String(doc.productId || ''), documentType: doc.documentType || 'certificate', language: doc.lang || 'en', certNo: doc.certNo || '', standard: doc.standard || '', issuer: doc.issuer || '', file: null });
  };

  const submitDocumentModal = async () => {
    try {
      if (documentModal.mode === 'upload') {
        if (!documentModal.file) {
          showAction('请选择要上传的文件');
          return;
        }
        await api.createDocument({
          company_id: activeCompany,
          product_id: documentModal.productId,
          document_type: documentModal.documentType,
          title: documentModal.title,
          language: documentModal.language,
          file: documentModal.file,
          confirmed_authentic: '1',
          confirmed_authorized: '1',
          accepted_disclaimer: '1',
          cert_no: documentModal.certNo,
          standard: documentModal.standard,
          issuer: documentModal.issuer,
        });
        showAction('文件已上传');
      } else {
        await api.updateDocument(documentModal.doc.id, {
          title: documentModal.title,
          language: documentModal.language,
          cert_no: documentModal.certNo,
          standard: documentModal.standard,
          issuer: documentModal.issuer,
        });
        showAction('文件信息已更新');
      }
      setDocumentModal({ open: false, mode: 'upload', doc: null, title: '', productId: '', documentType: 'certificate', language: 'en', certNo: '', standard: '', issuer: '', file: null });
      await refreshCompanyAssets();
    } catch (error) {
      showAction(error.message || '文件保存失败');
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
        showAction('文件已替换');
        await refreshCompanyAssets();
      } catch (error) {
        showAction(error.message || '文件替换失败');
      }
    };
    input.click();
  };

  const pageTitle = useMemo(() => {
    const all = [...personalMenus, ...companyMenus, ...platformMenus];
    return all.find((item) => item.id === activePage)?.label || '后台 v2';
  }, [activePage]);

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
                <p>在产品、公司或文件详情页点击"收藏"按钮（星星图标）即可添加收藏。</p>
              </div>
            </div>

            <div className={styles.toolbar}>
              {['全部收藏', '公司', '产品', '文件', '已过期/下架提醒', '最近取消'].map((item) => (
                <button key={item} className={favoriteFilter === item ? styles.primaryBtn : styles.secondaryBtn} onClick={() => setFavoriteFilter(item)}>{item}</button>
              ))}
            </div>

            <div className={styles.favoriteGroupRow}>
              {['默认收藏', '常用供应商', '待采购', '重点产品'].map((group, index) => (
                <button key={group} className={index === 0 ? styles.groupActive : ''}>{group}</button>
              ))}
            </div>

            <div className={styles.collectionGrid}>
              {favoriteFilter === '最近取消' ? (
                // 显示最近取消的收藏
                recentlyDeletedItems.length > 0 ? recentlyDeletedItems.map(([type, title, meta, desc, note, status, id, itemId, deletedAt]) => (
                  <article key={id} className={styles.collectionCard} style={{opacity: 0.7}}>
                    <div className={styles.cardTopLine}>
                      <span>{type}</span>
                      <em className={styles.statusPending}>已取消</em>
                    </div>
                    <h3>{title}</h3>
                    <p>{meta}</p>
                    <em>{desc}</em>
                    {note && <div className={styles.favoriteNote}>备注：{note}</div>}
                    <div className={styles.favoriteNote} style={{color: '#999'}}>取消时间：{new Date(deletedAt).toLocaleString('zh-CN')}</div>
                    <div>
                      <button className={styles.primaryBtn} onClick={async () => {
                        try {
                          await api.addFavorite(type, itemId, title, meta, desc);
                          setRecentlyDeletedItems((items) => items.filter((item) => item[6] !== id));
                          showAction('已重新添加到收藏');
                          // 重新加载收藏列表
                          const data = await api.getPersonalOverview();
                          setFavoriteItems((data.favorites || []).map((item) => [
                            item.itemType, item.title, item.meta || '', item.description || '', item.note || '', item.status || '正常', item.id, item.itemId
                          ]));
                        } catch (error) {
                          showAction(error.message || '恢复收藏失败');
                        }
                      }}>恢复收藏</button>
                      <button className={styles.textDangerBtn} onClick={async () => {
                        if (!confirm('确定永久删除？此操作不可恢复。')) return;
                        try {
                          await api.permanentDeleteFavorite(id);
                          setRecentlyDeletedItems((items) => items.filter((item) => item[6] !== id));
                          showAction('已永久删除');
                        } catch (error) {
                          showAction(error.message || '删除失败');
                        }
                      }}>永久删除</button>
                    </div>
                  </article>
                )) : (
                  <div style={{padding: '40px', textAlign: 'center', color: '#999'}}>
                    <p>暂无最近取消的收藏</p>
                  </div>
                )
              ) : (
                // 显示正常收藏
                favoriteItems
                  .filter(([type, , , , , status]) => favoriteFilter === '全部收藏' || favoriteFilter === type || (favoriteFilter === '已过期/下架提醒' && status !== '正常'))
                  .map(([type, title, meta, desc, note, status, id, itemId]) => (
                  <article key={id || title} className={styles.collectionCard}>
                    <div className={styles.cardTopLine}>
                      <span>{type}</span>
                      <em className={status === '正常' ? styles.statusOk : styles.statusPending}>{status}</em>
                    </div>
                    <h3>{title}</h3>
                    <p>{meta}</p>
                    <em>{desc}</em>
                    {note && <div className={styles.favoriteNote}>备注：{note}</div>}
                    <div>
                      <button className={styles.secondaryBtn} onClick={() => {
                        if (type === '产品') {
                          navigate(`/eu-doc/products/${itemId}`);
                        } else if (type === '公司') {
                          navigate(`/eu-doc/company/${itemId}`);
                        } else if (type === '文件') {
                          navigate(`/eu-doc/certificate/${itemId}`);
                        }
                      }}>查看</button>
                      <button className={styles.secondaryBtn} onClick={async () => { const nextNote = window.prompt('请输入备注', note); if (nextNote === null) return; try { await api.updateFavoriteNote(id, nextNote); setFavoriteItems((items) => items.map((item) => item[6] === id ? [item[0], item[1], item[2], item[3], nextNote, item[5], item[6], item[7]] : item)); showAction('备注已保存'); } catch (error) { showAction(error.message || '备注保存失败'); } }}>编辑备注</button>
                      <button className={styles.textDangerBtn} onClick={async () => { try { await api.deleteFavorite(id); const deletedItem = favoriteItems.find((item) => item[6] === id); if (deletedItem) { setRecentlyDeletedItems((items) => [[...deletedItem, new Date().toISOString()], ...items]); } setFavoriteItems((items) => items.filter((item) => item[6] !== id)); showAction('收藏已取消，可在"最近取消"中恢复'); } catch (error) { showAction(error.message || '取消收藏失败'); } }}>取消收藏</button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </Section>
        );
      }

      if (activePage === 'history') {
        return (
          <Section title={t('admin.history.title')} desc={t('admin.history.desc')}>
            <div className={styles.historyHeaderPanel}>
              <div>
                <h3>最近浏览</h3>
                <p>历史记录可帮助你快速找回最近查看的资料。</p>
              </div>
              <div className={styles.historySwitchBox}>
                <span>记录浏览历史</span>
                <button className={historyEnabled ? styles.switchOn : styles.switchOff} onClick={async () => { const next = !historyEnabled; try { await api.updateHistorySetting(next); setHistoryEnabled(next); showAction(next ? '浏览历史已开启' : '浏览历史已关闭'); } catch (error) { showAction(error.message || '设置保存失败'); } }}>{historyEnabled ? '已开启' : '已关闭'}</button>
              </div>
            </div>

            <div className={styles.historyToolbar}>
              <input placeholder="搜索浏览历史" />
              <select defaultValue="all">
                <option value="all">全部类型</option>
                <option value="company">公司</option>
                <option value="product">产品</option>
                <option value="file">文件</option>
              </select>
              <select defaultValue="90d">
                <option value="7d">最近 7 天</option>
                <option value="30d">最近 30 天</option>
                <option value="90d">最近 90 天</option>
              </select>
              <button className={styles.textDangerBtn} onClick={async () => { try { await api.clearHistory(); setHistoryRows([]); showAction('浏览历史已清空'); } catch (error) { showAction(error.message || '清空历史失败'); } }}>清空历史</button>
            </div>

            <div className={styles.historyList}>
              {historyRows.map(([time, type, name, company, action]) => (
                <article key={`${time}-${name}`} className={styles.historyItem}>
                  <div className={styles.historyType}>{type}</div>
                  <div>
                    <h3>{name}</h3>
                    <p>{company}</p>
                  </div>
                  <span>{time}</span>
                  <button className={styles.secondaryBtn} onClick={() => showAction('真实跳转详情页待接入')}>{action} <span className={styles.todoBadge}>待完善</span></button>
                </article>
              ))}
            </div>

            <div className={styles.profileNote}>历史记录默认保留 90 天；后续可在账号隐私设置中关闭记录。</div>
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
              {['全部', '未读', '企业邀请', '文件更新', '举报处理', '系统公告'].map((item, index) => (
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
          <Section title="批量导入" desc="先把文件一股脑上传到待整理资料池，再慢慢关联到产品。">
            <div className={styles.importBlockedState}>
              <div className={styles.importBlurPreview}>
                <div />
                <div />
                <div />
              </div>
              <div className={styles.importBlockedCard}>
                <h3>请先创建或选择公司</h3>
                <p>批量导入的文件必须归属于某一家公司。请先创建公司，或者选择左侧已有公司后再上传。</p>
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
        <Section title="批量导入" desc="先把文件一股脑上传到待整理资料池，再慢慢关联到产品。">
          <div className={styles.importHero}>
            <div>
              <h3>低门槛上传入口</h3>
              <p>支持一次选择多个 PDF / 图片文件。系统会先按文件名猜测类型、语言、型号和证书编号。</p>
              <div className={styles.importStats}>
                <span><strong>{importItems.length}</strong>全部文件</span>
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
              <input ref={importInputRef} type="file" multiple accept="application/pdf,image/png,image/jpeg,image/webp" className={styles.hiddenInput} onChange={(event) => uploadImportFiles(event.target.files)} />
              <button className={styles.primaryBtn} onClick={() => importInputRef.current?.click()}>选择文件批量上传</button>
              <button className={styles.secondaryBtn} onClick={selectImportFolder}>上传整个文件夹</button>
              <button className={styles.secondaryBtn} onClick={refreshImportItems}>刷新列表</button>
            </div>
          </div>

          <div className={styles.importDropHint} onClick={() => importInputRef.current?.click()}>
            <strong>点击这里选择多个文件</strong>
            <p>支持多选文件或整个文件夹；会先做文件名识别、PDF文字层提取和规则识别，不产生AI费用。</p>
          </div>

          <div className={styles.importList}>
            {importItems.length === 0 ? <Placeholder title="暂无待整理资料" desc="上传文件后会显示在这里。" /> : (
              <>
                <div className={styles.importCardGrid}>
                  {importGroups.map((group) => {
                    const formKey = `group:${group.key}`;
                    const form = importSelection[formKey] || {};
                    const typeValue = form.documentType || inferImportType(group.items[0], group.type);
                    const confidence = getImportConfidence(group);
                    return (
                      <button key={group.key} className={`${styles.importMiniCard} ${group.isDuplicateGroup ? styles.importDuplicateCard : ''}`} onClick={() => group.isDuplicateGroup ? showAction('这是重复文件卡片，可直接删除重复文件') : setActiveImportGroupKey(group.key)}>
                        <div className={styles.importMiniTop}>
                          <span className={styles.fileTypeIcon}>{typeValue.slice(0, 3)}</span>
                          <span className={`${styles.confidenceDot} ${styles[confidence.tone]}`} />
                          {group.isDuplicateGroup && <span className={styles.duplicateBadge}>疑似重复</span>}
                        </div>
                        <strong>{group.model || group.suggestedName}</strong>
                        <p>{group.isDuplicateGroup ? `${group.items.length} 个重复文件` : `${group.items.length} 个文件`} · {group.languages.join(' / ')} · {group.items.some((item) => item.extractedTextStatus === 'pdf_text_layer') ? '已读PDF文字' : '文件名识别'}</p>
                        <div className={styles.importMiniFiles}>
                          {group.items.slice(0, 3).map((item) => <span key={item.id} className={styles.fileStackRow}>
                            <span className={styles.fileStackName}>{item.originalName}</span>
                            <span className={styles.fileStackBadges}><em className={group.isDuplicateGroup ? styles.fileDupTag : styles.fileKeepTag}>{group.isDuplicateGroup ? '重复' : '保留'}</em></span>
                          </span>)}
                          {group.items.length > 3 && <span>+{group.items.length - 3}</span>}
                        </div>
                        <em className={`${styles.duplicateReason} ${!group.isDuplicateGroup ? styles.normalCardHint : ''}`}>{group.isDuplicateGroup ? '这些是后上传的重复文件，删除它们不会影响正常卡片。' : '正常文件，可点击卡片继续编辑和归档。'}</em>
                        <span className={styles.importMiniDanger} onClick={(event) => { event.stopPropagation(); group.isDuplicateGroup ? deleteDuplicateImportItems(group) : deletePendingImportGroup(group); }}>{group.isDuplicateGroup ? '删除重复卡片' : '删除'}</span>
                      </button>
                    );
                  })}
                </div>

                {activeImportGroup && (() => {
                  const group = activeImportGroup;
                  const formKey = `group:${group.key}`;
                  const form = importSelection[formKey] || {};
                  const typeValue = form.documentType || inferImportType(group.items[0], group.type);
                  const recommendedProduct = findMatchingProduct(group, companyProducts);
                  const recommendedProductId = recommendedProduct ? String(recommendedProduct.id) : '';
                  const matchedProductId = Object.prototype.hasOwnProperty.call(form, 'productId') ? form.productId : recommendedProductId;
                  const hasSelectedProduct = Boolean(matchedProductId);
                  const confidence = getImportConfidence(group);
                  return (
                    <div className={styles.importModalBackdrop} onClick={() => setActiveImportGroupKey(null)}>
                      <div className={styles.importModal} onClick={(event) => event.stopPropagation()}>
                        <div className={styles.importModalHeader}>
                          <div>
                            <p>待整理文件</p>
                            <h3>{group.model || group.suggestedName}</h3>
                          </div>
                          <button className={styles.secondaryBtn} onClick={() => setActiveImportGroupKey(null)}>关闭</button>
                        </div>

                        <div className={styles.importGroupHeader}>
                          <div>
                            <div className={styles.importFileNameRow}>
                              {group.items.map((item) => <strong key={item.id}>{item.originalName}</strong>)}
                            </div>
                            <p className={styles.importGroupHint}>系统根据文件名和可读取的PDF文字判断它们可能属于同一个产品。</p>
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
                                <p>本次上传文件可能已经归档：{duplicate?.duplicateDocumentProduct || '已归档产品'} / {duplicate?.duplicateDocumentTitle || duplicate?.duplicateReason}</p>
                                <span>你可以批量删除后上传的重复文件，较早文件仍可继续编辑和归档。</span>
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
                              <h4>确认这些文件是否属于同一个产品</h4>
                              <p>如果属于同一个产品就继续；如果系统分错了，直接拆分成单文件整理。</p>
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
                                }}>{recommendedProduct && <option value={recommendedProductId}>{recommendedProduct.name} / {recommendedProduct.model}</option>}{companyProducts.filter((product) => String(product.id) !== recommendedProductId).map((product) => <option key={product.id} value={product.id}>{product.name} / {product.model}</option>)}<option value="">创建新产品</option></select>{recommendedProduct && <em className={styles.matchHint}>系统检测到该文件可能属于上方已选产品，建议优先关联，避免重复创建。</em>}</label>
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
                              <button className={styles.secondaryBtn} onClick={() => confirmImportStep(formKey, 2)}>{(form.confirmedStep || 0) >= 2 ? '已确认产品信息' : '确认产品信息'}</button>
                            </div>
                          </section>

                          <section id={`${formKey}-step-3`} className={importStepClass(styles, form.confirmedStep || 0, 3)}>
                            <div className={styles.questionIndex}>{(form.confirmedStep || 0) >= 3 ? '✓' : '3'}</div>
                            <div className={styles.questionBody}>
                              <h4>确认每个文件的类型和语言</h4>
                              <p>同一产品下，不同文件可以分别是证书、DoC 或说明书，也可以对应不同语言。</p>
                              <div className={styles.fileConfirmRows}>
                                {group.items.map((item) => <div key={item.id} className={styles.fileConfirmRow}>
                                  <strong>{item.originalName}{item.isDuplicate && <em className={styles.fileDupTag}>后上传重复</em>}</strong>
                                  <select value={form[`documentType_${item.id}`] || form.documentType || inferImportType(item, group.type)} onChange={(event) => setImportSelection((state) => ({ ...state, [formKey]: { ...form, [`documentType_${item.id}`]: event.target.value } }))}><option value="certificate">资质证书</option><option value="declaration_of_conformity">DoC声明文件</option><option value="manual">使用说明书</option><option value="other">其他文件</option></select>
                                  <select value={form[`language_${item.id}`] || item.guessedLanguage || 'en'} onChange={(event) => setImportSelection((state) => ({ ...state, [formKey]: { ...form, [`language_${item.id}`]: event.target.value } }))}><option value="en">英语 EN</option><option value="de">德语 DE</option><option value="zh">中文 ZH</option><option value="fr">法语 FR</option><option value="es">西语 ES</option><option value="it">意语 IT</option><option value="other">其他</option></select>
                                </div>)}
                              </div>
                              <button className={styles.secondaryBtn} onClick={() => confirmImportStep(formKey, 3)}>{(form.confirmedStep || 0) >= 3 ? '已确认文件信息' : '确认文件信息'}</button>
                            </div>
                          </section>

                          <section id={`${formKey}-step-4`} className={`${importStepClass(styles, form.confirmedStep || 0, 4)} ${styles.finalQuestion}`}>
                            <div className={styles.questionIndex}>4</div>
                            <div className={styles.questionBody}>
                              <h4>最终提交</h4>
                              <p>将{hasSelectedProduct ? '关联到已有产品' : '创建新产品'}，并归档 {group.items.filter((item) => !item.isDuplicate).length || group.items.length} 个保留文件。</p>
                              <div className={styles.finalActions}>
                                <button className={styles.primaryBtn} onClick={() => organizeImportGroup(group)}>确认提交归档</button>
                                {group.items.some((item) => item.isDuplicate) && <button className={styles.dangerSoftBtn} onClick={() => deleteDuplicateImportItems(group)}>只删除重复文件</button>}
                                <button className={styles.secondaryBtn} onClick={() => { showAction('已保留在待整理池，之后可继续处理'); setActiveImportGroupKey(null); }}>跳过整理，稍后处理</button>
                                <button className={styles.dangerSoftBtn} onClick={() => deletePendingImportGroup(group)}>删除整组文件</button>
                              </div>
                            </div>
                          </section>
                        </div>
                      </div>
                    </div>
                  );
                })()}

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
                        <p>{item.productName || '产品'} · {item.documentTitle || '文件'}</p>
                        <div className={styles.importMiniFiles}>
                          <span>点击可继续编辑文件信息</span>
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
                  <button className={styles.secondaryBtn} onClick={() => navigate(`/company/${activeCompany}`)}>预览公司主页</button>
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
          <Section title="产品资料" desc="按产品查看资料完整度，并直接管理该产品下的证书、DoC 和说明书。">
            <div className={styles.productHeaderPanel}>
              <div>
                <h3>产品总览</h3>
                <p>产品资料页负责回答：这个产品的资料是否完整、缺什么、已有文件在哪里。</p>
              </div>
              <div className={styles.headerActionsInline}>
                <button className={styles.secondaryBtn} onClick={() => openPage('import', 'bulk-import', activeCompany)}>批量导入</button>
                <button className={styles.primaryBtn} onClick={() => openProductModal()}>新增产品</button>
              </div>
            </div>

            <div className={styles.productTools}>
              <input placeholder="搜索产品名称、型号、文件名" />
              <select defaultValue="all"><option value="all">全部完整度</option><option value="complete">资料完整</option><option value="missing">资料缺失</option></select>
              <select defaultValue="all"><option value="all">全部分类</option><option value="helmet">个人防护用品 / 马术头盔</option><option value="other">其他 / 待分类</option></select>
            </div>

            <div className={styles.productOverviewGrid}>
              {companyProducts.map((product) => {
                const status = getProductFileStatus(product, companyDocuments);
                const models = splitImportModels(product.model);
                return (
                  <article key={product.id || product.model} className={styles.productOverviewCard}>
                    <div className={styles.productOverviewTop}>
                      <div className={styles.productThumb}>{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : '产品图'}</div>
                      <span className={status.missing.length ? styles.warnTag : styles.safeTag}>{status.label}</span>
                    </div>
                    <h3>{product.name}</h3>
                    <div className={styles.modelTagList}>{(models.length ? models : [product.model]).map((model) => <span key={model}>{model}</span>)}</div>
                    <div className={styles.fileCompletenessRow}>
                      <span className={status.hasCert ? styles.doneMini : styles.missMini}>证书</span>
                      <span className={status.hasDoc ? styles.doneMini : styles.missMini}>DoC</span>
                      <span className={status.hasManual ? styles.doneMini : styles.missMini}>说明书</span>
                    </div>
                    <div className={styles.productFileList}>
                      {status.productDocs.length ? status.productDocs.slice(0, 4).map((doc) => (
                        <button key={doc.id} onClick={() => editDocumentInfo(doc)}>
                          <strong>{doc.type}</strong><span>{doc.name}</span><em>{doc.lang}</em>
                        </button>
                      )) : <p>暂无文件，建议通过批量导入或文件管理上传。</p>}
                      {status.productDocs.length > 4 && <p>+{status.productDocs.length - 4} 个文件</p>}
                    </div>
                    <div className={styles.productActionsCompact}>
                      <button className={styles.secondaryBtn} onClick={() => openProductModal(product)}>编辑产品</button>
                      <button className={styles.secondaryBtn} onClick={() => uploadDocumentFile()}>添加文件</button>
                      <button className={styles.secondaryBtn} onClick={() => navigate(`/products/${product.id}`)}>预览</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </Section>
        );
      }

      if (activePage === 'files') {
        const fileTypeOptions = [
          ['all', '全部文件'],
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
          <Section title="文件管理" desc="这里是公司资料库：检查文件归属、语言、类型、证书信息，并处理替换和预览。">
            <div className={styles.fileOverviewGrid}>
              {[
                ['全部文件', companyDocuments.length, '当前公司已归档的全部文件'],
                ['资质证书', companyDocuments.filter((doc) => doc.documentType === 'certificate').length, '证明产品测试和认证状态'],
                ['DoC声明文件', companyDocuments.filter((doc) => doc.documentType === 'declaration_of_conformity').length, '供审核机构查看合规声明'],
                ['使用说明书', companyDocuments.filter((doc) => doc.documentType === 'manual').length, '帮助用户了解产品使用方式'],
                ['未绑定产品', companyDocuments.filter((doc) => !doc.productId).length, '这些文件前台产品页可能看不到'],
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
                <button className={styles.primaryBtn} onClick={uploadDocumentFile}>上传文件</button>
              </div>
            </div>

            <div className={`${styles.productTools} ${styles.fileFilterTools}`}>
              <input value={fileFilters.query} onChange={(event) => setFileFilters((form) => ({ ...form, query: event.target.value }))} placeholder="搜索文件名、产品、证书编号、标准" />
              <select value={fileFilters.product} onChange={(event) => setFileFilters((form) => ({ ...form, product: event.target.value }))}><option value="all">全部产品</option>{companyProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
              <select value={fileFilters.language} onChange={(event) => setFileFilters((form) => ({ ...form, language: event.target.value }))}><option value="all">全部语言</option>{uniqueLanguages.map((lang) => <option key={lang} value={lang}>{lang}</option>)}</select>
              <select value={fileFilters.status} onChange={(event) => setFileFilters((form) => ({ ...form, status: event.target.value }))}><option value="all">全部状态</option><option value="正常">正常</option><option value="待完善">待完善</option><option value="未绑定产品">未绑定产品</option></select>
            </div>

            <div className={styles.fileTableHeader}>
              <span>文件</span><span>归属产品</span><span>关键信息</span><span>状态</span><span>操作</span>
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
                      <button className={styles.secondaryBtn} onClick={() => doc.fileUrl ? window.open(doc.fileUrl, '_blank') : showAction('该文件暂无可预览地址')}>预览</button>
                      <button className={styles.secondaryBtn} onClick={() => editDocumentInfo(doc)}>编辑</button>
                      <button className={styles.secondaryBtn} onClick={() => replaceFile(doc)}>替换</button>
                    </div>
                  </article>
                );
              }) : <div className={styles.emptyState}>没有符合筛选条件的文件。</div>}
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
                ['文件上传员', '1'],
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
                  <option value="uploader">文件上传员</option>
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
                  ['文件上传员', 'U-000256', 'upload@example.com', '文件上传员', '待接受邀请', '文件上传'],
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
        return (
          <Section title={t('admin.verification.title')} desc={t('admin.verification.desc')}>
            <div className={styles.verifyHero}>
              <div>
                <span className={styles.verifyBadge}>当前状态：已认证</span>
                <h3>{currentCompany.name}</h3>
                <p>企业认证用于证明你有权管理该公司，并对上传资料的真实性负责。</p>
              </div>
              <button className={styles.secondaryBtn}>查看认证记录</button>
            </div>

            <div className={styles.verifySteps}>
              {[
                ['1', '填写企业资料', '公司名称、联系方式、地址等基础资料。', '已完成'],
                ['2', '上传资质文件', '营业执照、法人证明或授权书。', '已完成'],
                ['3', '平台审核', '平台管理员核对资料真实性。', '已完成'],
                ['4', '认证通过', '公司主页展示认证状态。', '已完成'],
              ].map(([num, title, desc, status]) => (
                <div key={num} className={styles.verifyStepCard}>
                  <strong>{num}</strong>
                  <div>
                    <h4>{title}</h4>
                    <p>{desc}</p>
                  </div>
                  <span>{status}</span>
                </div>
              ))}
            </div>

            <div className={styles.verifyContentGrid}>
              <div className={styles.verifyFormCard}>
                <div className={styles.formHeader}>
                  <div>
                    <h3>认证资料</h3>
                    <p>如果公司信息变化，后续可重新提交认证。</p>
                  </div>
                  <button className={styles.primaryBtn}>重新提交认证</button>
                </div>
                <div className={styles.editGrid}>
                  <label>
                    <span>认证公司名称</span>
                    <input value={companyForm.nameEn} onChange={(event) => setCompanyForm((form) => ({ ...form, nameEn: event.target.value }))} placeholder="例如：Guangzhou Safety Equipment Co., Ltd." />
                  </label>
                  <label>
                    <span>统一社会信用代码 / 注册号</span>
                    <input placeholder="后续填写企业注册编号" />
                  </label>
                  <label>
                    <span>法人 / 负责人姓名</span>
                    <input value={profileForm.realName} onChange={(event) => setProfileForm((form) => ({ ...form, realName: event.target.value }))} placeholder="例如：张三" />
                  </label>
                  <label>
                    <span>联系邮箱</span>
                    <input placeholder="verification@example.com" />
                  </label>
                </div>
              </div>

              <div className={styles.verifyUploadCard}>
                <h3>资质文件</h3>
                <div className={styles.uploadRows}>
                  {[
                    ['营业执照 / 注册文件', '已上传'],
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
        const planFeatures = [
          ['最多 50 个产品', true, true, true, true],
          ['2GB 文件存储', true, true, true, true],
          ['5 名员工', true, true, true, true],
          ['基础资料展示', true, true, true, true],
          ['自定义公司网址', false, true, true, true],
          ['基础数据统计', false, true, true, true],
          ['批量上传', false, false, true, true],
          ['文件版本管理', false, false, true, true],
          ['缺失资料提醒', false, false, true, true],
          ['高级权限管理', false, false, false, true],
          ['专属支持', false, false, false, true],
          ['企业级数据统计', false, false, false, true],
        ];

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
                  ['产品数量', '47 / 50', '94%', '接近上限'],
                  ['文件存储', '1.2GB / 2GB', '60%', '正常'],
                  ['员工数量', '3 / 5', '60%', '正常'],
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
              {[
                ['免费版', '0/年', '当前套餐', [true, true, true, true, false, false, false, false]],
                ['基础版', '99/年', '适合小企业', [true, true, true, true, true, true, false, false]],
                ['专业版', '999/年', '推荐', [true, true, true, true, true, true, true, false]],
                ['企业版', '9999/年', '高级权益', [true, true, true, true, true, true, true, true]],
              ].map(([name, price, tag, enabled]) => {
                const benefits = ['产品资料展示', '文件存储', '员工席位', '基础资料展示', '自定义公司网址', '数据统计', '批量上传 / 版本管理', '高级权限 / 专属支持'];
                return (
                  <article key={name} className={`${styles.planFlagCard} ${tag === '推荐' ? styles.recommendedPlan : ''}`}>
                    <div className={styles.planRibbon}>{tag}</div>
                    <h3>{name}</h3>
                    <strong>{price}</strong>
                    <ul>
                      {benefits.map((benefit, index) => (
                        <li key={benefit} className={enabled[index] ? styles.benefitOn : styles.benefitOff}>
                          <span>{enabled[index] ? '✓' : '—'}</span>{benefit}
                        </li>
                      ))}
                    </ul>
                    <div className={styles.planFoot}>{name === '免费版' ? '正在使用' : '后续开放'}</div>
                  </article>
                );
              })}
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
                ['文件操作', '6', '上传 / 替换'],
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
                <option value="file">文件管理</option>
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
                ['今天 15:42', 'admin', '上传文件', '为 Equestrian Helmet F20 上传 DoC 声明文件', '文件管理'],
                ['今天 14:18', '质量部成员', '编辑产品', '修改产品 F20-201AL 的适用型号', '产品资料'],
                ['昨天 20:05', 'admin', '修改权限', '将 quality@example.com 设置为产品编辑', '员工权限'],
                ['昨天 18:30', '文件上传员', '替换文件', '替换 CE Certificate - F20 文件版本', '文件管理'],
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

    if (activePage === 'company-review') {
      return (
        <Section title={t('admin.companyReview.title')} desc={t('admin.companyReview.desc')}>
          <div className={styles.reviewSummaryGrid}>
            {[
              ['待审核', '6', '需要平台处理'],
              ['已通过', '28', '认证成功企业'],
              ['已拒绝', '3', '资料不完整或不通过'],
              ['需补充', '2', '等待企业重新提交'],
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
            <select defaultValue="pending">
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
              <option value="needs_more">需补充材料</option>
              <option value="all">全部状态</option>
            </select>
            <select defaultValue="newest">
              <option value="newest">最新提交</option>
              <option value="oldest">最早提交</option>
              <option value="risk">风险优先</option>
            </select>
          </div>

          <div className={styles.reviewList}>
            {[
              ['Guangzhou Safety Equipment Co., Ltd.', 'c-8f3k29', 'admin@legacy.local', '营业执照、授权书', '待审核', '今天 15:20'],
              ['EU Riding Gear GmbH', 'c-2m7q91', 'owner@example.com', '注册文件、法人证明', '需补充', '昨天 18:45'],
              ['New Safety Products Ltd.', 'c-9x1p02', 'contact@example.com', '营业执照', '待审核', '昨天 11:12'],
            ].map(([company, code, applicant, files, status, time]) => (
              <article key={code} className={styles.reviewCard}>
                <div className={styles.reviewCompanyBlock}>
                  <h3>{company}</h3>
                  <p>{code}</p>
                </div>
                <div className={styles.reviewInfoGrid}>
                  <span><strong>申请人</strong><em>{applicant}</em></span>
                  <span><strong>提交材料</strong><em>{files}</em></span>
                  <span><strong>提交时间</strong><em>{time}</em></span>
                  <span><strong>审核状态</strong><em className={status === '待审核' ? styles.reviewStatusPending : status === '需补充' ? styles.reviewStatusMore : status === '已通过' ? styles.reviewStatusPass : status === '已拒绝' ? styles.reviewStatusReject : styles.statusMuted}>{status}</em></span>
                </div>
                <div className={styles.reviewActions}>
                  <button className={styles.primaryBtn}>查看材料</button>
                  <button className={styles.secondaryBtn}>通过</button>
                  <button className={styles.secondaryBtn}>要求补充材料</button>
                  <button className={styles.reviewRejectBtn}>拒绝</button>
                </div>
              </article>
            ))}
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
        <Section title="举报处理" desc="处理用户提交的错误、虚假资料、侵权和过期文件举报。">
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
            <input placeholder="搜索举报对象、公司、产品、文件" />
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
              <option value="expired">文件过期</option>
              <option value="copyright">侵权</option>
            </select>
          </div>

          <div className={styles.reportList}>
            {[
              ['疑似虚假证书', 'CE Certificate - F20', '高风险', '用户反馈证书编号与文件内容不一致', '待处理'],
              ['文件过期', 'Declaration of Conformity', '普通', 'DoC 文件可能不是最新版本', '处理中'],
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
            <p>平台公告、联系方式、帮助入口等可以由管理员维护；文件限制、备份、安全策略等属于基础规则，只展示给管理员查看，不能在后台随意修改。</p>
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
                  <input placeholder="support@example.com" />
                </label>
                <label>
                  <span>帮助中心链接</span>
                  <input placeholder="https://..." />
                </label>
                <label>
                  <span>入驻咨询联系方式</span>
                  <input placeholder="邮箱 / 电话 / 表单链接" />
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
              <h3>只读：文件与存储规则</h3>
              <div className={styles.settingRows}>
                {[
                  ['单文件大小限制', '由系统配置决定'],
                  ['允许文件类型', 'PDF / JPG / PNG 等'],
                  ['文件备份策略', '服务器 / 对象存储 / 定时备份'],
                  ['文件安全扫描', '后续接入'],
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
      return (
        <Section title="分类管理" desc="维护产品分类体系，分类应存在数据库中，后续可随业务增长扩展。">
          <div className={styles.categoryHeaderPanel}>
            <div>
              <h3>分类体系</h3>
              <p>建议采用“少量一级分类 + 可扩展二级分类”，避免早期分类过细。</p>
            </div>
            <button className={styles.primaryBtn}>新增分类</button>
          </div>

          <div className={styles.categoryTools}>
            <input placeholder="搜索分类名称" />
            <select defaultValue="all">
              <option value="all">全部状态</option>
              <option value="active">启用</option>
              <option value="disabled">停用</option>
            </select>
            <button className={styles.secondaryBtn}>调整排序</button>
          </div>

          <div className={styles.categoryTreeList}>
            {[
              ['个人防护用品', '启用', '47', ['马术头盔', '自行车头盔', '安全帽', '护具', '防护眼镜', '防护手套', '防护服']],
              ['电子电器', '启用', '0', ['小家电', '电池', '充电器', '电源适配器', '照明设备', '音视频设备', '信息技术设备']],
              ['玩具儿童用品', '启用', '0', ['儿童玩具', '婴幼儿用品', '儿童家具', '儿童推车', '儿童安全座椅']],
              ['机械设备', '启用', '0', ['工业设备', '工具设备', '升降设备', '压力设备', '农业机械', '自动化设备']],
              ['医疗健康', '启用', '0', ['医疗器械', '健康护理用品', '个人健康监测', '康复辅助设备']],
              ['建筑材料', '启用', '0', ['建筑五金', '装饰材料', '保温材料', '门窗产品', '消防材料']],
              ['交通工具及配件', '启用', '0', ['自行车', '电动车', '汽车配件', '摩托车配件', '铁路相关产品']],
              ['纺织服装', '启用', '0', ['服装', '鞋类', '箱包', '纺织面料', '儿童服饰']],
              ['食品接触材料', '启用', '0', ['餐具', '厨具', '食品包装', '饮水容器']],
              ['化学品及材料', '启用', '0', ['塑料材料', '橡胶材料', '涂料', '胶粘剂', '清洁用品']],
              ['认证标准标签', '预留', '0', ['CE', 'UKCA', 'RoHS', 'REACH', 'EN 1384', 'EN 1078', 'EN 71', 'EN IEC 62368']],
              ['其他 / 待分类', '启用', '0', ['待分类']],
            ].map(([parent, status, count, children]) => (
              <article key={parent} className={styles.categoryTreeCard}>
                <div className={styles.categoryParentRow}>
                  <div>
                    <h3>{parent}</h3>
                    <p>{count} 个产品 · {status}</p>
                  </div>
                  <div className={styles.categoryActions}>
                    <button className={styles.secondaryBtn}>新增二级</button>
                    <button className={styles.secondaryBtn}>编辑</button>
                  </div>
                </div>
                <div className={styles.categoryChildren}>
                  {children.map((child) => (
                    <span key={child}>{child}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Section>
      );
    }

    return <Placeholder title={pageTitle} desc="平台管理员功能入口，后续接入真实审核、用户、举报和系统设置数据。" />;
  };

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
              <span>批量导入</span>
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
          {renderContent()}





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
                  <section className={styles.productEditBlock}>
                    <div className={styles.productEditBlockTitle}>基础信息</div>
                    <div className={styles.modalFormGrid}>
                      <label><span>产品/系列名称</span><input value={productModal.name} onChange={(event) => setProductModal((form) => ({ ...form, name: event.target.value }))} placeholder="例如 Equestrian Helmet F20" /></label>
                      <label><span>英文名称（可选）</span><input value={productModal.nameEn} onChange={(event) => setProductModal((form) => ({ ...form, nameEn: event.target.value }))} placeholder="用于多语言页面" /></label>
                      <label><span>产品分类</span><select value={productModal.categoryPrimaryId} onChange={(event) => setProductModal((form) => ({ ...form, categoryPrimaryId: event.target.value }))}><option value="">其他 / 待分类</option><option value="1">个人防护用品</option><option value="2">电子电器</option><option value="3">玩具儿童用品</option><option value="4">机械设备</option><option value="5">医疗健康</option><option value="6">建筑材料</option><option value="7">交通工具</option></select></label>
                      <label><span>展示状态</span><select value={productModal.status} onChange={(event) => setProductModal((form) => ({ ...form, status: event.target.value }))}><option value="active">公开展示</option><option value="draft">草稿 / 待完善</option><option value="inactive">暂不公开</option></select></label>
                    </div>
                  </section>

                  <section className={styles.productEditBlock}>
                    <div className={styles.productEditBlockTitle}>适用型号</div>
                    <p className={styles.productEditHint}>一个产品系列可以包含多个型号；每个型号单独成框，避免后续证书和文件归档混乱。</p>
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
                          <button key={doc.id} onClick={() => editDocumentInfo(doc)}><strong>{doc.type}</strong><span>{doc.name}</span><em>{doc.lang}</em></button>
                        )) : <p>这个产品还没有绑定文件，可通过“添加文件”或“批量导入”补充。</p>}
                      </div>
                      <div className={styles.productEditInlineActions}>
                        <button className={styles.secondaryBtn} onClick={() => uploadProductImageFile(productModal.product)}>上传/替换产品图</button>
                        <button className={styles.secondaryBtn} onClick={uploadDocumentFile}>添加文件</button>
                        <button className={styles.secondaryBtn} onClick={() => openPage('import', 'bulk-import', activeCompany)}>批量导入</button>
                      </div>
                    </section>
                  )}
                </div>

                <div className={styles.modalActions}>
                  <button className={styles.secondaryBtn} onClick={closeProductModal}>取消</button>
                  <button className={styles.primaryBtn} onClick={createOrEditProduct}>保存产品</button>
                </div>
              </div>
            </div>
          )}

          {documentModal.open && (
            <div className={styles.modalBackdrop} onClick={() => setDocumentModal({ open: false, mode: 'upload', doc: null, title: '', productId: '', documentType: 'certificate', language: 'en', certNo: '', standard: '', issuer: '', file: null })}>
              <div className={styles.adminModal} onClick={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <div>
                    <h3>{documentModal.mode === 'upload' ? '上传文件' : '编辑文件'}</h3>
                    <p>资质证书、DoC 声明和使用说明书都可以在这里维护。</p>
                  </div>
                  <button className={styles.iconCloseBtn} onClick={() => setDocumentModal({ open: false, mode: 'upload', doc: null, title: '', productId: '', documentType: 'certificate', language: 'en', certNo: '', standard: '', issuer: '', file: null })}>×</button>
                </div>
                <div className={styles.modalFormGrid}>
                  <label><span>文件标题</span><input value={documentModal.title} onChange={(event) => setDocumentModal((form) => ({ ...form, title: event.target.value }))} /></label>
                  <label><span>绑定产品</span><select value={documentModal.productId} onChange={(event) => setDocumentModal((form) => ({ ...form, productId: event.target.value }))}>{companyProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                  <label><span>文件类型</span><select value={documentModal.documentType} onChange={(event) => setDocumentModal((form) => ({ ...form, documentType: event.target.value }))}><option value="certificate">资质证书</option><option value="declaration_of_conformity">DoC声明文件</option><option value="manual">使用说明书</option><option value="other">其他文件</option></select></label>
                  <label><span>语言</span><input value={documentModal.language} onChange={(event) => setDocumentModal((form) => ({ ...form, language: event.target.value }))} /></label>
                  {documentModal.documentType === 'certificate' && <label><span>证书编号</span><input value={documentModal.certNo} onChange={(event) => setDocumentModal((form) => ({ ...form, certNo: event.target.value }))} /></label>}
                  {documentModal.documentType === 'certificate' && <label><span>认证标准</span><input value={documentModal.standard} onChange={(event) => setDocumentModal((form) => ({ ...form, standard: event.target.value }))} /></label>}
                  {documentModal.documentType === 'certificate' && <label><span>发证机构</span><input value={documentModal.issuer} onChange={(event) => setDocumentModal((form) => ({ ...form, issuer: event.target.value }))} /></label>}
                  {documentModal.mode === 'upload' && <label className={styles.fullField}><span>选择文件</span><input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setDocumentModal((form) => ({ ...form, file: event.target.files?.[0] || null }))} /></label>}
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.secondaryBtn} onClick={() => setDocumentModal({ open: false, mode: 'upload', doc: null, title: '', productId: '', documentType: 'certificate', language: 'en', certNo: '', standard: '', issuer: '', file: null })}>取消</button>
                  <button className={styles.primaryBtn} onClick={submitDocumentModal}>{documentModal.mode === 'upload' ? '上传文件' : '保存文件'}</button>
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
