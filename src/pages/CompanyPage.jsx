/**
 * EU-DOC 公司详情页
 * 版本: 2.0.0
 *
 * 变更记录 (2.0.0):
 * - 添加多语言支持
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getLanguageCode } from '../i18n/languages';
import { getCompany } from '../services/api';
import * as api from '../services/api';
import ShareModal from '../components/ShareModal';
import { categoryLabel, formatPublicDate, usesEnglishFallback, localizedField, publicStatusLabel } from '../utils/languageContent';
import styles from './CompanyPage.module.css';

export default function CompanyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const language = getLanguageCode(i18n.resolvedLanguage);
  const isEn = usesEnglishFallback(language);
  const ui = {
    center: isEn ? 'Company Document Center' : '企业资料中心',
    intro: isEn ? 'This page presents company basics, public product document packages, and compliance documents so users can confirm the company and open product document pages.' : '该页面集中展示企业基础信息、公开产品资料包与合规文件，方便用户确认企业并进入对应产品资料页。',
    productPackages: isEn ? 'Product document packages' : '产品资料包',
    publicDocuments: isEn ? 'Public documents' : '公开资料',
    frontendStatus: isEn ? 'Public status' : '前台状态',
    logoPending: isEn ? 'Company logo not provided' : '公司 Logo 待企业补充',
    favorited: isEn ? '★ Favorited' : '★ 已收藏',
    favorite: isEn ? '☆ Favorite' : '☆ 收藏',
    favoriteTitle: isEn ? 'Favorite company' : '收藏公司',
    unfavoriteTitle: isEn ? 'Remove favorite' : '取消收藏',
    shareCompany: isEn ? 'Share company' : '分享公司',
    publicStatus: isEn ? 'Public status' : '公开状态',
    verificationStatus: isEn ? 'Verification' : '认证状态',
    verified: isEn ? 'Company verified' : '已完成企业认证',
    verificationPending: isEn ? 'Verification pending' : '认证信息待完善',
    mainCategory: isEn ? 'Main category' : '主营方向',
    contactEmail: isEn ? 'Email' : '联系邮箱',
    address: isEn ? 'Address' : '企业地址',
    joined: isEn ? 'Joined' : '入驻时间',
    notProvided: isEn ? 'Not provided by company' : '企业暂未补充',
    website: isEn ? 'Website' : '企业官网',
    visitWebsite: isEn ? 'Visit website' : '访问官网',
    searchPlaceholder: isEn ? 'Search product name, model, or document' : '搜索产品名称、型号、资料',
    publicCount: isEn ? 'public documents' : '份资料',
    typeCount: isEn ? 'document types' : '类资料',
    certificate: isEn ? 'Certificate' : '资质证书',
    doc: isEn ? 'DoC Declaration' : 'DoC声明',
    manual: isEn ? 'Manual' : '说明书',
    notPublic: isEn ? 'Not public yet' : '暂未公开',
    viewProduct: isEn ? 'View product documents →' : '查看产品资料 →',
    noMatched: isEn ? 'No matching product document packages' : '没有匹配的产品资料包',
    noPackages: isEn ? 'This company has not published product document packages yet' : '该公司暂未公开产品资料包',
    clearSearch: isEn ? 'Clear search' : '清除搜索',
    shareType: isEn ? 'Company page share' : '企业主页分享',
    shareSubtitle: isEn ? 'View this company’s public product document packages, compliance documents, and company basics.' : '查看该企业公开的产品资料包、合规文件与企业基础信息。',
  };
  if (language === 'de') Object.assign(ui, {
    center: 'Unternehmensdokumentation',
    intro: 'Diese Seite bündelt Unternehmensinformationen, öffentliche Produktdokumentation und Konformitätsunterlagen. So können Nutzer das Unternehmen prüfen und direkt zu den Produktseiten wechseln.',
    productPackages: 'Produktdokumentation',
    publicDocuments: 'Öffentliche Dokumente',
    frontendStatus: 'Öffentlicher Status',
    logoPending: 'Unternehmenslogo nicht hinterlegt',
    favorited: '★ Favorisiert',
    favorite: '☆ Favorisieren',
    favoriteTitle: 'Unternehmen favorisieren',
    unfavoriteTitle: 'Aus Favoriten entfernen',
    shareCompany: 'Unternehmen teilen',
    publicStatus: 'Öffentlicher Status',
    verificationStatus: 'Verifizierung',
    verified: 'Unternehmen verifiziert',
    verificationPending: 'Verifizierung ausstehend',
    mainCategory: 'Hauptkategorie',
    contactEmail: 'E-Mail',
    address: 'Adresse',
    joined: 'Dabei seit',
    notProvided: 'Vom Unternehmen nicht angegeben',
    website: 'Website',
    visitWebsite: 'Website besuchen',
    searchPlaceholder: 'Produktname, Modell oder Dokument suchen',
    publicCount: 'öffentliche Dokumente',
    typeCount: 'Dokumenttypen',
    certificate: 'Zertifikat',
    doc: 'Konformitätserklärung',
    manual: 'Bedienungsanleitung',
    notPublic: 'Noch nicht öffentlich',
    viewProduct: 'Produktdokumente ansehen →',
    noMatched: 'Keine passenden Produktdokumente gefunden',
    noPackages: 'Dieses Unternehmen hat noch keine Produktdokumente veröffentlicht',
    clearSearch: 'Suche zurücksetzen',
    shareType: 'Unternehmensseite teilen',
    shareSubtitle: 'Öffentliche Produktdokumente, Konformitätsunterlagen und Unternehmensinformationen ansehen.',
  });

  const [company, setCompany] = useState(null);
  const [products, setProducts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

  // 收藏状态
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);

  // 搜索和排序状态
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  // 排序选项
  const sortOptions = [
    { value: 'date-desc', label: t('company.sortByDateDesc') || '最新签发' },
    { value: 'date-asc', label: t('company.sortByDateAsc') || '最早签发' },
    { value: 'expiry-asc', label: t('company.sortByExpiryAsc') || '即将过期' },
    { value: 'expiry-desc', label: t('company.sortByExpiryDesc') || '最晚过期' },
    { value: 'name-asc', label: t('company.sortByNameAsc') || '名称A-Z' },
    { value: 'name-desc', label: t('company.sortByNameDesc') || '名称Z-A' },
  ];

  useEffect(() => {
    setLoading(true);
    setError(null);
    getCompany(id)
      .then(async (data) => {
        setCompany(data);
        const [productResult, documentResult] = await Promise.all([
          api.getCompanyProducts(id).catch(() => ({ data: [] })),
          api.getCompanyDocuments(id).catch(() => ({ data: [] })),
        ]);
        setProducts(productResult.data || []);
        setDocuments((documentResult.data || []).filter((doc) => doc.status !== 'deleted'));
        // 加载收藏状态和账号浏览记录。未登录时会静默跳过。
        loadFavoriteStatus(id);
        api.recordHistory('公司', parseInt(id, 10), localizedField(data, 'name', i18n.language), data.nameEn || data.name_en || '', isEn ? 'View company' : '查看公司').catch(() => {});
      })
      .catch((err) => {
        console.error('Error loading company:', err);
        setError(t('company.notFoundText'));
        setCompany(null);
      })
      .finally(() => setLoading(false));
  }, [id, i18n.language, isEn, t]);

  // 加载收藏状态
  const loadFavoriteStatus = async (companyId) => {
    try {
      const result = await api.checkFavorite('公司', parseInt(companyId));
      // result 已经是解包后的数据对象
      if (result && result.isFavorited) {
        setIsFavorited(true);
        setFavoriteId(result.favoriteId);
      }
    } catch (error) {
      console.error('加载收藏状态失败:', error);
    }
  };

  // 收藏功能
  const handleFavorite = async () => {
    if (!company) return;

    try {
      if (isFavorited && favoriteId) {
        // 取消收藏
        await api.deleteFavorite(favoriteId);
        setIsFavorited(false);
        setFavoriteId(null);
      } else {
        // 添加收藏
        const result = await api.addFavorite(
          '公司',
          parseInt(id),
          company.name,
          company.nameEn || company.name_en || '',
          company.contactEmail || company.contact_email || ''
        );
        setIsFavorited(true);
        // result 已经是解包后的收藏对象，直接访问 id
        if (result && result.id) {
          setFavoriteId(result.id);
        }
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      alert(error.message || '收藏操作失败');
    }
  };

  // 分享功能
  const handleShare = () => {
    setShareOpen(true);
  };


  const getDocType = (doc) => doc.documentType || doc.document_type || 'other';
  const productPackages = useMemo(() => {
    const docsByProduct = documents.reduce((acc, doc) => {
      const productId = String(doc.productId || doc.product_id || '');
      if (!acc[productId]) acc[productId] = [];
      acc[productId].push(doc);
      return acc;
    }, {});
    let list = products.map((product) => {
      const docs = docsByProduct[String(product.id)] || [];
      const certs = docs.filter((doc) => getDocType(doc) === 'certificate');
      const declarations = docs.filter((doc) => ['declaration_of_conformity', 'declaration'].includes(getDocType(doc)));
      const manuals = docs.filter((doc) => getDocType(doc) === 'manual');
      const publicTypeCount = [certs.length, declarations.length, manuals.length].filter(Boolean).length;
      return { ...product, docs, certs, declarations, manuals, publicTypeCount };
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((product) => [product.name, product.nameEn, product.name_en, product.model, product.categoryName, product.category_name]
        .some((value) => String(value || '').toLowerCase().includes(q))
        || product.docs.some((doc) => String(doc.title || doc.name || '').toLowerCase().includes(q)));
    }

    switch (sortBy) {
      case 'name-asc':
        list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN'));
        break;
      case 'name-desc':
        list.sort((a, b) => String(b.name || '').localeCompare(String(a.name || ''), 'zh-CN'));
        break;
      default:
        list.sort((a, b) => new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0) - new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0));
        break;
    }
    return list;
  }, [products, documents, searchQuery, sortBy]);

  const totalDocuments = documents.length;
  const totalProducts = products.length;

  // 过滤和排序后的证书列表
  const filteredCertificates = useMemo(() => {
    if (!company?.certificates) return [];

    let certs = [...company.certificates];

    // 搜索过滤
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      certs = certs.filter((cert) => {
        return (
          (cert.productName && cert.productName.toLowerCase().includes(q)) ||
          (cert.certNo && cert.certNo.toLowerCase().includes(q)) ||
          (cert.model && cert.model.toLowerCase().includes(q)) ||
          (cert.category && cert.category.toLowerCase().includes(q)) ||
          (cert.standard && cert.standard.toLowerCase().includes(q)) ||
          (cert.issuer && cert.issuer.toLowerCase().includes(q))
        );
      });
    }

    // 排序
    switch (sortBy) {
      case 'name-asc':
        certs.sort((a, b) => (a.productName || '').localeCompare(b.productName || '', 'zh-CN'));
        break;
      case 'name-desc':
        certs.sort((a, b) => (b.productName || '').localeCompare(a.productName || '', 'zh-CN'));
        break;
      case 'date-desc':
        certs.sort((a, b) => new Date(b.issueDate || 0) - new Date(a.issueDate || 0));
        break;
      case 'date-asc':
        certs.sort((a, b) => new Date(a.issueDate || 0) - new Date(b.issueDate || 0));
        break;
      case 'expiry-asc':
        certs.sort((a, b) => new Date(a.expiryDate || '9999') - new Date(b.expiryDate || '9999'));
        break;
      case 'expiry-desc':
        certs.sort((a, b) => new Date(b.expiryDate || '9999') - new Date(a.expiryDate || '9999'));
        break;
      default:
        break;
    }

    return certs;
  }, [company, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.notFound}>
            <div className={styles.emptyText}>{t('common.loading')}</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.notFound}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
            <h2 className={styles.notFoundTitle}>{t('common.loadFailed')}</h2>
            <p className={styles.notFoundText}>{error}</p>
            <button className={styles.notFoundLink} onClick={() => navigate(-1)}>{t('common.back')}</button>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.notFound}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
            <h2 className={styles.notFoundTitle}>{t('company.notFound') || '公司未找到'}</h2>
            <p className={styles.notFoundText}>{t('company.notFoundText') || '该公司不存在或已被删除。'}</p>
            <Link to="/" className={styles.notFoundLink}>{t('common.backToHome')}</Link>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    return formatPublicDate(dateStr, i18n.language, language === 'de' ? 'Unbekannt' : isEn ? 'Unknown' : '未知');
  };
  const displayValue = (value) => value || ui.notProvided;
  const companyPublicStatus = publicStatusLabel(company, 'company', i18n.language);
  const companyName = localizedField(company, 'name', i18n.language);
  const companyDescription = localizedField(company, 'description', i18n.language);
  const companyBasics = [
    { label: ui.publicStatus, value: companyPublicStatus },
    { label: ui.verificationStatus, value: company.verificationStatus === 'verified' || company.verification_status === 'verified' ? ui.verified : ui.verificationPending },
    { label: ui.mainCategory, value: categoryLabel(company.mainCategory || company.main_category, language) },
    { label: ui.contactEmail, value: company.contactEmail || company.contact_email },
    { label: ui.address, value: isEn ? (company.addressEn || company.address_en || company.address) : company.address },
    { label: ui.joined, value: formatDate(company.createdAt || company.created_at) },
  ];
  const website = company.website || company.websiteUrl || company.website_url;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* 返回按钮 */}
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          {t('company.backButton')}
        </button>

        {/* 公司身份卡 */}
        <section className={styles.companyCard}>
          {/* 公司信息 */}
          <div className={styles.companyInfo}>
            <div className={styles.companyHeroGrid}>
              <div className={styles.companyCopy}>
                <span className={styles.companyEyebrow}>{ui.center}</span>
                <h1 className={styles.companyName}>{companyName}</h1>
                {!isEn && company.nameEn && company.nameEn !== company.name && (
                  <p className={styles.companyNameEn}>{company.nameEn}</p>
                )}
                <p className={styles.companyIntro}>{companyDescription || ui.intro}</p>
                <div className={styles.companyStats}>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{totalProducts}</span>
                    <span className={styles.statLabel}>{ui.productPackages}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{totalDocuments}</span>
                    <span className={styles.statLabel}>{ui.publicDocuments}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{companyPublicStatus}</span>
                    <span className={styles.statLabel}>{ui.frontendStatus}</span>
                  </div>
                </div>
              </div>

              <aside className={styles.companyHeroAside}>
                <div className={styles.companyLogoVisual}>
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt={companyName} className={styles.companyLogo} />
                  ) : (
                    <div>
                      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 21h18" />
                        <path d="M5 21V7l8-4v18" />
                        <path d="M19 21V11l-6-4" />
                        <path d="M9 9v.01" />
                        <path d="M9 12v.01" />
                        <path d="M9 15v.01" />
                        <path d="M9 18v.01" />
                      </svg>
                      <span>{ui.logoPending}</span>
                    </div>
                  )}
                </div>
                <div className={styles.companyActions}>
                  <button
                    onClick={handleFavorite}
                    title={isFavorited ? ui.unfavoriteTitle : ui.favoriteTitle}
                    className={styles.companyActionButton}
                  >
                    {isFavorited ? ui.favorited : ui.favorite}
                  </button>
                  <button
                    onClick={handleShare}
                    title={ui.shareCompany}
                    className={`${styles.companyActionButton} ${styles.companyActionPrimary}`}
                  >
                    {ui.shareCompany}
                  </button>
                </div>
              </aside>


              <div className={styles.companyBasicPills}>
                {companyBasics.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{displayValue(item.value)}</strong>
                  </div>
                ))}
                {website && (
                  <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noreferrer">
                    <span>{ui.website}</span>
                    <strong>{ui.visitWebsite}</strong>
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 产品资料包 */}
        <section className={styles.certSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
                {ui.productPackages}
              </h2>
              <span className={styles.resultCount}>{searchQuery ? `${productPackages.length} / ${totalProducts}` : totalProducts} {ui.productPackages} · {totalDocuments} {ui.publicDocuments}</span>
            </div>

            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input type="text" className={styles.searchInput} placeholder={ui.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                {searchQuery && <button className={styles.clearBtn} onClick={() => setSearchQuery('')}>✕</button>}
              </div>
              <select className={styles.sortSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                {sortOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            {productPackages.length > 0 ? (
              <div className={styles.productPackageGrid}>
                {productPackages.map((product) => (
                  <Link key={product.id} to={`/products/${product.id}`} className={styles.productPackageCard}>
                    <div className={styles.packageTopline}>
                      <span className={styles.packageStatusGood}>
                        {language === 'de'
                          ? `${product.docs.length} ${product.docs.length === 1 ? 'öffentliches Dokument' : 'öffentliche Dokumente'}`
                          : `${isEn ? 'Public' : '已公开'} ${product.docs.length} ${ui.publicCount}`}
                      </span>
                      <span className={styles.packageTypeCount}>
                        {product.publicTypeCount} {language === 'de' && product.publicTypeCount === 1 ? 'Dokumenttyp' : ui.typeCount}
                      </span>
                    </div>
                    <h3>{localizedField(product, 'name', i18n.language)}</h3>
                    <p>{product.model || localizedField({ name: product.categoryName || product.category_name, name_en: product.categoryNameEn || product.category_name_en }, 'name', i18n.language) || ui.productPackages}</p>
                    <div className={styles.packageTypes}>
                      <span className={product.certs.length ? styles.typeReady : styles.typeMissing}>{ui.certificate} <strong>{product.certs.length || ui.notPublic}</strong></span>
                      <span className={product.declarations.length ? styles.typeReady : styles.typeMissing}>{ui.doc} <strong>{product.declarations.length || ui.notPublic}</strong></span>
                      <span className={product.manuals.length ? styles.typeReady : styles.typeMissing}>{ui.manual} <strong>{product.manuals.length || ui.notPublic}</strong></span>
                    </div>
                    <div className={styles.packageFooter}>
                      <span>{product.docs.length} {ui.publicCount}</span>
                      <em>{ui.viewProduct}</em>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <p>{searchQuery ? ui.noMatched : ui.noPackages}</p>
                {searchQuery && <button className={styles.clearSearchBtn} onClick={() => setSearchQuery('')}>{ui.clearSearch}</button>}
              </div>
            )}
        </section>

        {/* 页脚 */}
        <footer className={styles.footer}>
          <p>© 2025 EU-DOC</p>
        </footer>
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          typeLabel={ui.shareType}
          title={companyName}
          subtitle={companyDescription || ui.shareSubtitle}
          url={`${window.location.origin}/eu-doc/companies/${id}`}
          meta={[company.nameEn || company.name_en, `${totalProducts} ${ui.productPackages}`, companyPublicStatus]}
          context={{
            kind: 'company',
            companyName,
          }}
        />
      </div>
    </div>
  );
}
