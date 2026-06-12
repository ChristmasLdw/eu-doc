/**
 * EU-DOC 导航栏组件
 * 版本: 1.0.2
 *
 * 变更记录 (1.0.2):
 * - 未登录时显示"登录"和"注册"两个按钮
 * - 已登录普通用户显示"我的上传"和"退出"
 * - 已登录管理员显示"管理后台"和"退出"
 *
 * 功能: 顶部固定导航栏，包含 Logo 和导航链接
 * 设计: 半透明背景 + 模糊效果（毛玻璃），滚动时显示底部边框
 */

import { Link, useLocation } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  // useLocation() 获取当前 URL 路径，用于高亮当前页面的导航链接
  const location = useLocation();
  // useAdmin() 获取用户登录状态和角色，用于判断显示哪些导航按钮
  const { admin, isAdmin, logout } = useAdmin();

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        {/* Logo 区域 */}
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            {/* 简单的盾牌图标，象征安全和认证 */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <span className={styles.logoText}>EU-DOC</span>
        </Link>

        {/* 导航链接 */}
        <div className={styles.navLinks}>
          <Link
            to="/"
            className={`${styles.navLink} ${location.pathname === '/' ? styles.active : ''}`}
          >
            首页
          </Link>
          <Link
            to="/search"
            className={`${styles.navLink} ${location.pathname.startsWith('/search') ? styles.active : ''}`}
          >
            查询证书
          </Link>

          {/* 根据登录状态和角色显示不同的导航按钮 */}
          {!admin ? (
            /* 未登录：显示登录和注册按钮 */
            <>
              <Link
                to="/admin/register"
                className={`${styles.navLink} ${styles.registerLink}`}
              >
                注册
              </Link>
              <Link
                to="/admin/login"
                className={`${styles.navLink} ${styles.loginLink}`}
              >
                登录
              </Link>
            </>
          ) : isAdmin ? (
            /* 管理员：显示管理后台和退出 */
            <Link
              to="/admin"
              className={`${styles.navLink} ${styles.adminLink} ${location.pathname.startsWith('/admin') ? styles.active : ''}`}
            >
              管理后台
            </Link>
          ) : (
            /* 普通用户：显示我的上传和退出 */
            <Link
              to="/admin"
              className={`${styles.navLink} ${styles.userLink}`}
            >
              我的上传
            </Link>
          )}

          {/* 已登录用户显示退出按钮 */}
          {admin && (
            <button
              className={styles.logoutBtn}
              onClick={logout}
            >
              退出
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
