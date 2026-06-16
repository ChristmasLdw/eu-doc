/**
 * 最近查看组件
 * 显示用户最近访问的证书列表
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRecentViews, clearRecentViews, removeRecentView } from '../utils/recentViews';
import StatusBadge from './StatusBadge';
import styles from './RecentViews.module.css';

export default function RecentViews() {
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
    if (window.confirm(t('recentViews.clearConfirm'))) {
      clearRecentViews();
      setRecentViews([]);
    }
  };

  const handleRemove = (id) => {
    removeRecentView(id);
    loadRecentViews();
  };

  if (recentViews.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {t('recentViews.title')}
        </h3>
        <button className={styles.clearBtn} onClick={handleClearAll}>
          {t('recentViews.clearAll')}
        </button>
      </div>

      <div className={styles.grid}>
        {recentViews.map((cert) => (
          <div key={cert.id} className={styles.card}>
            <Link to={`/certificate/${cert.id}`} className={styles.cardLink}>
              {cert.thumbnailUrl ? (
                <img src={cert.thumbnailUrl} alt={cert.productName} className={styles.thumbnail} />
              ) : (
                <div className={styles.thumbnailPlaceholder}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
              )}

              <div className={styles.content}>
                <div className={styles.header}>
                  <StatusBadge status={cert.status} />
                  <button
                    className={styles.removeBtn}
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemove(cert.id);
                    }}
                    title={t('recentViews.remove')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <h4 className={styles.productName}>{cert.productName}</h4>

                <div className={styles.meta}>
                  <span className={styles.certNo}>{cert.certNo}</span>
                  {cert.companyName && (
                    <span className={styles.company}>{cert.companyName}</span>
                  )}
                </div>

                {cert.issueDate && (
                  <div className={styles.date}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {cert.issueDate}
                  </div>
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
