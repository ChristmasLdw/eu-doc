/**
 * EU-DOC 后台管理 - 注册页
 * 版本: 1.0.2
 *
 * 设计意图:
 * - 居中的注册卡片，暗色主题与登录页风格一致
 * - 字段：用户名、密码、确认密码、企业名称（可选）
 * - 注册成功后自动登录并跳转到首页
 * - "已有账号？去登录"链接
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';
import styles from './RegisterPage.module.css';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAdmin();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 前端校验
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    if (username.trim().length < 3 || username.trim().length > 20) {
      setError('用户名长度需在 3-20 个字符之间');
      return;
    }

    if (password.length < 6 || password.length > 30) {
      setError('密码长度需在 6-30 个字符之间');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await register(username.trim(), password, companyName.trim() || undefined);
      // 注册成功后自动登录，跳转到首页
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || '注册失败，请稍后重试');
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
        <p className={styles.subtitle}>创建账号</p>

        {/* 注册表单 */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              className={styles.input}
              placeholder="3-20 个字符"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="6-30 个字符"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirmPassword">确认密码</label>
            <input
              id="confirmPassword"
              type="password"
              className={styles.input}
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="companyName">企业名称（可选）</label>
            <input
              id="companyName"
              type="text"
              className={styles.input}
              placeholder="填写后上传证书将自动关联此企业"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
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
            {loading ? '注册中...' : '注 册'}
          </button>
        </form>

        {/* 已有账号链接 */}
        <div className={styles.footer}>
          已有账号？
          <Link to="/admin/login" className={styles.link}>去登录</Link>
        </div>
      </div>
    </div>
  );
}
