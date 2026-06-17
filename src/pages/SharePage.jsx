/**
 * EU-DOC 证书分享页面
 * 版本: 1.0.0
 *
 * 功能：
 * - 显示证书缩略图和基本信息
 * - 生成二维码供扫描
 * - 提供社交媒体分享按钮
 * - 类似小程序分享卡片的设计
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCertificate } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import styles from './SharePage.module.css';

export default function SharePage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const shareUrlRef = useRef(null);

  // 获取证书详情
  useEffect(() => {
    getCertificate(id)
      .then((data) => {
        if (data) {
          setCert(data);
          // 生成二维码
          const shareUrl = window.location.href.replace('/share/', '/certificate/');
          generateQRCode(shareUrl);
        } else {
          setError('证书不存在');
        }
      })
      .catch(() => {
        setError('加载失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // 生成二维码（使用第三方API）
  const generateQRCode = (url) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    setQrCodeUrl(qrUrl);
  };

  // 复制链接
  const handleCopyLink = () => {
    const shareUrl = window.location.href.replace('/share/', '/certificate/');
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // 分享到社交媒体
  const handleShare = (platform) => {
    const shareUrl = window.location.href.replace('/share/', '/certificate/');
    const title = cert ? `${cert.productName} - ${cert.companyName}` : 'EU-DOC 证书';
    const text = cert ? `查看 ${cert.productName} 的CE认证证书` : '查看证书详情';

    const urls = {
      wechat: shareUrl, // 微信需要扫码
      weibo: `https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(title)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    };

    if (platform === 'wechat') {
      // 微信分享显示二维码
      alert('请使用微信扫描二维码分享');
    } else if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <p>{error || '证书不存在'}</p>
          <Link to="/" className={styles.backBtn}>返回首页</Link>
        </div>
      </div>
    );
  }

  const shareUrl = window.location.href.replace('/share/', '/certificate/');

  return (
    <div className={styles.page}>
      {/* 分享卡片 */}
      <div className={styles.shareCard}>
        {/* 证书缩略图 */}
        {cert.thumbnailPath && (
          <div className={styles.thumbnail}>
            <img src={cert.thumbnailPath} alt={cert.productName} />
          </div>
        )}

        {/* 证书信息 */}
        <div className={styles.certInfo}>
          <div className={styles.certHeader}>
            <div className={styles.logo}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>EU-DOC</span>
            </div>
            <StatusBadge status={cert.status} expiryDate={cert.expiryDate} />
          </div>

          <h1 className={styles.productName}>{cert.productName}</h1>
          <p className={styles.companyName}>{cert.companyName}</p>

          <div className={styles.details}>
            <div className={styles.detailItem}>
              <span className={styles.label}>证书编号</span>
              <span className={styles.value}>{cert.certNo}</span>
            </div>
            {cert.standard && (
              <div className={styles.detailItem}>
                <span className={styles.label}>认证标准</span>
                <span className={styles.value}>{cert.standard}</span>
              </div>
            )}
            {cert.issuer && (
              <div className={styles.detailItem}>
                <span className={styles.label}>发证机构</span>
                <span className={styles.value}>{cert.issuer}</span>
              </div>
            )}
          </div>

          <Link to={`/certificate/${cert.id}`} className={styles.viewDetailBtn}>
            查看证书详情
          </Link>
        </div>

        {/* 二维码 */}
        <div className={styles.qrSection}>
          <h3 className={styles.qrTitle}>扫码查看证书</h3>
          {qrCodeUrl && (
            <div className={styles.qrCode}>
              <img src={qrCodeUrl} alt="QR Code" />
            </div>
          )}
          <p className={styles.qrHint}>使用手机扫描二维码</p>
        </div>
      </div>

      {/* 分享操作 */}
      <div className={styles.shareActions}>
        <h3 className={styles.shareTitle}>分享到</h3>

        <div className={styles.shareButtons}>
          <button className={styles.shareBtn} onClick={() => handleShare('wechat')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.5 11c.8 0 1.5-.7 1.5-1.5S9.3 8 8.5 8 7 8.7 7 9.5 7.7 11 8.5 11zM15.5 8c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5S16.3 8 15.5 8z"/>
              <path d="M12 2C6.5 2 2 5.9 2 10.7c0 2.5 1.2 4.8 3.2 6.3l-.7 2.8 3.2-1.6c1 .3 2.1.5 3.3.5 5.5 0 10-3.9 10-8.7S17.5 2 12 2z"/>
            </svg>
            <span>微信</span>
          </button>

          <button className={styles.shareBtn} onClick={() => handleShare('weibo')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.2 10.1c-.3-.1-.5-.1-.7 0-.2.1-.3.3-.2.5.5 1.5.1 3.1-.9 4.3-1.1 1.2-2.8 1.8-4.5 1.5-.3 0-.5.1-.6.4-.1.3.1.5.4.6 2 .4 4.1-.3 5.4-1.8 1.3-1.5 1.7-3.5 1.1-5.5zM18.8 7.7c-.5-.1-.8.2-.9.6-.1.4.2.8.6.9 2.4.5 4.1 2.5 4.1 5 0 .4.4.8.8.8.4 0 .8-.4.8-.8 0-3.3-2.3-6.1-5.4-6.5z"/>
              <path d="M15.5 11.5c-1.3-1.6-4.4-2-7.2-1-2.8 1.1-4.3 3.4-3.3 5.3 1 1.9 4.1 2.5 6.9 1.4 2.8-1.1 4.9-3.8 3.6-5.7zm-3.9 5.8c-2.2.9-4.6.3-5.4-1.2-.8-1.5.4-3.4 2.6-4.2 2.2-.9 4.6-.3 5.4 1.2.8 1.5-.4 3.4-2.6 4.2z"/>
            </svg>
            <span>微博</span>
          </button>

          <button className={styles.shareBtn} onClick={() => handleShare('twitter')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
            </svg>
            <span>Twitter</span>
          </button>

          <button className={styles.shareBtn} onClick={() => handleShare('facebook')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
            </svg>
            <span>Facebook</span>
          </button>
        </div>

        <button className={styles.copyLinkBtn} onClick={handleCopyLink}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <span>{copySuccess ? '已复制！' : '复制链接'}</span>
        </button>
      </div>
    </div>
  );
}
