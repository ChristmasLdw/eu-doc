/**
 * EU-DOC 后台管理 - 后台布局组件
 * 版本: 1.0.1
 *
 * 设计意图:
 * - 左侧固定侧边栏 + 右侧主内容区的经典后台布局
 * - 侧边栏包含导航菜单，顶部栏显示管理员信息
 * - 响应式：移动端侧边栏可折叠（通过汉堡菜单切换）
 * - 使用 Outlet 渲染子路由页面
 *
 * 知识点 - 什么是 Outlet？
 * Outlet 是 react-router-dom 提供的组件，用于「嵌套路由」。
 * AdminLayout 是一个「布局容器」，它定义了侧边栏和顶部栏的结构，
 * 而 Outlet 就是子页面内容插入的位置。
 * 例如访问 /admin/certificates 时，AdminLayout 渲染侧边栏，
 * CertificatesPage 的内容渲染在 Outlet 的位置。
 */

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';
import styles from './AdminLayout.module.css';

// 导航菜单配置
const navItems = [
  {
    to: '/admin',
    label: '仪表盘',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    end: true, // 精确匹配 /admin
  },
  {
    to: '/admin/certificates',
    label: '证书管理',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: '/admin/companies',
    label: '企业管理',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
        <path d="M10 6h4" />
        <path d="M10 10h4" />
        <path d="M10 14h4" />
        <path d="M10 18h4" />
      </svg>
    ),
  },
  {
    to: '/admin/logs',
    label: '操作日志',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3" />
        <circle cx="12" cy="12" r="10" />
        <path d="M3 12h1" />
        <path d="M20 12h1" />
        <path d="M12 3v1" />
        <path d="M12 20v1" />
      </svg>
    ),
  },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { admin, logout } = useAdmin();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // 点击导航项后关闭移动端侧边栏
  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className={styles.layout}>
      {/* 移动端遮罩层：点击关闭侧边栏 */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* 侧边栏 */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <span className={styles.logoText}>EU-DOC Admin</span>
        </div>

        {/* 导航菜单 */}
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
              onClick={handleNavClick}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* 底部退出按钮 */}
        <div className={styles.sidebarFooter}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className={styles.main}>
        {/* 顶部栏 */}
        <header className={styles.topbar}>
          {/* 移动端汉堡菜单按钮 */}
          <button
            className={styles.menuBtn}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="切换菜单"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className={styles.topbarRight}>
            <span className={styles.adminName}>
              {admin?.username || '管理员'}
            </span>
          </div>
        </header>

        {/* 页面内容区域 - Outlet 渲染子路由 */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
