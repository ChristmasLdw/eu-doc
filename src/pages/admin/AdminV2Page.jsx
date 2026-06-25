import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';
import * as api from '../../services/api';
import styles from './AdminV2Page.module.css';

const fallbackCompanies = [
  { id: 'company-a', name: 'Guangzhou Safety Equipment Co., Ltd.', code: 'c-8f3k29', status: '已认证' },
  { id: 'company-b', name: 'EU Riding Gear GmbH', code: 'c-2m7q91', status: '审核中' },
];

const personalMenus = [
  { id: 'profile', label: '个人资料' },
  { id: 'security', label: '账号安全' },
  { id: 'favorites', label: '我的收藏' },
  { id: 'history', label: '浏览历史' },
  { id: 'notifications', label: '消息通知' },
];

const companyMenus = [
  { id: 'company-info', label: '公司资料' },
  { id: 'products', label: '产品资料' },
  { id: 'files', label: '文件管理' },
  { id: 'members', label: '员工权限' },
  { id: 'verification', label: '企业认证' },
  { id: 'plans', label: '会员套餐' },
  { id: 'logs', label: '操作记录' },
];

const platformMenus = [
  { id: 'company-review', label: '企业审核' },
  { id: 'users', label: '用户查询与风控' },
  { id: 'categories', label: '分类管理' },
  { id: 'reports', label: '举报处理' },
  { id: 'system', label: '平台设置' },
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


function MenuIcon({ type }) {
  const paths = {
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
  const navigate = useNavigate();
  const { admin, logout } = useAdmin();
  const [activeGroup, setActiveGroup] = useState('personal');
  const [companies, setCompanies] = useState(fallbackCompanies);
  const [activeCompany, setActiveCompany] = useState(fallbackCompanies[0].id);
  const [expandedCompanies, setExpandedCompanies] = useState([fallbackCompanies[0].id]);
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
  const [productModal, setProductModal] = useState({ open: false, product: null, name: '', model: '', description: '' });
  const [documentModal, setDocumentModal] = useState({ open: false, mode: 'upload', doc: null, title: '', productId: '', documentType: 'certificate', language: 'en', certNo: '', standard: '', issuer: '', file: null });
  const [passwordModal, setPasswordModal] = useState({ open: false, oldPassword: '', newPassword: '', confirmPassword: '' });
  const [companyModal, setCompanyModal] = useState({ open: false, mode: 'create', name: '', nameEn: '', contactEmail: '' });
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
    () => companies.find((company) => company.id === activeCompany) || companies[0],
    [activeCompany, companies]
  );

  useEffect(() => {
    api.getMyCompanies()
      .then((items) => {
        if (!items.length) return;
        const mappedCompanies = items.map((company) => ({
          id: company.id,
          name: company.name,
          code: `c-${String(company.id).padStart(6, '0')}`,
          status: company.verificationStatus === 'verified' ? '已认证' : '待认证',
          memberRole: company.memberRole || 'owner',
        }));
        setCompanies(mappedCompanies);
        setActiveCompany((current) => mappedCompanies.some((company) => company.id === current) ? current : mappedCompanies[0].id);
        setExpandedCompanies((current) => current.length ? current : [mappedCompanies[0].id]);
      })
      .catch(() => {
        if (Array.isArray(admin?.companies) && admin.companies.length > 0) {
          const mappedCompanies = admin.companies.map((company) => ({
            id: company.id,
            name: company.name,
            code: `c-${String(company.id).padStart(6, '0')}`,
            status: '已认证',
            memberRole: company.member_role || company.memberRole || 'owner',
          }));
          setCompanies(mappedCompanies);
          setActiveCompany(mappedCompanies[0].id);
          setExpandedCompanies((current) => current.length ? current : [mappedCompanies[0].id]);
        }
      });
  }, [admin?.companies]);

  useEffect(() => {
    if (!activeCompany || Number.isNaN(Number(activeCompany))) return undefined;
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
          files: item.documentCount || 0,
          status: item.status === 'active' ? '公开' : item.status || '草稿',
          updatedAt: item.updatedAt || item.createdAt || '2026-06-25',
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
          type: item.documentType === 'certificate' ? '资质证书' : item.documentType === 'declaration' ? 'DoC声明文件' : item.documentType === 'manual' ? '使用说明书' : '其他文件',
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

  const openPage = (group, pageId, companyId) => {
    setActiveGroup(group);
    setActivePage(pageId);
    if (companyId) setActiveCompany(companyId);
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
      files: item.documentCount || 0,
      status: item.status === 'active' ? '公开' : item.status || '草稿',
      updatedAt: item.updatedAt || item.createdAt || '2026-06-25',
      description: item.description || '',
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

  const createOrEditProduct = async (product = null) => {
    try {
      if (productModal.product?.id) {
        await api.updateProduct(productModal.product.id, { name: productModal.name, model: productModal.model, description: productModal.description, status: 'active' });
        showAction('产品已更新');
      } else {
        await api.createProduct({ company_id: activeCompany, name: productModal.name, model: productModal.model, description: productModal.description, status: 'active' });
        showAction('产品已新增');
      }
      setProductModal({ open: false, product: null, name: '', model: '', description: '' });
      await refreshCompanyAssets();
    } catch (error) {
      showAction(error.message || '产品保存失败');
    }
  };

  const openProductModal = (product = null) => {
    setProductModal({
      open: true,
      product,
      name: product?.name || '',
      model: product?.model || '',
      description: product?.description || '',
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
          <Section title="个人资料" desc="管理你的公开展示信息和协作身份信息。">
            <div className={styles.profileLayout}>
              <aside className={styles.profileSummary}>
                <div className={styles.avatarLarge}>
                  {avatarUrl ? <img src={avatarUrl} alt="头像" /> : (profileForm.displayName || admin?.display_name || admin?.username || 'A').slice(0, 1).toUpperCase()}
                </div>
                <h3>{profileForm.displayName || admin?.display_name || admin?.username || 'admin'}</h3>
                <p>{admin?.email || 'admin@legacy.local'}</p>
                <div className={styles.userCodeBox}>
                  <span>用户编号</span>
                  <strong>{userCode}</strong>
                  <button type="button" onClick={copyUserCode}>复制编号</button>
                </div>
              </aside>

              <div className={styles.profileFormCard}>
                <div className={styles.formHeader}>
                  <div>
                    <h3>基础信息</h3>
                    <p>这些信息用于后台协作、企业成员识别和个人展示。</p>
                  </div>
                  <>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className={styles.hiddenInput}
                      onChange={(event) => uploadAvatar(event.target.files?.[0])}
                    />
                    <button className={styles.secondaryBtn} onClick={() => avatarInputRef.current?.click()}>上传头像</button>
                  </>
                </div>

                <div className={styles.editGrid}>
                  <label>
                    <span>昵称 / 显示名称</span>
                    <input value={profileForm.displayName} onChange={(event) => setProfileForm((form) => ({ ...form, displayName: event.target.value }))} />
                  </label>
                  <label>
                    <span>真实姓名（可选）</span>
                    <input value={profileForm.realName} onChange={(event) => setProfileForm((form) => ({ ...form, realName: event.target.value }))} placeholder="例如：张三" />
                  </label>
                  <label>
                    <span>职位（可选）</span>
                    <input value={profileForm.position} onChange={(event) => setProfileForm((form) => ({ ...form, position: event.target.value }))} placeholder="例如：认证资料负责人" />
                  </label>
                  <label>
                    <span>所属部门（可选）</span>
                    <input value={profileForm.department} onChange={(event) => setProfileForm((form) => ({ ...form, department: event.target.value }))} placeholder="例如：质量部 / 法务部" />
                  </label>
                  <label className={styles.fullField}>
                    <span>个人简介（可选）</span>
                    <textarea value={profileForm.bio} onChange={(event) => setProfileForm((form) => ({ ...form, bio: event.target.value }))} placeholder="简单说明你的职责，方便公司成员识别。" rows="4" />
                  </label>
                </div>

                <div className={styles.profileNote}>
                  登录邮箱、手机号、更换绑定、修改密码等安全信息，请到「账号安全」中管理。
                </div>

                <div className={styles.formActions}>
                  <button className={styles.secondaryBtn} onClick={() => showAction('如需恢复，请刷新页面重新读取已保存资料')}>取消</button>
                  <button className={styles.primaryBtn} onClick={saveProfile}>保存修改</button>
                </div>
              </div>
            </div>
          </Section>
        );
      }

      if (activePage === 'security') {
        return (
          <Section title="账号安全" desc="管理登录方式、密码、验证方式和登录设备。">
            <div className={styles.securityGrid}>
              <div className={styles.securityCard}>
                <div className={styles.securityIcon}>@</div>
                <div>
                  <h3>登录邮箱</h3>
                  <p>{admin?.email || 'admin@legacy.local'}</p>
                  <span className={styles.safeTag}>已绑定</span>
                </div>
                <button className={styles.secondaryBtn} onClick={() => showAction('更换邮箱需要邮件验证服务，已标记待完善')}>更换邮箱 <span className={styles.todoBadge}>待完善</span></button>
              </div>

              <div className={styles.securityCard}>
                <div className={styles.securityIcon}>☎</div>
                <div>
                  <h3>登录手机号</h3>
                  <p>绑定手机号后，可用于登录和找回账号。</p>
                  <span className={styles.warnTag}>未绑定</span>
                </div>
                <button className={styles.primaryBtn} onClick={() => showAction('绑定手机号需要短信验证服务，已标记待完善')}>绑定手机号 <span className={styles.todoBadgeLight}>待完善</span></button>
              </div>

              <div className={styles.securityCard}>
                <div className={styles.securityIcon}>⌘</div>
                <div>
                  <h3>登录密码</h3>
                  <p>建议定期修改密码，避免多个网站使用同一密码。</p>
                  <span className={styles.safeTag}>已设置</span>
                </div>
                <button className={styles.secondaryBtn} onClick={() => setPasswordModal({ open: true, oldPassword: '', newPassword: '', confirmPassword: '' })}>修改密码</button>
              </div>

              <div className={styles.securityCard}>
                <div className={styles.securityIcon}>2F</div>
                <div>
                  <h3>两步验证</h3>
                  <p>开启后，登录时需要额外验证，账号会更安全。</p>
                  <span className={styles.warnTag}>未开启</span>
                </div>
                <button className={styles.secondaryBtn} onClick={() => showAction('两步验证需要验证码/验证器流程，已标记待完善')}>开启验证 <span className={styles.todoBadge}>待完善</span></button>
              </div>
            </div>

            <div className={styles.securityPanel}>
              <div className={styles.formHeader}>
                <div>
                  <h3>最近登录记录</h3>
                  <p>如果发现异常登录，请立即修改密码并退出其他设备。</p>
                </div>
                <button className={styles.secondaryBtn} onClick={revokeSessions}>退出其他设备</button>
              </div>
              <DataTable
                columns={['时间', '设备', '位置', 'IP', '状态']}
                rows={(loginRecords.length ? loginRecords : [{ createdAt: '刚刚', ipAddress: '127.0.0.1' }]).map((record, index) => [
                  record.createdAt || record.created_at || '刚刚',
                  index === 0 ? '当前浏览器' : '历史设备',
                  '位置待识别',
                  record.ipAddress || record.ip_address || '-',
                  index === 0 ? '当前登录' : '正常',
                ])}
              />
            </div>
          </Section>
        );
      }

      if (activePage === 'favorites') {
        return (
          <Section title="我的收藏" desc="保存常用公司、产品和文件，方便后续快速查看。">
            <div className={styles.favoriteTopBar}>
              <div>
                <h3>收藏夹</h3>
                <p>可以按用途分组，并给收藏内容添加备注。</p>
              </div>
              <button className={styles.secondaryBtn} onClick={() => showAction('收藏分组功能后续再做，当前先完成收藏列表保存')}>新建分组 <span className={styles.todoBadge}>待完善</span></button>
            </div>

            <div className={styles.toolbar}>
              {['全部收藏', '公司', '产品', '文件', '已过期/下架提醒'].map((item) => (
                <button key={item} className={favoriteFilter === item ? styles.primaryBtn : styles.secondaryBtn} onClick={() => setFavoriteFilter(item)}>{item}</button>
              ))}
            </div>

            <div className={styles.favoriteGroupRow}>
              {['默认收藏', '常用供应商', '待采购', '重点产品'].map((group, index) => (
                <button key={group} className={index === 0 ? styles.groupActive : ''}>{group}</button>
              ))}
            </div>

            <div className={styles.collectionGrid}>
              {favoriteItems
                .filter(([type, , , , , status]) => favoriteFilter === '全部收藏' || favoriteFilter === type || (favoriteFilter === '已过期/下架提醒' && status !== '正常'))
                .map(([type, title, meta, desc, note, status]) => (
                <article key={title} className={styles.collectionCard}>
                  <div className={styles.cardTopLine}>
                    <span>{type}</span>
                    <em className={status === '正常' ? styles.statusOk : styles.statusPending}>{status}</em>
                  </div>
                  <h3>{title}</h3>
                  <p>{meta}</p>
                  <em>{desc}</em>
                  <div className={styles.favoriteNote}>备注：{note}</div>
                  <div>
                    <button className={styles.secondaryBtn} onClick={() => showAction('真实跳转详情页待接入')}>查看 <span className={styles.todoBadge}>待完善</span></button>
                    <button className={styles.secondaryBtn} onClick={async () => { const nextNote = window.prompt('请输入备注', note); if (nextNote === null) return; try { await api.updateFavoriteNote(id, nextNote); setFavoriteItems((items) => items.map((item) => item[6] === id ? [...item.slice(0, 4), nextNote, item[5], item[6]] : item)); showAction('备注已保存'); } catch (error) { showAction(error.message || '备注保存失败'); } }}>编辑备注</button>
                    <button className={styles.textDangerBtn} onClick={async () => { try { await api.deleteFavorite(id); setFavoriteItems((items) => items.filter((item) => item[6] !== id)); showAction('收藏已取消'); } catch (error) { showAction(error.message || '取消收藏失败'); } }}>取消收藏</button>
                  </div>
                </article>
              ))}
            </div>
          </Section>
        );
      }

      if (activePage === 'history') {
        return (
          <Section title="浏览历史" desc="记录最近查看过的公司、产品和文件。">
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
          <Section title="消息通知" desc="接收账号、安全、企业协作和文件状态相关通知。">
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

    if (activeGroup === 'company') {
      if (activePage === 'company-info') {
        return (
          <Section title="公司资料" desc="像企业百科一样维护公司的公开展示信息。">
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
          <Section title="产品资料" desc="管理该公司上传的产品，后续可继续补充分组、批量操作和分类筛选。">
            <div className={styles.productHeaderPanel}>
              <div>
                <h3>产品管理</h3>
                <p>先建立产品，再为产品上传资质证书、DoC 声明和使用说明书。</p>
              </div>
              <button className={styles.primaryBtn} onClick={() => openProductModal()}>新增产品</button>
            </div>

            <div className={styles.productTools}>
              <input placeholder="搜索产品名称、型号、证书编号" />
              <select defaultValue="all">
                <option value="all">全部分类</option>
                <option value="helmet">个人防护用品 / 马术头盔</option>
                <option value="other">其他 / 待分类</option>
              </select>
              <select defaultValue="all">
                <option value="all">全部状态</option>
                <option value="public">公开</option>
                <option value="draft">草稿</option>
                <option value="missing">资料待补充</option>
              </select>
              <button className={styles.secondaryBtn} onClick={() => showAction('批量管理后续接入')}>批量管理 <span className={styles.todoBadge}>待完善</span></button>
            </div>

            <div className={styles.productCards}>
              {companyProducts.map((product) => (
                <article key={product.id || product.model} className={styles.productCard}>
                  <div className={styles.productThumb}>{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : '产品图'}</div>
                  <div className={styles.productMain}>
                    <div className={styles.productTitleRow}>
                      <div>
                        <h3>{product.name}</h3>
                        <p>{product.model}</p>
                      </div>
                      <span className={product.status === '公开' ? styles.safeTag : styles.warnTag}>{product.status}</span>
                    </div>
                    <div className={styles.productMetaGrid}>
                      <span><strong>分类</strong><em>{product.category}</em></span>
                      <span><strong>文件数量</strong><em>{product.files} 个</em></span>
                      <span><strong>更新时间</strong><em>{product.updatedAt || '2026-06-25'}</em></span>
                    </div>
                    <div className={styles.productActions}>
                      <button className={styles.secondaryBtn} onClick={() => openProductModal(product)}>编辑产品</button>
                      <button className={styles.secondaryBtn} onClick={() => uploadProductImageFile(product)}>上传产品图</button>
                      <button className={styles.secondaryBtn} onClick={() => openPage('company', 'files', activeCompany)}>管理文件</button>
                      <button className={styles.secondaryBtn} onClick={() => navigate(`/products/${product.id}`)}>预览页面</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Section>
        );
      }

      if (activePage === 'files') {
        return (
          <Section title="文件管理" desc="统一管理该公司所有证书、DoC 声明和使用说明书。">
            <div className={styles.fileOverviewGrid}>
              {[
                ['资质证书', companyDocuments.filter((doc) => doc.type === '资质证书').length, '用于证明产品测试和认证状态'],
                ['DoC声明文件', companyDocuments.filter((doc) => doc.type === 'DoC声明文件').length, '供审核机构快速查看合规声明'],
                ['使用说明书', companyDocuments.filter((doc) => doc.type === '使用说明书').length, '帮助用户了解产品使用方式'],
                ['待补充资料', companyProducts.filter((product) => Number(product.files || 0) === 0).length, '缺少必要文件的产品'],
              ].map(([name, count, desc]) => (
                <div key={name} className={styles.fileOverviewCard}>
                  <strong>{count}</strong>
                  <span>{name}</span>
                  <p>{desc}</p>
                </div>
              ))}
            </div>

            <div className={styles.fileManageHeader}>
              <div className={styles.fileTabs}>
                {['全部文件', '资质证书', 'DoC声明文件', '使用说明书', '即将过期', '缺失文件', '待审核'].map((tab, index) => (
                  <button key={tab} className={index === 0 ? styles.tabActive : ''}>{tab}</button>
                ))}
              </div>
              <button className={styles.primaryBtn} onClick={uploadDocumentFile}>上传文件</button>
            </div>

            <div className={styles.productTools}>
              <input placeholder="搜索文件名、产品型号、证书编号" />
              <select defaultValue="all">
                <option value="all">全部产品</option>
                <option value="f20">Equestrian Helmet F20</option>
              </select>
              <select defaultValue="all">
                <option value="all">全部语言</option>
                <option value="en">English</option>
                <option value="zh">简体中文</option>
                <option value="de">Deutsch</option>
              </select>
              <button className={styles.secondaryBtn} onClick={() => showAction('批量操作后续接入')}>批量操作 <span className={styles.todoBadge}>待完善</span></button>
            </div>

            <div className={styles.fileList}>
              {companyDocuments.map((doc) => (
                <article key={doc.id || doc.name} className={styles.fileCard}>
                  <div className={styles.fileTypeIcon}>{doc.type.slice(0, 3)}</div>
                  <div className={styles.fileInfo}>
                    <div className={styles.fileTitleRow}>
                      <div>
                        <h3>{doc.name}</h3>
                        <p>{doc.product}</p>
                      </div>
                      <span className={doc.backup === '已备份' ? styles.safeTag : styles.warnTag}>{doc.backup}</span>
                    </div>
                    <div className={styles.fileMetaGrid}>
                      <span><strong>类型</strong><em>{doc.type}</em></span>
                      <span><strong>语言</strong><em>{doc.lang}</em></span>
                      <span><strong>状态</strong><em>公开</em></span>
                      <span><strong>更新时间</strong><em>{doc.updatedAt || '2026-06-25'}</em></span>
                    </div>
                  </div>
                  <div className={styles.fileActions}>
                    <button className={styles.secondaryBtn} onClick={() => doc.fileUrl ? window.open(doc.fileUrl, '_blank') : showAction('该文件暂无可预览地址')}>预览</button>
                    <button className={styles.secondaryBtn} onClick={() => editDocumentInfo(doc)}>编辑</button>
                    <button className={styles.secondaryBtn} onClick={() => replaceFile(doc)}>替换</button>
                  </div>
                </article>
              ))}
            </div>
          </Section>
        );
      }

      if (activePage === 'members') {
        return (
          <Section title="员工权限" desc="管理公司成员，并给不同员工分配不同操作权限。">
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
          <Section title="企业认证" desc="提交企业资质，认证通过后可提升公司可信度。">
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
          <Section title="会员套餐" desc="查看当前套餐、用量和后续可升级的企业权益。">
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
          <Section title="操作记录" desc="记录公司成员对资料、产品、文件和权限的关键操作。">
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
        <Section title="企业审核" desc="平台管理员审核企业认证申请，确认企业是否有权管理对应公司。">
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
        <Section title="用户查询与风控" desc="平台管理员主要用于查询用户、排查风险和处理特殊情况，不作为日常角色分配入口。">
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
          <MenuGroup title="个人" items={personalMenus} activePage={activePage} onSelect={(id) => openPage('personal', id)} />

          <div className={styles.group}>
            <div className={styles.groupTitle}>公司</div>
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
                        className={activeGroup === 'company' && activeCompany === company.id && activePage === item.id ? styles.activeItem : ''}
                        onClick={() => openPage('company', item.id, company.id)}
                      >
                        <MenuIcon type={item.id} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button className={styles.addCompanyBtn} onClick={() => setCompanyModal({ open: true, mode: 'create', name: '', nameEn: '', contactEmail: '' })}>
              + 创建 / 认领公司
            </button>
          </div>

          <MenuGroup title="平台管理" items={platformMenus} activePage={activePage} onSelect={(id) => openPage('platform', id)} />
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
            <div className={styles.modalBackdrop} onClick={() => setProductModal({ open: false, product: null, name: '', model: '', description: '' })}>
              <div className={styles.adminModal} onClick={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <div>
                    <h3>{productModal.product ? '编辑产品' : '新增产品'}</h3>
                    <p>填写产品基础信息，后续可继续上传文件和产品图。</p>
                  </div>
                  <button className={styles.iconCloseBtn} onClick={() => setProductModal({ open: false, product: null, name: '', model: '', description: '' })}>×</button>
                </div>
                <div className={styles.modalFormGrid}>
                  <label><span>产品名称</span><input value={productModal.name} onChange={(event) => setProductModal((form) => ({ ...form, name: event.target.value }))} /></label>
                  <label><span>产品型号</span><input value={productModal.model} onChange={(event) => setProductModal((form) => ({ ...form, model: event.target.value }))} /></label>
                  <label className={styles.fullField}><span>产品说明</span><textarea rows="4" value={productModal.description} onChange={(event) => setProductModal((form) => ({ ...form, description: event.target.value }))} /></label>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.secondaryBtn} onClick={() => setProductModal({ open: false, product: null, name: '', model: '', description: '' })}>取消</button>
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
  return (
    <div className={styles.group}>
      <div className={styles.groupTitle}>{title}</div>
      <div className={styles.subMenu}>
        {items.map((item) => (
          <button key={item.id} className={activePage === item.id ? styles.activeItem : ''} onClick={() => onSelect(item.id)}>
            <MenuIcon type={item.id} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ children }) {
  return <section className={styles.section}>{children}</section>;
}

function Placeholder({ title, desc }) {
  return (
    <Section title={title} desc={desc}>
      <div className={styles.placeholder}>
        <strong>功能待接入</strong>
      </div>
    </Section>
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
