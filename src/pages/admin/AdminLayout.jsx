/**
 * EU-DOC 后台管理 - 后台布局组件 v2.2
 * 统一后台布局，支持基于角色的菜单权限控制
 */

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';
import { checkMenuPermission, getPermissionHint } from '../../config/menuPermissions';
import styles from './AdminLayout.module.css';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { admin, logout } = useAdmin();
  const navigate = useNavigate();

  // 导航菜单配置（带权限控制）
  const navItems = [
    {
      key: 'home',
      to: '/',
      label: '返回前台',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      ),
      isExternal: true,
      permissionKey: null, // 不需要权限检查
    },
    {
      key: 'dashboard',
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
      end: true,
      permissionKey: 'dashboard',
    },
    {
      key: 'products',
      to: '/admin/products',
      label: '产品管理',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      ),
      permissionKey: 'products',
    },
    {
      key: 'documents',
      to: '/admin/documents',
      label: '资料管理',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      permissionKey: 'documents',
    },
    {
      key: 'company',
      to: '/admin/company',
      label: '我的企业',
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
      permissionKey: 'company',
    },
    {
      key: 'members',
      to: '/admin/members',
      label: '团队成员',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      permissionKey: 'members',
    },
    {
      key: 'companyVerifications',
      to: '/admin/company-verifications',
      label: '企业认证审核',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      permissionKey: 'companyVerifications',
    },
    {
      key: 'uploadConfirmations',
      to: '/admin/upload-confirmations',
      label: '上传确认记录',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
      permissionKey: 'uploadConfirmations',
    },
    {
      key: 'settings',
      to: '/admin/settings',
      label: '个人设置',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
      permissionKey: 'settings',
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  // 检查菜单权限并处理点击
  const handleMenuClick = (e, item) => {
    if (item.isExternal) return; // 外部链接直接放行

    // 检查权限
    const hasPermission = item.permissionKey
      ? checkMenuPermission(item.permissionKey, admin)
      : true;

    if (!hasPermission) {
      e.preventDefault();
      const hint = getPermissionHint(item.permissionKey);
      alert(hint || '您没有权限访问此功能');
      return;
    }

    handleNavClick();
  };

  return (
    <div className={styles.layout}>
      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* 左侧边栏 */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* Logo */}
        <div className={styles.logo}>
          <h2>EU-DOC</h2>
          <span>管理后台</span>
        </div>

        {/* 导航菜单 */}
        <nav className={styles.nav}>
          {navItems.map((item) => {
            // 检查权限
            const hasPermission = item.permissionKey
              ? checkMenuPermission(item.permissionKey, admin)
              : true;

            const hint = !hasPermission ? getPermissionHint(item.permissionKey) : '';

            return (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive && !item.isExternal ? styles.navActive : ''} ${!hasPermission ? styles.navDisabled : ''}`
                }
                onClick={(e) => handleMenuClick(e, item)}
                title={hint}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* 底部用户信息和退出 */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{admin?.display_name || admin?.email}</span>
            <span className={styles.userEmail}>{admin?.email}</span>
          </div>
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
            <span className={styles.adminName}>{admin?.display_name || admin?.email}</span>
          </div>
        </header>

        {/* 页面内容区域 */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
