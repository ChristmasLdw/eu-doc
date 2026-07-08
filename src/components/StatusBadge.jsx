/**
 * 证书状态标签组件
 * 版本: 1.0.1
 * 
 * 功能: 根据证书状态显示不同颜色的标签
 * 这是一个「可复用组件」——可以在多个页面中使用，保持样式一致
 */

import styles from './StatusBadge.module.css';
import { useTranslation } from 'react-i18next';

export default function StatusBadge({ status }) {
  const { t } = useTranslation();
  // 状态配置映射
  const config = {
    active: { label: t('certificate.status.active'), className: styles.active },
    expired: { label: t('certificate.status.expired'), className: styles.expired },
    revoked: { label: t('certificate.status.revoked'), className: styles.revoked },
  };

  const { label, className } = config[status] || config.active;

  return (
    <span className={`${styles.badge} ${className}`}>
      {/* 小圆点指示器 */}
      <span className={styles.dot} />
      {label}
    </span>
  );
}
