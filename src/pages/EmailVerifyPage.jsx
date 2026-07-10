/**
 * EU-DOC - 邮箱验证页面
 * 用户点击邮件中的验证链接后跳转到此页面
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './EmailVerifyPage.module.css';

export default function EmailVerifyPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying / success / error
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('authFlow.invalidVerifyLink'));
      return;
    }

    verifyEmail(token);
  }, [token, t]);

  const verifyEmail = async (token) => {
    try {
      const response = await fetch('/eu-doc/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(t('authFlow.verifySuccessMessage'));

        // 3秒后跳转到登录页
        setTimeout(() => {
          navigate('/admin/login');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.message || t('authFlow.verifyFailed'));
      }
    } catch (err) {
      setStatus('error');
      setMessage(t('authFlow.verifyFailedRetry'));
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            {status === 'verifying' && (
              <svg className={styles.spinner} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
            )}
            {status === 'success' && (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )}
            {status === 'error' && (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
          </div>
        </div>

        {/* 标题 */}
        <h1 className={styles.title}>
          {status === 'verifying' && t('authFlow.verifyEmailChecking')}
          {status === 'success' && t('authFlow.verifySuccess')}
          {status === 'error' && t('authFlow.verifyFailed')}
        </h1>

        {/* 消息 */}
        <p className={styles.message}>{message}</p>

        {/* 操作按钮 */}
        <div className={styles.actions}>
          {status === 'success' && (
            <p className={styles.hint}>{t('authFlow.redirectToLogin')}</p>
          )}
          {status === 'error' && (
            <Link to="/admin/login" className={styles.btn}>
              {t('authFlow.backToLogin')}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
