/**
 * EU-DOC 证书详情页
 * 版本: 2.1.0
 *
 * 变更记录 (2.1.0):
 * - 添加证书状态计算和过期倒计时
 * - 添加可信度信息展示
 * - 优化操作按钮（复制证书编号）
 * - 增强状态徽章显示
 *
 * 变更记录 (2.0.0):
 * - 添加多语言支持
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCertificate, submitReport } from '../services/api';
import { getCertificateStatus, formatDaysRemaining, getReviewStatusInfo } from '../utils/certificateStatus';
import { addRecentView } from '../utils/recentViews';
import StatusBadge from '../components/StatusBadge';
import LazyImage from '../components/LazyImage';
import styles from './CertificatePage.module.css';

export default function CertificatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('certificate'); // 'certificate' 或 'manual'
  const [copySuccess, setCopySuccess] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrlCopied, setShareUrlCopied] = useState(false);
  const [declarationAvailable, setDeclarationAvailable] = useState(null);
  const [selectedDeclarationLanguage, setSelectedDeclarationLanguage] = useState('EN');

  // 点赞和收藏状态
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [favoriteId, setFavoriteId] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getCertificate(id)
      .then((data) => {
        setCert(data);
        // 添加到最近查看记录
        addRecentView(data);
        // 加载点赞和收藏状态
        loadInteractionData(id);
        // 加载收藏状态
        loadFavoriteStatus(id);
      })
      .catch((err) => {
        setError(err.message || t('messages.networkError'));
        setCert(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // 加载收藏状态
  const loadFavoriteStatus = async (certId) => {
    try {
      const result = await api.checkFavorite('文件', parseInt(certId));
      // result 已经是解包后的数据对象
      if (result && result.isFavorited) {
        setFavorited(true);
        setFavoriteId(result.favoriteId);
      }
    } catch (error) {
      console.error('加载收藏状态失败:', error);
    }
  };

  useEffect(() => {
    const versions = cert?.declarationVersions || [];
    const hasSelectedLanguage = versions.some((version) => version.language === selectedDeclarationLanguage);
    const activeVersion = hasSelectedLanguage
      ? versions.find((version) => version.language === selectedDeclarationLanguage)
      : versions[0];
    const declarationUrl = activeVersion?.url || cert?.declarationUrl || cert?.docUrl;
    if (!declarationUrl) {
      setDeclarationAvailable(null);
      return;
    }

    setDeclarationAvailable(null);
    fetch(declarationUrl, { method: 'HEAD' })
      .then((response) => setDeclarationAvailable(response.ok))
      .catch(() => setDeclarationAvailable(false));
  }, [cert?.declarationUrl, cert?.docUrl, cert?.declarationVersions, selectedDeclarationLanguage]);

  // 加载点赞和收藏数据
  const loadInteractionData = (certId) => {
    // 从 localStorage 获取用户的点赞和收藏记录
    const likes = JSON.parse(localStorage.getItem('cert_likes') || '{}');
    const favorites = JSON.parse(localStorage.getItem('cert_favorites') || '{}');
    const likeCounts = JSON.parse(localStorage.getItem('cert_like_counts') || '{}');
    const favoriteCounts = JSON.parse(localStorage.getItem('cert_favorite_counts') || '{}');

    setLiked(likes[certId] || false);
    setFavorited(favorites[certId] || false);
    setLikeCount(likeCounts[certId] || 0);
    setFavoriteCount(favoriteCounts[certId] || 0);
  };

  // 点赞功能
  const handleLike = () => {
    const likes = JSON.parse(localStorage.getItem('cert_likes') || '{}');
    const likeCounts = JSON.parse(localStorage.getItem('cert_like_counts') || '{}');

    if (liked) {
      // 取消点赞
      delete likes[id];
      likeCounts[id] = Math.max((likeCounts[id] || 0) - 1, 0);
      setLiked(false);
      setLikeCount(likeCounts[id]);
    } else {
      // 点赞
      likes[id] = true;
      likeCounts[id] = (likeCounts[id] || 0) + 1;
      setLiked(true);
      setLikeCount(likeCounts[id]);
    }

    localStorage.setItem('cert_likes', JSON.stringify(likes));
    localStorage.setItem('cert_like_counts', JSON.stringify(likeCounts));
  };

  // 收藏功能
  const handleFavorite = async () => {
    if (!cert) return;

    try {
      if (favorited) {
        // 取消收藏
        if (favoriteId) {
          await api.deleteFavorite(favoriteId);
          setFavorited(false);
          setFavoriteCount(prev => Math.max(prev - 1, 0));
          setFavoriteId(null);
        } else {
          // 如果没有favoriteId，先查询
          const result = await api.checkFavorite('文件', parseInt(id));
          if (result && result.favoriteId) {
            await api.deleteFavorite(result.favoriteId);
            setFavorited(false);
            setFavoriteCount(prev => Math.max(prev - 1, 0));
            setFavoriteId(null);
          }
        }

        // 同时更新localStorage
        const favorites = JSON.parse(localStorage.getItem('cert_favorites') || '{}');
        const favoriteCounts = JSON.parse(localStorage.getItem('cert_favorite_counts') || '{}');
        delete favorites[id];
        favoriteCounts[id] = Math.max((favoriteCounts[id] || 0) - 1, 0);
        localStorage.setItem('cert_favorites', JSON.stringify(favorites));
        localStorage.setItem('cert_favorite_counts', JSON.stringify(favoriteCounts));
      } else {
        // 添加收藏 - 调用后端API
        const result = await api.addFavorite(
          '文件',
          parseInt(id),
          cert.certNo || cert.productName || '证书',
          cert.companyName || '',
          `${cert.productName || ''} - ${cert.standard || ''}`.trim()
        );

        setFavorited(true);
        setFavoriteCount(prev => prev + 1);
        // result 已经是解包后的收藏对象，直接访问 id
        if (result && result.id) {
          setFavoriteId(result.id);
        }

        // 同时更新localStorage
        const favorites = JSON.parse(localStorage.getItem('cert_favorites') || '{}');
        const favoriteCounts = JSON.parse(localStorage.getItem('cert_favorite_counts') || '{}');
        favorites[id] = true;
        favoriteCounts[id] = (favoriteCounts[id] || 0) + 1;
        localStorage.setItem('cert_favorites', JSON.stringify(favorites));
        localStorage.setItem('cert_favorite_counts', JSON.stringify(favoriteCounts));
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      alert(error.message || '收藏操作失败');
    }
  };

  // 复制证书编号
  const handleCopyCertNo = () => {
    if (cert?.certNo) {
      navigator.clipboard.writeText(cert.certNo).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      });
    }
  };

  // 分享链接
  const handleShare = () => {
    setShowShareModal(true);
  };

  // 复制分享链接
  const handleCopyShareUrl = () => {
    const shareUrl = `${window.location.origin}/certificate/${id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareUrlCopied(true);
      setTimeout(() => setShareUrlCopied(false), 2000);
    });
  };

  // 生成二维码分享链接
  const getQRCodeUrl = () => {
    const shareUrl = `${window.location.origin}/certificate/${id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
  };

  // 下载证书文件
  const handleDownload = (e) => {
    e.preventDefault();
    if (cert?.fileUrl) {
      const link = document.createElement('a');
      link.href = cert.fileUrl;
      link.download = `${cert.certNo}_cert.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 提交错误报告
  const handleSubmitReport = async () => {
    if (!reportType) {
      alert(t('certificate.reportErrorDesc'));
      return;
    }

    setReportSubmitting(true);
    try {
      await submitReport(id, reportType, reportDescription, reporterEmail, reporterName);
      alert(t('certificate.reportSubmitSuccess'));
      setShowReportModal(false);
      // 重置表单
      setReportType('');
      setReportDescription('');
      setReporterEmail('');
      setReporterName('');
    } catch (err) {
      alert(t('certificate.reportSubmitFailed'));
    } finally {
      setReportSubmitting(false);
    }
  };

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

  if (error && !cert) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.notFound}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
            <h2 className={styles.notFoundTitle}>{t('messages.networkError')}</h2>
            <p className={styles.notFoundText}>{error}</p>
            <button className={styles.notFoundLink} onClick={() => navigate(-1)}>{t('common.back')}</button>
          </div>
        </div>
      </div>
    );
  }

  if (!cert) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.notFound}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
            <h2 className={styles.notFoundTitle}>{t('certificate.notFound')}</h2>
            <p className={styles.notFoundText}>{t('certificate.notFoundText')}</p>
            <Link to="/" className={styles.notFoundLink}>{t('common.backToHome')}</Link>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return t('certificate.unknown');
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 计算证书状态
  const certStatus = getCertificateStatus(cert.status, cert.expiryDate);
  const reviewInfo = getReviewStatusInfo(cert.reviewStatus);
  const declarationVersions = cert.declarationVersions || [];
  const hasSelectedLanguage = declarationVersions.some((version) => version.language === selectedDeclarationLanguage);
  const selectedDeclarationVersion = hasSelectedLanguage
    ? declarationVersions.find((version) => version.language === selectedDeclarationLanguage)
    : declarationVersions[0];
  const declarationUrl = selectedDeclarationVersion?.url || cert.declarationUrl || cert.docUrl;
  const isDeclarationImage = /\.(png|jpe?g|webp|gif)(?:$|\?)/i.test(declarationUrl || '');

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* 返回按钮 */}
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          {t('common.back')}
        </button>

        {/* 证书主卡片 */}
        <div className={styles.certCard}>
          {/* 顶部：状态 + 证书编号 + 操作 */}
          <div className={styles.certTop}>
            <div className={styles.certTopLeft}>
              <StatusBadge status={cert.status} />
              {certStatus.daysRemaining !== null && certStatus.status === 'expiring' && (
                <span className={styles.expiringWarning}>
                  ⚠️ {formatDaysRemaining(certStatus.daysRemaining, t)}
                </span>
              )}
            </div>
            <div className={styles.certTopRight}>
              <span className={styles.certNo}>{cert.certNo}</span>
              <button
                className={styles.copyBtn}
                onClick={handleCopyCertNo}
                title={t('certificate.copyCertNo')}
              >
                {copySuccess ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{t('certificate.certNoCopied')}</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>{t('certificate.copyCertNo')}</span>
                  </>
                )}
              </button>
              <button
                className={`${styles.iconBtn} ${favorited ? styles.favorited : ''}`}
                onClick={handleFavorite}
                title={i18n.language === 'zh' ? '收藏' : 'Favorite'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
              <button
                className={styles.iconBtn}
                onClick={handleShare}
                title={i18n.language === 'zh' ? '分享' : 'Share'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </button>
            </div>
          </div>

          {/* 标题区域 */}
          <div className={styles.certTitleSection}>
            <h1 className={styles.certTitle}>{cert.productName}</h1>
            {cert.companyId ? (
              <Link to={`/company/${cert.companyId}`} className={styles.certCompanyLink}>
                {cert.companyName}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            ) : (
              <p className={styles.certCompany}>{cert.companyName}</p>
            )}
          </div>

          {/* 标签页切换 */}
          {cert.manualUrl && (
            <div className={styles.tabNav}>
              <button
                className={`${styles.tabButton} ${activeTab === 'certificate' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('certificate')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                {t('certificate.certificateTab')}
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'manual' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('manual')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                {t('certificate.manualTab')}
              </button>
            </div>
          )}

          {/* 证书详情内容 - 默认显示或当选中证书 tab 时显示 */}
          {activeTab === 'certificate' && (
          <>
          <div className={styles.mainContent}>
            {/* 左侧：信息卡片 */}
            <div className={styles.infoCards}>
              {/* 基本信息卡片 */}
              <div className={styles.infoCard}>
                <div className={styles.cardHeader}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <span>{t('certificate.basicInfo')}</span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{t('certificate.category')}</span>
                    <span className={styles.infoValue}>{cert.category || '-'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{t('certificate.model')}</span>
                    <div className={styles.modelTags}>
                      {cert.model ? (
                        cert.model.split(/[,，]\s*/).map((item, index) => (
                          <span key={index} className={styles.modelTag}>{item}</span>
                        ))
                      ) : (
                        <span className={styles.infoValue}>-</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{t('certificate.issuer')}</span>
                    <span className={styles.infoValue}>{cert.issuer || '-'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{t('certificate.standard')}</span>
                    <span className={styles.infoValue}>{cert.standard || '-'}</span>
                  </div>
                </div>
              </div>

              {/* 有效期卡片 */}
              <div className={styles.infoCard}>
                <div className={styles.cardHeader}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{t('certificate.validityInfo')}</span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{t('certificate.issueDate')}</span>
                    <span className={styles.infoValue}>{formatDate(cert.issueDate)}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{t('certificate.expiryDate')}</span>
                    <span className={styles.infoValue}>{formatDate(cert.expiryDate)}</span>
                  </div>
                  {certStatus.daysRemaining !== null && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>{t('certificate.statusLabel')}</span>
                      <span className={`${styles.infoValue} ${styles[`status_${certStatus.statusColor}`]}`}>
                        {t(`certificate.status.${certStatus.statusText}`)}
                        {certStatus.daysRemaining > 0 && ` (${formatDaysRemaining(certStatus.daysRemaining, t)})`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 可信度信息卡片 */}
              <div className={styles.infoCard}>
                <div className={styles.cardHeader}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>{t('certificate.trustInfo')}</span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{t('certificate.dataSource')}</span>
                    <span className={styles.infoValue}>
                      {cert.uploadedBy ? t('certificate.userUploaded') : t('certificate.systemData')}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{t('certificate.reviewStatus')}</span>
                    <span className={`${styles.infoValue} ${styles[`review_${reviewInfo.color}`]}`}>
                      {reviewInfo.icon} {t(`certificate.${reviewInfo.text}`)}
                    </span>
                  </div>
                  {cert.remark && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>{t('admin.certificatesPage.reviewNote')}</span>
                      <span className={styles.infoValue}>{cert.remark}</span>
                    </div>
                  )}
                  {cert.updatedAt && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>{t('certificate.lastUpdated')}</span>
                      <span className={styles.infoValue}>{formatDate(cert.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 数据质量提示 */}
              <div className={styles.dataQualityCard}>
                <div className={styles.qualityIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className={styles.qualityContent}>
                  <h4 className={styles.qualityTitle}>{t('certificate.dataQualityTitle')}</h4>
                  <p className={styles.qualityText}>{t('certificate.dataQualityNotice')}</p>
                  <button
                    className={styles.reportBtn}
                    onClick={() => setShowReportModal(true)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    {t('certificate.reportError')}
                  </button>
                </div>
              </div>
            </div>

            {/* 右侧：证书和 DoC 缩略图 */}
            {(cert.thumbnailUrl || declarationUrl) && (
              <div className={styles.previewColumn}>
                {cert.thumbnailUrl && (
                  <a
                    href={cert.fileUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.thumbnailSection}
                  >
                    <div className={styles.thumbnailHeader}>
                      <span>{t('certificate.certFile')}</span>
                    </div>
                    <div className={styles.thumbnailWrapper}>
                      <LazyImage
                        src={cert.thumbnailUrl}
                        alt={`${cert.productName} 证书预览`}
                        className={styles.thumbnailImg}
                      />
                    </div>
                    <div className={styles.thumbnailOverlay}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6" />
                        <path d="M10 14 21 3" />
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      </svg>
                      <span>{i18n.language === 'zh' ? '点击查看原文件' : 'Open original file'}</span>
                    </div>
                  </a>
                )}

                {declarationUrl && (
                  <a
                    href={declarationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.thumbnailSection} ${styles.declarationPreview}`}
                  >
                    <div className={styles.thumbnailHeader}>
                      <span>{t('certificate.docFile')}</span>
                      {(declarationVersions.length > 0 || selectedDeclarationVersion) && (
                        <div className={styles.languageSwitcher}>
                          {(declarationVersions.length > 0 ? declarationVersions : [{ language: 'EN', url: declarationUrl }]).map((version) => (
                            <button
                              key={`${version.language}-${version.url}`}
                              type="button"
                              className={`${styles.languageButton} ${version.language === (selectedDeclarationVersion?.language || 'EN') ? styles.languageActive : ''}`}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setSelectedDeclarationLanguage(version.language);
                              }}
                            >
                              {version.language}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {declarationAvailable ? (
                      <div className={`${styles.thumbnailWrapper} ${styles.docThumbnailWrapper}`}>
                        {isDeclarationImage ? (
                          <LazyImage
                            src={declarationUrl}
                            alt={t('certificate.docFile')}
                            className={styles.docThumbnailImg}
                          />
                        ) : (
                          <iframe
                            src={`${declarationUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                            title={t('certificate.docFile')}
                            className={styles.docThumbnailFrame}
                            loading="lazy"
                          />
                        )}
                      </div>
                    ) : (
                      <div className={`${styles.thumbnailWrapper} ${styles.docThumbnailWrapper}`}>
                        <div className={styles.docUnavailable}>
                          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <path d="M9 15h6" />
                            <path d="M9 18h4" />
                          </svg>
                          <strong>{t('certificate.docFile')}</strong>
                          <span>{declarationAvailable === false ? t('certificate.fileUnderReview') : t('certificate.pdfDocument')}</span>
                        </div>
                      </div>
                    )}
                    <div className={styles.thumbnailOverlay}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6" />
                        <path d="M10 14 21 3" />
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      </svg>
                      <span>{i18n.language === 'zh' ? '点击查看声明' : 'Open declaration'}</span>
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>
          </>
        )}

        {/* 说明书内容 */}
        {activeTab === 'manual' && cert.manualUrl && (
          <div className={styles.manualContent}>
            <div className={styles.manualHeader}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <h2>{t('certificate.userManual')}</h2>
            </div>
            <div className={styles.pdfViewer}>
              <iframe
                src={cert.manualUrl}
                title={t('certificate.userManual')}
                className={styles.pdfFrame}
              />
            </div>
            <div className={styles.manualActions}>
              <a
                href={cert.manualUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.manualButton}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6" />
                  <path d="M10 14 21 3" />
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
                {t('certificate.openInNewTab')}
              </a>
              <a
                href={cert.manualUrl}
                download
                className={styles.manualButton}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {t('certificate.download')}
              </a>
            </div>
          </div>
        )}

        {/* 报告错误模态框 */}
        {showReportModal && (
          <div className={styles.modalOverlay} onClick={() => setShowReportModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>{t('certificate.reportErrorTitle')}</h3>
                <button
                  className={styles.modalClose}
                  onClick={() => setShowReportModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className={styles.modalBody}>
                <p>{t('certificate.reportErrorDesc')}</p>
                <div className={styles.reportOptions}>
                  <button
                    className={`${styles.reportOption} ${reportType === 'wrong_info' ? styles.selected : ''}`}
                    onClick={() => setReportType('wrong_info')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                      <path d="M22 12A10 10 0 0 0 12 2v10z" />
                    </svg>
                    <span>{t('certificate.wrongInfo')}</span>
                  </button>
                  <button
                    className={`${styles.reportOption} ${reportType === 'outdated_info' ? styles.selected : ''}`}
                    onClick={() => setReportType('outdated_info')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{t('certificate.outdatedInfo')}</span>
                  </button>
                  <button
                    className={`${styles.reportOption} ${reportType === 'duplicate_entry' ? styles.selected : ''}`}
                    onClick={() => setReportType('duplicate_entry')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>{t('certificate.duplicateEntry')}</span>
                  </button>
                  <button
                    className={`${styles.reportOption} ${reportType === 'other' ? styles.selected : ''}`}
                    onClick={() => setReportType('other')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>{t('certificate.otherIssue')}</span>
                  </button>
                </div>

                <div className={styles.reportForm}>
                  <label className={styles.formLabel}>
                    {t('certificate.reportDescription')}
                    <textarea
                      className={styles.formTextarea}
                      placeholder={t('certificate.reportDescPlaceholder')}
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      rows="3"
                    />
                  </label>

                  <label className={styles.formLabel}>
                    {t('certificate.reporterEmail')}
                    <input
                      type="email"
                      className={styles.formInput}
                      placeholder={t('certificate.reporterEmailPlaceholder')}
                      value={reporterEmail}
                      onChange={(e) => setReporterEmail(e.target.value)}
                    />
                  </label>

                  <label className={styles.formLabel}>
                    {t('certificate.reporterName')}
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder={t('certificate.reporterNamePlaceholder')}
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                    />
                  </label>
                </div>

                <div className={styles.modalActions}>
                  <button
                    className={styles.cancelButton}
                    onClick={() => setShowReportModal(false)}
                    disabled={reportSubmitting}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    className={styles.submitButton}
                    onClick={handleSubmitReport}
                    disabled={!reportType || reportSubmitting}
                  >
                    {reportSubmitting ? t('common.loading') : t('certificate.submitReport')}
                  </button>
                </div>

                <p className={styles.reportNotice}>{t('certificate.reportNotice')}</p>
              </div>
            </div>
          </div>
        )}

        {/* 分享模态框 */}
        {showShareModal && (
          <div className={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>{i18n.language === 'zh' ? '分享证书' : 'Share Certificate'}</h3>
                <button
                  className={styles.modalClose}
                  onClick={() => setShowShareModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className={styles.modalBody}>
                <p className={styles.shareDesc}>
                  {i18n.language === 'zh'
                    ? '分享此证书给您的客户或合作伙伴'
                    : 'Share this certificate with your clients or partners'}
                </p>

                {/* 分享链接 */}
                <div className={styles.shareSection}>
                  <label className={styles.shareLabel}>
                    {i18n.language === 'zh' ? '分享链接' : 'Share Link'}
                  </label>
                  <div className={styles.shareUrlBox}>
                    <input
                      type="text"
                      className={styles.shareUrlInput}
                      value={`${window.location.origin}/certificate/${id}`}
                      readOnly
                    />
                    <button
                      className={styles.copyUrlBtn}
                      onClick={handleCopyShareUrl}
                    >
                      {shareUrlCopied ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>{i18n.language === 'zh' ? '已复制' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>{i18n.language === 'zh' ? '复制链接' : 'Copy Link'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 二维码 */}
                <div className={styles.shareSection}>
                  <label className={styles.shareLabel}>
                    {i18n.language === 'zh' ? '扫码查看' : 'Scan QR Code'}
                  </label>
                  <div className={styles.qrCodeBox}>
                    <img
                      src={getQRCodeUrl()}
                      alt="QR Code"
                      className={styles.qrCodeImg}
                    />
                    <p className={styles.qrCodeHint}>
                      {i18n.language === 'zh'
                        ? '使用手机扫描二维码查看证书'
                        : 'Scan with your phone to view certificate'}
                    </p>
                  </div>
                </div>

                {/* 社交媒体分享 */}
                <div className={styles.shareSection}>
                  <label className={styles.shareLabel}>
                    {i18n.language === 'zh' ? '快速分享' : 'Quick Share'}
                  </label>
                  <div className={styles.socialShareBtns}>
                    <button
                      className={styles.socialBtn}
                      onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.origin + '/certificate/' + id)}&text=${encodeURIComponent(cert.productName + ' - ' + cert.companyName)}`, '_blank')}
                      title="Twitter"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                    </button>
                    <button
                      className={styles.socialBtn}
                      onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin + '/certificate/' + id)}`, '_blank')}
                      title="LinkedIn"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </button>
                    <button
                      className={styles.socialBtn}
                      onClick={() => window.open(`mailto:?subject=${encodeURIComponent(cert.productName + ' - ' + cert.companyName)}&body=${encodeURIComponent('查看证书: ' + window.location.origin + '/certificate/' + id)}`, '_blank')}
                      title="Email"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* 页脚 */}
        <footer className={styles.footer}>
          <p>© 2025 EU-DOC 证书查询系统 · 版本 1.0.4</p>
        </footer>
      </div>
    </div>
  );
}
