/**
 * EU-DOC - 联系我们
 */

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './LegalPage.module.css';

export default function ContactPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>{t('contact.title')}</h1>

        <section className={styles.section}>
          <h2>{t('contact.businessInquiry.title')}</h2>
          <p>{t('contact.businessInquiry.description')}</p>
          <ul>
            <li>{t('contact.businessInquiry.email')}</li>
            <li>{t('contact.businessInquiry.phone')}</li>
          </ul>
          <p>{t('contact.businessInquiry.response')}</p>
        </section>

        <section className={styles.section}>
          <h2>{t('contact.technicalSupport.title')}</h2>
          <p>{t('contact.technicalSupport.description')}</p>
          <ul>
            <li>{t('contact.technicalSupport.email')}</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>{t('contact.partnership.title')}</h2>
          <p>{t('contact.partnership.description')}</p>
          <ul>
            <li>{t('contact.partnership.email')}</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>{t('contact.reportError.title')}</h2>
          <p>{t('contact.reportError.description')}</p>
        </section>

        <section className={styles.section}>
          <h2>{t('contact.officeAddress.title')}</h2>
          <p>
            {t('contact.officeAddress.address')}<br />
            {t('contact.officeAddress.postalCode')}
          </p>
        </section>


        <div className={styles.footer}>
          <Link to="/">{t('common.backToHome')}</Link>
          <Link to="/terms">{t('footer.terms')}</Link>
          <Link to="/privacy">{t('footer.privacy')}</Link>
          <Link to="/disclaimer">{t('footer.disclaimer')}</Link>
        </div>
      </div>
    </div>
  );
}
