/**
 * EU-DOC 证书详情页
 * 版本: 2.0.0
 *
 * 变更记录 (2.0.0):
 * - 添加多语言支持
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCertificate } from '../services/api';
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

  useEffect(() => {
    setLoading(true);
    setError(null);
    getCertificate(id)
      .then((data) => setCert(data))
      .catch((err) => {
        setError(err.message || t('messages.networkError'));
        setCert(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

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
          {/* 顶部：状态 + 证书编号 */}
          <div className={styles.certTop}>
            <StatusBadge status={cert.status} />
            <span className={styles.certNo}>{cert.certNo}</span>
          </div>

          {/* 标题区域 */}
          <div className={styles.certTitleSection}>
            <h1 className={styles.certTitle}>{cert.productName}</h1>
            <p className={styles.certCompany}>{cert.companyName}</p>
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
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>审核状态</span>
                    <span className={styles.infoValue}>
                      {cert.reviewStatus === 'approved' ? '已审核通过' : cert.reviewStatus === 'rejected' ? '已拒绝' : '待审核'}
                    </span>
                  </div>
                  {cert.remark && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>审核备注</span>
                      <span className={styles.infoValue}>{cert.remark}</span>
                    </div>
                  )}
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
            <h3 className={styles.sectionTitle}>证书文件</h3>
            {cert.fileUrl ? (
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
                  <span className={styles.fileSize}>PDF 文档 · 点击查看或下载</span>
                </div>
                <span className={styles.downloadButton}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  查看
                </span>
              </a>
            ) : (
              <div className={styles.fileCard}>
                <div className={styles.fileIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>证书文件暂未上传</span>
                  <span className={styles.fileSize}>该证书的 PDF 文件正在审核中</span>
                </div>
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
