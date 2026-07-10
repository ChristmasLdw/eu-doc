/**
 * EU-DOC - 忘记密码页面
 * 用户输入邮箱，系统发送密码重置链接
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './admin/LoginPage.module.css';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError(t('authFlow.emailRequired'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('authFlow.invalidEmail'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/eu-doc/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // 开发环境：显示 token（生产环境应发送到邮箱）
        if (data.resetToken) {
          setResetToken(data.resetToken);
        }
      } else {
        setError(data.message || t('authFlow.sendFailed'));
      }
    } catch (err) {
      setError(t('authFlow.networkError'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h1 className={styles.title}>{t('authFlow.emailSent')}</h1>
          </div>
          <p className={styles.subtitle}>
            {t('authFlow.emailSentDesc')}
          </p>

          {resetToken && (
            <div style={{ marginTop: '20px', padding: '16px', background: '#f7fafc', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>
                <strong>{t('authFlow.devHint')}</strong>
              </p>
              <p style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '12px' }}>
                {t('authFlow.devResetHint')}
              </p>
              <Link
                to={`/reset-password?token=${resetToken}`}
                className={styles.link}
                style={{ wordBreak: 'break-all' }}
              >
                {t('authFlow.resetPassword')}
              </Link>
            </div>
          )}

          <div className={styles.footer} style={{ marginTop: '24px' }}>
            <Link to="/admin/login" className={styles.link}>{t('authFlow.backToLogin')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className={styles.title}>{t('authFlow.forgotTitle')}</h1>
        </div>
        <p className={styles.subtitle}>{t('authFlow.forgotSubtitle')}</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">{t('authFlow.email')}</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          {error && (
            <div className={styles.error}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? t('authFlow.sending') : t('authFlow.sendResetLink')}
          </button>
        </form>

        <div className={styles.footer}>
          <Link to="/admin/login" className={styles.link}>{t('authFlow.backToLogin')}</Link>
        </div>
      </div>
    </div>
  );
}
