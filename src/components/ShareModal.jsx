import { useEffect, useMemo, useState } from 'react';
import styles from './ShareModal.module.css';

function cleanList(items = []) {
  return items.map((item) => String(item || '').trim()).filter(Boolean);
}

function buildShareCopy({ title, typeLabel, url, context }) {
  const kind = context?.kind || 'document';
  const lines = ['【EU-DOC 公开资料】'];

  if (kind === 'company') {
    lines.push('类型：企业资料主页');
    lines.push(`公司：${context?.companyName || title}`);
  } else if (kind === 'product') {
    lines.push('类型：产品资料页');
    if (context?.companyName) lines.push(`公司：${context.companyName}`);
    lines.push(`产品：${context?.productName || title}`);
  } else {
    lines.push(`类型：${context?.documentType || typeLabel || '产品资料'}`);
    if (context?.companyName) lines.push(`公司：${context.companyName}`);
    if (context?.productName) lines.push(`产品：${context.productName}`);
    lines.push(`资料：${context?.documentTitle || title}`);
    if (context?.documentCode) lines.push(`编号：${context.documentCode}`);
    if (context?.language) lines.push(`语言：${String(context.language).toUpperCase()}`);
  }

  lines.push(`链接：${url}`);
  lines.push('说明：本链接用于查看企业公开的产品资料。');
  return lines.filter(Boolean).join('\n');
}

export default function ShareModal({ open, onClose, title, subtitle, typeLabel, url, meta = [], context = {} }) {
  const [copied, setCopied] = useState(false);
  const qrUrl = useMemo(() => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(url || '')}`, [url]);
  const shareText = useMemo(() => buildShareCopy({ title, typeLabel, url, context }), [title, typeLabel, url, context]);

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
  const primaryLabel = context.kind === 'company' ? '企业资料主页' : context.kind === 'product' ? '产品资料页' : context.documentType || typeLabel || '产品资料';

  return (
    <div className={styles.overlay} onClick={onClose} onWheel={(event) => event.preventDefault()} onTouchMove={(event) => event.preventDefault()}>
      <section className={styles.modal} onClick={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="关闭分享窗口">×</button>

        <div className={styles.shareHero}>
          <div className={styles.brandMark}>EU-DOC</div>
          <span>{primaryLabel}</span>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>

        <div className={styles.previewCard}>
          <div className={styles.cardTopLine}>
            <span>{typeLabel}</span>
            <em>公开资料分享</em>
          </div>
          <div className={styles.cardBodyGrid}>
            <div className={styles.cardMainInfo}>
              {companyLine && <div><small>公司</small><strong>{companyLine}</strong></div>}
              {productLine && <div><small>产品</small><strong>{productLine}</strong></div>}
              {documentLine ? (
                <div className={styles.mergedInfoLine}>
                  <span><small>分享资料</small><strong>{documentLine}</strong></span>
                  <span><small>打开后可查看</small><strong>{primaryLabel}</strong></span>
                </div>
              ) : <div><small>打开后可查看</small><strong>{primaryLabel}</strong></div>}
            </div>
            <div className={styles.cardQrMini}>
              <img src={qrUrl} alt="分享二维码" />
              <span>扫码查看</span>
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
            <img src={qrUrl} alt="分享二维码" />
            <strong>二维码分享</strong>
            <span>适合贴到产品、包装、说明书，或发给客户、采购方和审核人员。</span>
          </div>
          <div className={styles.linkBox}>
            <label>复制分享说明</label>
            <div className={styles.copyTextBox}>{shareText}</div>
            <button onClick={copy}>{copied ? '已复制分享说明' : '复制分享说明'}</button>
            <p>说明已包含必要身份信息和访问链接，适合直接发送给客户、采购方或审核人员。</p>
          </div>
        </div>
      </section>
    </div>
  );
}
