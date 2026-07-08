import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ShareModal.module.css';

function cleanList(items = []) {
  return items.map((item) => String(item || '').trim()).filter(Boolean);
}

function buildShareCopy({ title, typeLabel, url, context, labels }) {
  const kind = context?.kind || 'document';
  const lines = [`【${labels.publicData}】`];

  if (kind === 'company') {
    lines.push(`${labels.type}: ${labels.companyPage}`);
    lines.push(`${labels.company}: ${context?.companyName || title}`);
  } else if (kind === 'product') {
    lines.push(`${labels.type}: ${labels.productPage}`);
    if (context?.companyName) lines.push(`${labels.company}: ${context.companyName}`);
    lines.push(`${labels.product}: ${context?.productName || title}`);
  } else {
    lines.push(`${labels.type}: ${context?.documentType || typeLabel || labels.productData}`);
    if (context?.companyName) lines.push(`${labels.company}: ${context.companyName}`);
    if (context?.productName) lines.push(`${labels.product}: ${context.productName}`);
    lines.push(`${labels.document}: ${context?.documentTitle || title}`);
    if (context?.documentCode) lines.push(`${labels.documentCode}: ${context.documentCode}`);
    if (context?.language) lines.push(`${labels.language}: ${String(context.language).toUpperCase()}`);
  }

  lines.push(`${labels.link}: ${url}`);
  lines.push(labels.note);
  return lines.filter(Boolean).join('\n');
}

export default function ShareModal({ open, onClose, title, subtitle, typeLabel, url, meta = [], context = {} }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const qrUrl = useMemo(() => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(url || '')}`, [url]);
  const labels = useMemo(() => ({
    publicData: t('share.publicData'),
    companyPage: t('share.companyPage'),
    productPage: t('share.productPage'),
    productData: t('share.productData'),
    type: t('share.type'),
    company: t('share.company'),
    product: t('share.product'),
    document: t('share.document'),
    documentCode: t('share.documentCode'),
    language: t('share.language'),
    link: t('share.link'),
    note: t('share.note'),
  }), [t]);
  const shareText = useMemo(() => buildShareCopy({ title, typeLabel, url, context, labels }), [title, typeLabel, url, context, labels]);

  useEffect(() => {
    if (!open) return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [open]);

  if (!open) return null;

  const copy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareText;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      setCopied(false);
    }
  };

  const companyLine = context.companyName || cleanList(meta)[1] || '';
  const productLine = context.productName || (context.kind === 'product' ? title : '');
  const documentLine = context.kind === 'document' ? (context.documentTitle || title) : '';
  const primaryLabel = context.kind === 'company' ? t('share.companyPage') : context.kind === 'product' ? t('share.productPage') : context.documentType || typeLabel || t('share.productData');

  return (
    <div className={styles.overlay} onClick={onClose} onWheel={(event) => event.preventDefault()} onTouchMove={(event) => event.preventDefault()}>
      <section className={styles.modal} onClick={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label={t('share.close')}>×</button>

        <div className={styles.shareHero}>
          <div className={styles.brandMark}>EU-DOC</div>
          <span>{primaryLabel}</span>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>

        <div className={styles.previewCard}>
          <div className={styles.cardTopLine}>
            <span>{typeLabel}</span>
            <em>{t('share.publicShare')}</em>
          </div>
          <div className={styles.cardBodyGrid}>
            <div className={styles.cardMainInfo}>
              {companyLine && <div><small>{t('share.company')}</small><strong>{companyLine}</strong></div>}
              {productLine && <div><small>{t('share.product')}</small><strong>{productLine}</strong></div>}
              {documentLine ? (
                <div className={styles.mergedInfoLine}>
                  <span><small>{t('share.shareDocument')}</small><strong>{documentLine}</strong></span>
                  <span><small>{t('share.viewAfterOpen')}</small><strong>{primaryLabel}</strong></span>
                </div>
              ) : <div><small>{t('share.viewAfterOpen')}</small><strong>{primaryLabel}</strong></div>}
            </div>
            <div className={styles.cardQrMini}>
              <img src={qrUrl} alt={t('share.qrAlt')} />
              <span>{t('share.scanToView')}</span>
            </div>
          </div>
          {meta.length > 0 && (
            <div className={styles.metaList}>
              {cleanList(meta).map((item) => <em key={item}>{item}</em>)}
            </div>
          )}
        </div>

        <div className={styles.shareGrid}>
          <div className={styles.qrBox}>
            <img src={qrUrl} alt={t('share.qrAlt')} />
            <strong>{t('share.qrShare')}</strong>
            <span>{t('share.qrDesc')}</span>
          </div>
          <div className={styles.linkBox}>
            <label>{t('share.copyLabel')}</label>
            <div className={styles.copyTextBox}>{shareText}</div>
            <button onClick={copy}>{copied ? t('share.copied') : t('share.copy')}</button>
            <p>{t('share.copyDesc')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
