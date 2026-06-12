/**
 * EU-DOC 后台管理 - 登录页
 * 版本: 1.0.2
 *
 * 变更记录 (1.0.2):
 * - 添加"没有账号？去注册"链接
 *
 * 设计意图:
 * - 居中的登录卡片，暗色主题与前台风格一致
 * - 用户名 + 密码输入框 + 登录按钮
 * - 登录成功后跳转到后台首页（或之前想访问的页面）
 * - 错误提示显示在表单下方
 */

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  // 登录成功后跳转：优先跳转到之前想访问的页面，否则跳转到后台首页
  const from = location.state?.from?.pathname || '/admin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || '登录失败，请检查用户名和密码');
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
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1 className={styles.title}>EU-DOC Admin</h1>
        </div>
        <p className={styles.subtitle}>后台管理系统</p>

        {/* 登录表单 */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              className={styles.input}
              placeholder="请输入用户名"
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
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        {/* 注册链接 */}
        <div className={styles.footer}>
          没有账号？
          <Link to="/admin/register" className={styles.link}>去注册</Link>
        </div>
      </div>
    </div>
  );
}
