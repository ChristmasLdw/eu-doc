/**
 * EU-DOC - 全局页脚组件
 */

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Footer.module.css';

export default function Footer() {
  const { t } = useTranslation();

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
        <div className={styles.copyright}>
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  );
}
