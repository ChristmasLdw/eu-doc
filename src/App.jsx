/**
 * EU-DOC 证书查询系统 - 应用根组件
 * 版本: 2.0.0
 *
 * 变更记录 (2.0.0):
 * - 添加 /terms 和 /privacy 路由（法律文档页面）
 * - 法律页面也显示导航栏
 *
 * 功能:
 * - 定义页面路由（URL 与组件的对应关系）
 * - 渲染公共布局（导航栏 + 页面内容）
 * - 后台管理路由（需登录保护）
 *
 * 路由配置说明:
 * / -> 首页（搜索入口）
 * /search -> 搜索结果页
 * /certificate/:id -> 证书详情页
 * /company/:id -> 公司详情页
 * /terms -> 用户服务协议
 * /privacy -> 隐私政策
 * /admin/login -> 管理后台登录页
 * /admin/register -> 用户注册页
 * /admin -> 管理后台布局（需登录，包含子路由）
 *   /admin -> 仪表盘
 *   /admin/certificates -> 证书管理
 *   /admin/companies -> 企业管理
 *   /admin/logs -> 操作日志
 */

import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import AdminRoute from './components/AdminRoute';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import CertificatePage from './pages/CertificatePage';
import CompanyPage from './pages/CompanyPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import LoginPage from './pages/admin/LoginPage';
import RegisterPage from './pages/admin/RegisterPage';
import AdminLayout from './pages/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import CertificatesPage from './pages/admin/CertificatesPage';
import CompaniesPage from './pages/admin/CompaniesPage';
import LogsPage from './pages/admin/LogsPage';

function App() {
  const location = useLocation();
  // 后台管理页面有自己的侧边栏导航，不显示前台 Navbar
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <>
      {/* 公共导航栏 - 仅在前台页面显示 */}
      {!isAdminPage && <Navbar />}

      {/*
        Routes 定义 URL 路径与页面组件的映射关系
        Route 的 path 属性定义 URL 路径
        element 属性定义该路径渲染哪个组件
      */}
      <Routes>
        {/* ===== 前台路由 ===== */}
        {/* 首页：搜索入口 */}
        <Route path="/" element={<HomePage />} />

        {/* 搜索结果页 */}
        <Route path="/search" element={<SearchPage />} />

        {/*
          证书详情页
          :id 是一个「动态路由参数」，可以匹配任意值
          例如 /certificate/CERT-001 会匹配到这里，params.id = 'CERT-001'
        */}
        <Route path="/certificate/:id" element={<CertificatePage />} />

        {/* 公司详情页 */}
        <Route path="/company/:id" element={<CompanyPage />} />

        {/* 法律文档页面 */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* ===== 后台管理路由 ===== */}
        {/* 登录页 - 不需要登录保护 */}
        <Route path="/admin/login" element={<LoginPage />} />
        {/* 注册页 - 不需要登录保护 */}
        <Route path="/admin/register" element={<RegisterPage />} />

        {/*
          后台管理布局 - 需要登录保护
          AdminRoute 包裹 AdminLayout，未登录会重定向到 /admin/login
          AdminLayout 内部使用 Outlet 渲染子路由
        */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          {/* 默认子路由：仪表盘 */}
          <Route index element={<DashboardPage />} />
          {/* 证书管理 */}
          <Route path="certificates" element={<CertificatesPage />} />
          {/* 企业管理 */}
          <Route path="companies" element={<CompaniesPage />} />
          {/* 操作日志 */}
          <Route path="logs" element={<LogsPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
