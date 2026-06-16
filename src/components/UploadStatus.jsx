/**
 * 上传状态追踪组件
 * 显示证书的上传和审核状态
 */

import { useTranslation } from 'react-i18next';
import styles from './UploadStatus.module.css';

export default function UploadStatus({ status, reviewStatus, uploadDate, reviewDate }) {
  const { t } = useTranslation();

  // 状态步骤定义
  const steps = [
    {
      key: 'uploaded',
      label: t('uploadStatus.uploaded'),
      icon: '📤',
      active: status !== null
    },
    {
      key: 'pending',
      label: t('uploadStatus.pendingReview'),
      icon: '⏳',
      active: reviewStatus === 'pending'
    },
    {
      key: 'reviewed',
      label: reviewStatus === 'approved' ? t('uploadStatus.approved') : t('uploadStatus.rejected'),
      icon: reviewStatus === 'approved' ? '✅' : '❌',
      active: reviewStatus === 'approved' || reviewStatus === 'rejected'
    }
  ];

  // 获取当前步骤索引
  const getCurrentStep = () => {
    if (reviewStatus === 'approved' || reviewStatus === 'rejected') return 2;
    if (reviewStatus === 'pending') return 1;
    if (status) return 0;
    return -1;
  };

  const currentStep = getCurrentStep();

  return (
    <div className={styles.container}>
      <div className={styles.timeline}>
        {steps.map((step, index) => (
          <div
            key={step.key}
            className={`${styles.step} ${index <= currentStep ? styles.active : ''} ${
              index === currentStep ? styles.current : ''
            }`}
          >
            <div className={styles.stepIcon}>
              {step.icon}
            </div>
            <div className={styles.stepContent}>
              <div className={styles.stepLabel}>{step.label}</div>
              {index === 0 && uploadDate && (
                <div className={styles.stepDate}>{new Date(uploadDate).toLocaleDateString()}</div>
              )}
              {index === 2 && reviewDate && (
                <div className={styles.stepDate}>{new Date(reviewDate).toLocaleDateString()}</div>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`${styles.connector} ${index < currentStep ? styles.connectorActive : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* 状态说明 */}
      <div className={styles.statusInfo}>
        {reviewStatus === 'pending' && (
          <div className={styles.infoPending}>
            <span className={styles.infoIcon}>ℹ️</span>
            <span>{t('uploadStatus.pendingMessage')}</span>
          </div>
        )}
        {reviewStatus === 'approved' && (
          <div className={styles.infoSuccess}>
            <span className={styles.infoIcon}>✓</span>
            <span>{t('uploadStatus.approvedMessage')}</span>
          </div>
        )}
        {reviewStatus === 'rejected' && (
          <div className={styles.infoError}>
            <span className={styles.infoIcon}>✕</span>
            <span>{t('uploadStatus.rejectedMessage')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
