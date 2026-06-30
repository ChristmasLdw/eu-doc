import { useMemo, useState } from 'react';
import styles from './ShareModal.module.css';

export default function ShareModal({ open, onClose, title, subtitle, typeLabel, url, meta = [] }) {
  const [copied, setCopied] = useState(false);
  const qrUrl = useMemo(() => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(url || '')}`, [url]);

  if (!open) return null;

  const copy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="关闭分享窗口">×</button>
        <div className={styles.previewCard}>
          <span>{typeLabel}</span>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
          {meta.length > 0 && (
            <div className={styles.metaList}>
              {meta.filter(Boolean).map((item) => <em key={item}>{item}</em>)}
            </div>
          )}
        </div>
        <div className={styles.shareGrid}>
          <div className={styles.qrBox}>
            <img src={qrUrl} alt="分享二维码" />
            <strong>扫码查看</strong>
            <span>适合贴到产品、包装、说明书或发给审核人员。</span>
          </div>
          <div className={styles.linkBox}>
            <label>分享链接</label>
            <div className={styles.urlBox}>{url}</div>
            <button onClick={copy}>{copied ? '已复制链接' : '复制分享链接'}</button>
            <p>对方打开后会直接进入对应的公开页面，而不是只看到一串链接。</p>
          </div>
        </div>
      </section>
    </div>
  );
}
