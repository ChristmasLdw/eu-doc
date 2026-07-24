/**
 * 重复证书警告组件
 * 当用户尝试上传已存在的证书时显示
 */

import { useTranslation } from 'react-i18next';
import styles from './DuplicateWarning.module.css';

export default function DuplicateWarning({ existingCert, onCancel, onContinue }) {
  const { t } = useTranslation();

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.iconWarning}>⚠️</div>
          <h3>{t('duplicate.title')}</h3>
        </div>

        <div className={styles.body}>
          <p className={styles.message}>{t('duplicate.message')}</p>

          <div className={styles.certInfo}>
            <h4>{t('duplicate.existingCert')}</h4>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.label}>{t('certificate.certNo')}:</span>
                <span className={styles.value}>{existingCert.certNo}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>{t('certificate.productName')}:</span>
                <span className={styles.value}>{existingCert.productName}</span>
              </div>
              {existingCert.companyName && (
                <div className={styles.infoRow}>
                  <span className={styles.label}>{t('certificate.company')}:</span>
                  <span className={styles.value}>{existingCert.companyName}</span>
                </div>
              )}
              <div className={styles.infoRow}>
                <span className={styles.label}>{t('certificate.issueDate')}:</span>
                <span className={styles.value}>{existingCert.issueDate || '-'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>{t('certificate.expiryDate')}:</span>
                <span className={styles.value}>{existingCert.expiryDate || '-'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>{t('certificate.statusLabel')}:</span>
                <span className={`${styles.value} ${styles.statusBadge}`}>
                  {t(`certificate.${existingCert.status}`)}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.notice}>
            <span className={styles.noticeIcon}>ℹ️</span>
            <p>{t('duplicate.notice')}</p>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            {t('duplicate.cancel')}
          </button>
          <button className={styles.viewBtn} onClick={() => window.open(`/documents/${existingCert.id}`, '_blank')}>
            {t('duplicate.viewExisting')}
          </button>
          {onContinue && (
            <button className={styles.continueBtn} onClick={onContinue}>
              {t('duplicate.continueAnyway')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
