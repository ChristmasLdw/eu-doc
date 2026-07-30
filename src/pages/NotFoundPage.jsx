import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.code}>404</div>
        <p className={styles.eyebrow}>{t('notFound.eyebrow')}</p>
        <h1>{t('notFound.title')}</h1>
        <p className={styles.description}>{t('notFound.description')}</p>
        <div className={styles.actions}>
          <Link className={styles.primary} to="/">{t('notFound.backHome')}</Link>
          <Link className={styles.secondary} to="/search">{t('notFound.search')}</Link>
        </div>
      </section>
    </main>
  );
}
