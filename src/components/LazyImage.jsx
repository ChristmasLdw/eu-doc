/**
 * 懒加载图片组件
 * 版本: 2.0.0
 * - 添加多语言支持
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './LazyImage.module.css';

export default function LazyImage({ src, alt, className, ...props }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { t } = useTranslation();

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* 骨架屏占位 */}
      {loading && !error && (
        <div className={styles.skeleton}>
          <div className={styles.spinner}></div>
        </div>
      )}

      {/* 加载失败 */}
      {error && (
        <div className={styles.errorPlaceholder}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>{t('common.imageLoadFailed')}</span>
        </div>
      )}

      {/* 实际图片 */}
      {!error && (
        <img
          src={src}
          alt={alt}
          className={`${styles.image} ${loading ? styles.hidden : styles.visible}`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          {...props}
        />
      )}
    </div>
  );
}
