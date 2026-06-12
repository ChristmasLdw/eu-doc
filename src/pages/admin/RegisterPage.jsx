/**
 * EU-DOC 后台管理 - 注册页
 * 版本: 2.0.0
 *
 * 变更记录 (2.0.0):
 * - 添加多语言支持
 * - 添加用户协议和隐私政策勾选
 * - 适配明亮/暗黑主题
 *
 * 设计意图:
 * - 居中的注册卡片，支持主题切换
 * - 字段：用户名、密码、确认密码、企业名称（可选）
 * - 必须同意协议才能注册
 * - 注册成功后自动登录并跳转到首页
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../../contexts/AdminContext';
import styles from './RegisterPage.module.css';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAdmin();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 前端校验
    if (!username.trim() || !password.trim()) {
      setError(t('messages.registerFailed'));
      return;
    }

    if (username.trim().length < 3 || username.trim().length > 20) {
      setError(t('messages.registerFailed'));
      return;
    }

    if (password.length < 6 || password.length > 30) {
      setError(t('messages.registerFailed'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('messages.registerFailed'));
      return;
    }

    // 检查是否同意协议
    if (!agreedToTerms) {
      setError(t('auth.mustAgree'));
      return;
    }

    setLoading(true);
    try {
      await register(username.trim(), password, companyName.trim() || undefined);
      // 注册成功后自动登录，跳转到首页
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || t('messages.registerFailed'));
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
        <p className={styles.subtitle}>{t('auth.registerTitle')}</p>

        {/* 注册表单 */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">{t('auth.username')}</label>
            <input
              id="username"
              type="text"
              className={styles.input}
              placeholder="3-20"
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
              placeholder="6-30"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
            <input
              id="confirmPassword"
              type="password"
              className={styles.input}
              placeholder={t('auth.confirmPassword')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="companyName">{t('auth.companyName')}</label>
            <input
              id="companyName"
              type="text"
              className={styles.input}
              placeholder={t('auth.companyName')}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
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
                {t('auth.agreement')}
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
            {loading ? t('common.loading') : t('auth.registerButton')}
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
