/**
 * EU-DOC 导航栏组件
 * 版本: 2.1.0
 *
 * 变更记录 (2.1.0):
 * - 导航按钮图标化（首页、搜索、历史）
 * - 合并语言切换为单按钮
 * - 统一图标风格，简洁不喧宾夺主
 * - 固定尺寸，避免语言切换导致布局变化
 *
 * 功能: 顶部固定导航栏，包含 Logo、图标化导航链接、语言切换、主题切换
 * 设计: 半透明背景 + 模糊效果（毛玻璃），滚动时显示底部边框
 */

import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../contexts/AdminContext';
import { useTheme } from '../contexts/ThemeContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const location = useLocation();
  const { admin, isAdmin, logout } = useAdmin();
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  // 切换语言
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        {/* Logo 区域 */}
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <span className={styles.logoText}>EU-DOC</span>
        </Link>

        {/* 导航链接 - 图标化 */}
        <div className={styles.navLinks}>
          <Link
            to="/"
            className={`${styles.navLink} ${location.pathname === '/' ? styles.active : ''}`}
            title={t('nav.home')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Link>
          <Link
            to="/search"
            className={`${styles.navLink} ${location.pathname.startsWith('/search') ? styles.active : ''}`}
            title={t('nav.search')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </Link>
          <Link
            to="/history"
            className={`${styles.navLink} ${location.pathname === '/history' ? styles.active : ''}`}
            title={t('nav.history')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </Link>
        </div>

        {/* 右侧工具栏 */}
        <div className={styles.right}>
          {/* 语言切换 - 单按钮切换 */}
          <button
            className={styles.toggleBtn}
            onClick={() => changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
            title={i18n.language === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span className={styles.toggleLabel}>{i18n.language === 'zh' ? '中' : 'EN'}</span>
          </button>

          {/* 主题切换 */}
          <button
            className={styles.toggleBtn}
            onClick={toggleTheme}
            title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>

          {/* 用户相关 */}
          {admin ? (
            <>
              {isAdmin ? (
                <Link
                  to="/admin"
                  className={`${styles.navLink} ${styles.adminLink} ${location.pathname.startsWith('/admin') ? styles.active : ''}`}
                >
                  {t('nav.admin')}
                </Link>
              ) : (
                <Link
                  to="/admin"
                  className={`${styles.navLink} ${styles.userLink}`}
                >
                  我的上传
                </Link>
              )}

              <button
                className={styles.logoutBtn}
                onClick={logout}
              >
                {t('admin.logout')}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
