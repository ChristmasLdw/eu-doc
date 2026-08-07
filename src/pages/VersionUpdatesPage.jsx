/**
 * EU-DOC - 版本更新历史
 */

import { useTranslation } from 'react-i18next';
import styles from './LegalPage.module.css';

const updates = [
  ['2026-08-04', 'v2.9.3', 'v293'],
  ['2026-08-04', 'v2.9.2', 'v292'],
  ['2026-07-30', 'v2.9.1', 'v291'],
  ['2026-07-27', '', 'jul27'],
  ['2026-07-26', 'v2.9.0', 'v290'],
  ['2026-07-24', '', 'jul24'],
  ['2026-07-22', '', 'jul22'],
  ['2026-07-21', 'v2.8.1', 'v281'],
  ['2026-07-18', 'v2.7.0', 'v270'],
  ['2026-07-08', 'v2.0', 'v20'],
  ['2026-06-30', 'v2.0', 'jun30'],
  ['2026-06-24', 'v2.5.0', 'v250'],
  ['2026-06-17', 'v1.8-v1.9', 'jun17'],
  ['2026-06-15', 'v1.1-v1.6', 'jun15'],
  ['2026-06-12', 'v0.2-v1.0.1', 'jun12'],
  ['2026-06-10', '', 'jun10'],
];

export default function VersionUpdatesPage() {
  const { t } = useTranslation();

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>{t('footer.versionUpdates')}</h1>
        <p className={styles.meta}>{t('footer.updateIntro')}</p>
        {updates.map(([date, version, key]) => (
          <section className={styles.section} key={`${date}-${version}`}>
            <h2>{version ? `${date} · ${version}` : date}</h2>
            <p>{t(`footer.updates.${key}`)}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
