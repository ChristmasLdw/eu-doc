/**
 * EU-DOC 后台管理 - 注册页
 * 版本: 2.1.0
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../../contexts/AdminContext';
import styles from './RegisterPage.module.css';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAdmin();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 前端校验
    if (!email.trim() || !password.trim()) {
      setError(t('authFlow.emailPasswordRequired'));
      return;
    }

    // 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('authFlow.invalidEmail'));
      return;
    }

    if (password.length < 6) {
      setError(t('authFlow.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('authFlow.passwordMismatch'));
      return;
    }

    // 检查是否同意协议
    if (!agreedToTerms) {
      setError(t('authFlow.termsRequired'));
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim() || undefined);
      // 注册成功后自动登录，跳转到后台（引导用户创建企业）
      navigate('/admin/company', { replace: true });
    } catch (err) {
      setError(err.message || t('authFlow.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <h1 className={styles.title}>EU-DOC</h1>
        </div>
        <p className={styles.subtitle}>{t('authFlow.registerSubtitle')}</p>

        {/* 注册表单 */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">{t('authFlow.email')} *</label>
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

          <div className={styles.field}>
            <label className={styles.label} htmlFor="displayName">{t('authFlow.displayName')}</label>
            <input
              id="displayName"
              type="text"
              className={styles.input}
              placeholder={t('authFlow.displayNamePlaceholder')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">{t('auth.password')} *</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder={t('authFlow.passwordMinPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirmPassword">{t('auth.confirmPassword')} *</label>
            <input
              id="confirmPassword"
              type="password"
              className={styles.input}
              placeholder={t('authFlow.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {/* 用户协议勾选 */}
          <div className={styles.agreementField}>
            <label className={styles.agreementLabel}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.agreementText}>
                {t('authFlow.agreePrefix')}
                <Link to="/terms" target="_blank" className={styles.agreementLink}>
                  {t('auth.userAgreement')}
                </Link>
                {t('auth.and')}
                <Link to="/privacy" target="_blank" className={styles.agreementLink}>
                  {t('auth.privacyPolicy')}
                </Link>
              </span>
            </label>
          </div>

          {/* 错误提示 */}
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
            {loading ? t('authFlow.registering') : t('auth.registerButton')}
          </button>
        </form>

        {/* 已有账号链接 */}
        <div className={styles.footer}>
          {t('auth.hasAccount')}
          <Link to="/admin/login" className={styles.link}>{t('auth.goToLogin')}</Link>
        </div>
      </div>
    </div>
  );
}
