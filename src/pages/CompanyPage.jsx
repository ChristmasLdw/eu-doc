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
import { getCompany } from '../services/api';
import * as api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import styles from './CompanyPage.module.css';

export default function CompanyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      .then((data) => {
        console.log('Company data received:', data);
        console.log('Certificates:', data?.certificates);
        if (data?.certificates?.[0]) {
          console.log('First cert keys:', Object.keys(data.certificates[0]));
        }
        setCompany(data);
        // 加载收藏状态
        loadFavoriteStatus(id);
      })
      .catch((err) => {
        console.error('Error loading company:', err);
        setError(err.message || t('messages.networkError'));
        setCompany(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

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
    const shareUrl = `${window.location.origin}/eu-doc/company/${id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('链接已复制到剪贴板');
      });
    } else {
      alert('分享链接：' + shareUrl);
    }
  };

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
    if (!dateStr) return '未知';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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

        {/* 公司主卡片 */}
        <div className={styles.companyCard}>
          {/* 公司信息 */}
          <div className={styles.companyInfo}>
            <div className={styles.companyHeader}>
              <div className={styles.companyIcon}>
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt={company.name} className={styles.companyLogo} />
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18" />
                    <path d="M5 21V7l8-4v18" />
                    <path d="M19 21V11l-6-4" />
                    <path d="M9 9v.01" />
                    <path d="M9 12v.01" />
                    <path d="M9 15v.01" />
                    <path d="M9 18v.01" />
                  </svg>
                )}
              </div>
              <div className={styles.companyTitle}>
                <h1 className={styles.companyName}>{company.name}</h1>
                {company.nameEn && company.nameEn !== company.name && (
                  <p className={styles.companyNameEn}>{company.nameEn}</p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                  <button
                    onClick={handleFavorite}
                    title={isFavorited ? '取消收藏' : '收藏公司'}
                    style={{
                      background: 'none',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      color: isFavorited ? '#ff6b6b' : '#666',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isFavorited ? '★' : '☆'} {isFavorited ? '已收藏' : '收藏'}
                  </button>
                  <button
                    onClick={handleShare}
                    title="分享公司"
                    style={{
                      background: 'none',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      color: '#666',
                      transition: 'all 0.2s'
                    }}
                  >
                    📤 分享
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.companyStats}>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>{company.certificates?.length || 0}</span>
                <span className={styles.statLabel}>{t('company.certCount')}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>{formatDate(company.createdAt)}</span>
                <span className={styles.statLabel}>{t('company.joinedDate')}</span>
              </div>
            </div>
          </div>

          {/* 证书列表 */}
          <div className={styles.certSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                {t('company.certList')}
              </h2>
              <span className={styles.resultCount}>
                {searchQuery ? `${filteredCertificates.length} / ${company.certificates?.length || 0}` : company.certificates?.length || 0} {t('company.certCountText')}
              </span>
            </div>

            {/* 搜索和排序工具栏 */}
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder={t('company.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className={styles.clearBtn}
                    onClick={() => setSearchQuery('')}
                  >
                    ✕
                  </button>
                )}
              </div>
              <select
                className={styles.sortSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {filteredCertificates.length > 0 ? (
              <div className={styles.certList}>
                {filteredCertificates.map((cert) => (
                  <Link
                    key={cert.id}
                    to={`/certificate/${cert.id}`}
                    className={styles.certCard}
                  >
                    <div className={styles.certInfo}>
                      <div className={styles.certHeader}>
                        <span className={styles.certNo}>{cert.certNo}</span>
                        <StatusBadge status={cert.status} />
                      </div>
                      <h3 className={styles.certName}>{cert.productName}</h3>
                      <div className={styles.certMeta}>
                        {cert.category && (
                          <span className={styles.certTag}>{cert.category}</span>
                        )}
                        {cert.standard && (
                          <span className={styles.certTag}>{cert.standard}</span>
                        )}
                        {cert.issueDate && (
                          <span className={styles.certDate}>{t('company.issueDate')}: {cert.issueDate}</span>
                        )}
                        {cert.expiryDate && (
                          <span className={styles.certDate}>{t('company.expiryDate')}: {cert.expiryDate}</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.certArrow}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
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
                <p>{searchQuery ? t('company.noResults') : t('company.noCerts')}</p>
                {searchQuery && (
                  <button className={styles.clearSearchBtn} onClick={() => setSearchQuery('')}>
                    {t('company.clearSearch')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 页脚 */}
        <footer className={styles.footer}>
          <p>© 2025 EU-DOC 证书查询系统 · 版本 1.0.4</p>
        </footer>
      </div>
    </div>
  );
}
