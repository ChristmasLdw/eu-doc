/**
 * EU-DOC - 重置密码页面
 * 用户从邮件点击链接后，输入新密码
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './admin/LoginPage.module.css';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError(t('authFlow.invalidResetLinkMissing'));
    }
  }, [token, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(t('authFlow.invalidResetLink'));
      return;
    }

    if (!newPassword.trim()) {
      setError(t('authFlow.newPasswordRequired'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('authFlow.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('authFlow.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/eu-doc/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // 3秒后跳转到登录页
        setTimeout(() => {
          navigate('/admin/login');
        }, 3000);
      } else {
        setError(data.message || t('authFlow.resetFailed'));
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
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className={styles.title}>{t('authFlow.resetSuccess')}</h1>
          </div>
          <p className={styles.subtitle}>{t('authFlow.resetSuccessDesc')}</p>
          <p className={styles.subtitle} style={{ fontSize: '14px', color: '#a0aec0' }}>
            {t('authFlow.redirectToLogin')}
          </p>
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
          <h1 className={styles.title}>{t('authFlow.resetTitle')}</h1>
        </div>
        <p className={styles.subtitle}>{t('authFlow.resetSubtitle')}</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="newPassword">{t('authFlow.newPassword')}</label>
            <input
              id="newPassword"
              type="password"
              className={styles.input}
              placeholder={t('authFlow.passwordMinPlaceholder')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirmPassword">{t('authFlow.confirmNewPassword')}</label>
            <input
              id="confirmPassword"
              type="password"
              className={styles.input}
              placeholder={t('authFlow.confirmNewPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
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
            disabled={loading || !token}
          >
            {loading ? t('authFlow.resetting') : t('authFlow.resetPassword')}
          </button>
        </form>

        <div className={styles.footer}>
          <Link to="/admin/login" className={styles.link}>{t('authFlow.backToLogin')}</Link>
        </div>
      </div>
    </div>
  );
}
