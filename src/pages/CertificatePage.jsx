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
  const [copySuccess, setCopySuccess] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // 点赞和收藏状态
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);

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
      })
      .catch((err) => {
        setError(err.message || t('messages.networkError'));
        setCert(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

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
  const handleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('cert_favorites') || '{}');
    const favoriteCounts = JSON.parse(localStorage.getItem('cert_favorite_counts') || '{}');

    if (favorited) {
      // 取消收藏
      delete favorites[id];
      favoriteCounts[id] = Math.max((favoriteCounts[id] || 0) - 1, 0);
      setFavorited(false);
      setFavoriteCount(favoriteCounts[id]);
    } else {
      // 收藏
      favorites[id] = true;
      favoriteCounts[id] = (favoriteCounts[id] || 0) + 1;
      setFavorited(true);
      setFavoriteCount(favoriteCounts[id]);

      // 保存证书信息到收藏列表
      const favList = JSON.parse(localStorage.getItem('favorite_certificates') || '[]');
      if (cert && !favList.find(item => item.id === cert.id)) {
        favList.unshift({
          id: cert.id,
          certNo: cert.certNo,
          productName: cert.productName,
          companyName: cert.companyName,
          thumbnailPath: cert.thumbnailPath,
          timestamp: Date.now()
        });
        localStorage.setItem('favorite_certificates', JSON.stringify(favList));
      }
    }

    localStorage.setItem('cert_favorites', JSON.stringify(favorites));
    localStorage.setItem('cert_favorite_counts', JSON.stringify(favoriteCounts));
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
    navigate(`/share/${id}`);
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

          {/* 主内容区域 - 左右布局 */}
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
                      <span className={styles.infoLabel}>{t('certificate.status')}</span>
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
                <div className={styles.qualityIcon}>ℹ️</div>
                <div className={styles.qualityContent}>
                  <p className={styles.qualityText}>{t('certificate.dataQualityNotice')}</p>
                  <button
                    className={styles.reportBtn}
                    onClick={() => setShowReportModal(true)}
                  >
                    {t('certificate.reportError')}
                  </button>
                </div>
              </div>
            </div>

            {/* 右侧：缩略图 */}
            {cert.thumbnailUrl && (
              <a
                href={cert.fileUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.thumbnailSection}
              >
                <LazyImage
                  src={cert.thumbnailUrl}
                  alt={`${cert.productName} 证书预览`}
                  className={styles.thumbnailImg}
                />
                <div className={styles.thumbnailOverlay}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6" />
                    <path d="M10 14 21 3" />
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  </svg>
                  <span>点击放大查看</span>
                </div>
              </a>
            )}
          </div>

          {/* 证书文件区域 */}
          <div className={styles.fileSection}>
            <h3 className={styles.sectionTitle}>{t('certificate.certFile')}</h3>
            {cert.fileUrl ? (
              <div className={styles.fileActions}>
                <a
                  href={cert.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.fileCard}
                >
                  <div className={styles.fileIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{cert.certNo}_cert.pdf</span>
                    <span className={styles.fileSize}>{t('certificate.pdfDocument')}</span>
                  </div>
                  <span className={styles.viewButton}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h6v6" />
                      <path d="M10 14 21 3" />
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                    {t('certificate.viewFile')}
                  </span>
                </a>
                <button
                  className={`${styles.actionButton} ${liked ? styles.liked : ''}`}
                  onClick={handleLike}
                  title="点赞"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {likeCount > 0 ? likeCount : '点赞'}
                </button>
                <button
                  className={`${styles.actionButton} ${favorited ? styles.favorited : ''}`}
                  onClick={handleFavorite}
                  title="收藏"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                  {favorited ? '已收藏' : '收藏'}
                </button>
                <button
                  className={styles.downloadButton}
                  onClick={handleDownload}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {t('certificate.download')}
                </button>
                <button
                  className={styles.shareButton}
                  onClick={handleShare}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  {t('certificate.share')}
                </button>
              </div>
            ) : (
              <div className={styles.fileCard}>
                <div className={styles.fileIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{t('certificate.fileNotUploaded')}</span>
                  <span className={styles.fileSize}>{t('certificate.fileUnderReview')}</span>
                </div>
              </div>
            )}
          </div>
        </div>

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

        {/* 页脚 */}
        <footer className={styles.footer}>
          <p>© 2025 EU-DOC 证书查询系统 · 版本 1.0.4</p>
        </footer>
      </div>
    </div>
  );
}
