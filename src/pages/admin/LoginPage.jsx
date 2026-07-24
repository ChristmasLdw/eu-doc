/**
 * EU-DOC 后台管理 - 登录页
 * 版本: 2.1.0
 */

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../../contexts/AdminContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAdmin();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/admin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError(t('authFlow.usernameRequired'));
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || t('authFlow.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card} data-tutorial="login-card">
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1 className={styles.title}>EU-DOC</h1>
        </div>
        <p className={styles.subtitle}>{t('authFlow.loginSubtitle')}</p>

        <form className={styles.form} onSubmit={handleSubmit} data-tutorial="login-form">
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">{t('auth.username')}</label>
            <input
              id="username"
              type="text"
              className={styles.input}
              placeholder={t('authFlow.usernamePlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">{t('auth.password')}</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder={t('authFlow.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <div style={{ marginTop: '8px', textAlign: 'right' }}>
              <Link to="/forgot-password" className={styles.link} style={{ fontSize: '14px' }}>
                {t('auth.forgotPassword')}
              </Link>
            </div>
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
            {loading ? t('authFlow.loggingIn') : t('auth.loginButton')}
          </button>
        </form>

        <div className={styles.footer}>
          {t('authFlow.noAccount')}
          <Link to="/admin/register" className={styles.link} data-tutorial="register-link">{t('auth.goToRegister')}</Link>
        </div>
      </div>
    </div>
  );
}
