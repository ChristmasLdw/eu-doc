/**
 * EU-DOC 历史记录页面
 * 显示用户最近访问的证书
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRecentViews, clearRecentViews, removeRecentView } from '../utils/recentViews';
import StatusBadge from '../components/StatusBadge';
import styles from './HistoryPage.module.css';

export default function HistoryPage() {
  const { t } = useTranslation();
  const [recentViews, setRecentViews] = useState([]);

  useEffect(() => {
    loadRecentViews();
  }, []);

  const loadRecentViews = () => {
    const views = getRecentViews();
    setRecentViews(views);
  };

  const handleClearAll = () => {
    if (window.confirm(t('history.clearConfirm'))) {
      clearRecentViews();
      setRecentViews([]);
    }
  };

  const handleRemove = (id) => {
    removeRecentView(id);
    loadRecentViews();
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {t('history.title')}
            </h1>
            <p className={styles.subtitle}>{t('history.subtitle')}</p>
          </div>
          {recentViews.length > 0 && (
            <button className={styles.clearBtn} onClick={handleClearAll}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              {t('history.clearAll')}
            </button>
          )}
        </div>

        {recentViews.length === 0 ? (
          <div className={styles.empty}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <h3>{t('history.empty')}</h3>
            <p>{t('history.emptyHint')}</p>
            <Link to="/" className={styles.homeBtn}>
              {t('history.goHome')}
            </Link>
          </div>
        ) : (
          <div className={styles.list}>
            {recentViews.map((cert) => (
              <div key={cert.id} className={styles.item}>
                <Link to={`/documents/${cert.id}`} className={styles.itemLink}>
                  {/* 左侧：缩略图或占位符 */}
                  <div className={styles.thumbnail}>
                    {cert.thumbnailUrl ? (
                      <img src={cert.thumbnailUrl} alt={cert.productName} />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    )}
                  </div>

                  {/* 中间：证书信息 */}
                  <div className={styles.info}>
                    <div className={styles.row1}>
                      <h3 className={styles.productName}>{cert.productName}</h3>
                      <StatusBadge status={cert.status} />
                    </div>
                    <div className={styles.row2}>
                      <span className={styles.certNo}>{cert.certNo}</span>
                      {cert.companyName && (
                        <>
                          <span className={styles.separator}>·</span>
                          <span className={styles.company}>{cert.companyName}</span>
                        </>
                      )}
                      {cert.category && (
                        <>
                          <span className={styles.separator}>·</span>
                          <span className={styles.category}>{cert.category}</span>
                        </>
                      )}
                    </div>
                    <div className={styles.row3}>
                      {cert.issueDate && (
                        <span className={styles.date}>
                          {t('history.issueDate')}: {cert.issueDate}
                        </span>
                      )}
                      {cert.viewedAt && (
                        <span className={styles.viewedAt}>
                          {t('history.viewedAt')}: {new Date(cert.viewedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 右侧：箭头 */}
                  <div className={styles.arrow}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </Link>

                {/* 删除按钮 */}
                <button
                  className={styles.removeBtn}
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemove(cert.id);
                  }}
                  title={t('history.remove')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
