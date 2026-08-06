/**
 * EU-DOC - 全局页脚组件
 */

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Footer.module.css';

export default function Footer() {
  const { t } = useTranslation();
  const updates = [
    ['2026-08-04', 'v2.9.3', t('footer.updates.v293')],
    ['2026-08-04', 'v2.9.2', t('footer.updates.v292')],
    ['2026-07-30', 'v2.9.1', t('footer.updates.v291')],
    ['2026-07-27', '', t('footer.updates.jul27')],
    ['2026-07-26', 'v2.9.0', t('footer.updates.v290')],
    ['2026-07-24', '', t('footer.updates.jul24')],
    ['2026-07-22', '', t('footer.updates.jul22')],
    ['2026-07-21', 'v2.8.1', t('footer.updates.v281')],
    ['2026-07-18', 'v2.7.0', t('footer.updates.v270')],
    ['2026-07-08', 'v2.0', t('footer.updates.v20')],
    ['2026-06-30', 'v2.0', t('footer.updates.jun30')],
    ['2026-06-24', 'v2.5.0', t('footer.updates.v250')],
    ['2026-06-17', 'v1.8-v1.9', t('footer.updates.jun17')],
    ['2026-06-15', 'v1.1-v1.6', t('footer.updates.jun15')],
    ['2026-06-12', 'v0.2-v1.0.1', t('footer.updates.jun12')],
    ['2026-06-10', '', t('footer.updates.jun10')],
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.links}>
          <Link to="/solutions">{t('footer.solutions')}</Link>
          <Link to="/guide">{t('footer.guide')}</Link>
          <Link to="/terms">{t('footer.terms')}</Link>
          <Link to="/privacy">{t('footer.privacy')}</Link>
          <Link to="/disclaimer">{t('footer.disclaimer')}</Link>
          <Link to="/upload-commitment">{t('footer.uploadCommitment')}</Link>
          <Link to="/enterprise-agreement">{t('footer.enterpriseAgreement')}</Link>
          <Link to="/contact">{t('footer.contact')}</Link>
        </div>
        <details className={styles.updates}>
          <summary>{t('footer.versionUpdates')}</summary>
          <p className={styles.updateIntro}>{t('footer.updateIntro')}</p>
          <div className={styles.updateList}>
            {updates.map(([date, version, text]) => (
              <div className={styles.updateItem} key={`${date}-${version}`}>
                <time dateTime={date}>{date}</time>
                {version && <strong>{version}</strong>}
                <span>{text}</span>
              </div>
            ))}
          </div>
        </details>
        <div className={styles.copyright}>
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  );
}
