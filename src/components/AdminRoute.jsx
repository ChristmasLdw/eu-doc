/**
 * EU-DOC 后台管理 - 路由保护组件
 * 版本: 1.0.1
 *
 * 设计意图:
 * - 包裹需要登录才能访问的路由
 * - 未登录时自动重定向到 /admin/login
 * - 登录验证中显示加载状态
 *
 * 知识点 - 什么是「路由守卫」？
 * 在前端应用中，有些页面（如管理后台）需要用户先登录才能访问。
 * 如果用户直接在浏览器输入 /admin 地址，需要拦截并跳转到登录页。
 * 这个拦截逻辑就是「路由守卫」或「路由保护」。
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../contexts/AdminContext';

export default function AdminRoute({ children }) {
  const { admin, loading } = useAdmin();
  const location = useLocation();
  const { t } = useTranslation();

  // 正在验证 token，显示加载状态
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-family)',
      }}>
        {t('authFlow.checkingLogin')}
      </div>
    );
  }

  // 未登录，重定向到登录页
  // state.from 记录用户原本想访问的页面，登录成功后可以跳回去
  if (!admin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // 已登录，渲染子组件（实际页面）
  return children;
}
