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

import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminRoute from './components/AdminRoute';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import CompanyPage from './pages/CompanyPage';
import PersonalLibraryPage from './pages/PersonalLibraryPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import DisclaimerPage from './pages/DisclaimerPage';
import EnterpriseAgreementPage from './pages/EnterpriseAgreementPage';
import UploadCommitmentPage from './pages/UploadCommitmentPage';
import CompanyVerificationPage from './pages/CompanyVerificationPage';
import ContactPage from './pages/ContactPage';
import GuidePage from './pages/GuidePage';
import SolutionsPage from './pages/SolutionsPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import EmailVerifyPage from './pages/EmailVerifyPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TutorialDemoPage from './pages/TutorialDemoPage';
import LoginPage from './pages/admin/LoginPage';
import RegisterPage from './pages/admin/RegisterPage';
import AdminV2Page from './pages/admin/AdminV2Page';
import PublicOnboardingGuide from './components/TutorialAssistant/PublicOnboardingGuide';
import { useAdmin } from './contexts/AdminContext';

function App() {
  const location = useLocation();
  const { isAdmin } = useAdmin();
  // 邮箱验证、密码重置保持独立页面；登录/注册显示公共导航栏，保持前后台一体感
  const authPages = ['/verify-email', '/forgot-password', '/reset-password'];
  const isAuthPage = authPages.includes(location.pathname);
  const isProtectedAdminPage = (location.pathname === '/admin' || location.pathname.startsWith('/admin/') || location.pathname.startsWith('/admin-v2')) && !location.pathname.startsWith('/admin/login') && !location.pathname.startsWith('/admin/register');
  const isAdminPage = isProtectedAdminPage;

  return (
    <>
      {/* 公共导航栏 - 除了认证页面，所有页面都显示 */}
      {!isAuthPage && <Navbar />}

      {!isAuthPage && <PublicOnboardingGuide />}

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

        {/* 个人资料库：收藏与浏览历史 */}
        <Route path="/favorites" element={<PersonalLibraryPage mode="favorites" />} />
        <Route path="/history" element={<PersonalLibraryPage mode="history" />} />

        {/* 产品管理页面 - v2.0 新增 */}
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
        <Route path="/files/:id" element={<Navigate to={location.pathname.replace('/files/', '/documents/')} replace />} />

        {/*
          证书详情页
          :id 是一个「动态路由参数」，可以匹配任意值
          例如 /certificate/CERT-001 会匹配到这里，params.id = 'CERT-001'
        */}
        <Route path="/certificate/:id" element={<Navigate to={location.pathname.replace('/certificate/', '/documents/')} replace />} />

        {/* 证书分享页 */}
        <Route path="/share/:id" element={<Navigate to={location.pathname.replace('/share/', '/documents/')} replace />} />

        {/* 公司详情页 */}
        <Route path="/companies/:id" element={<CompanyPage />} />
        <Route path="/company/:id" element={<Navigate to={location.pathname.replace('/company/', '/companies/')} replace />} />

        {/* 法律文档页面 */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />
        <Route path="/enterprise-agreement" element={<EnterpriseAgreementPage />} />
        <Route path="/upload-commitment" element={<UploadCommitmentPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/solutions" element={<SolutionsPage />} />

        {/* 用户引导内部审阅页面，不作为正式用户入口 */}
        <Route path="/tutorial-demo" element={<TutorialDemoPage />} />

        {/* 用户认证相关页面 */}
        <Route path="/verify-email" element={<EmailVerifyPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* 企业认证申请页面 */}
        <Route path="/company-verification" element={<CompanyVerificationPage />} />


        {/* ===== 后台管理路由 ===== */}
        {/* 登录页 - 不需要登录保护 */}
        <Route path="/admin/login" element={<LoginPage />} />
        {/* 注册页 - 不需要登录保护 */}
        <Route path="/admin/register" element={<RegisterPage />} />

        {/* 新后台 v2 已替换旧后台：/admin 作为正式后台入口，/admin-v2 保留为兼容跳转 */}
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminV2Page />
            </AdminRoute>
          }
        />
        <Route path="/admin-v2/*" element={<Navigate to="/admin" replace />} />
      </Routes>

      {/* 公共页脚 - 除了认证页面和后台管理页面 */}
      {!isAuthPage && !isAdminPage && <Footer />}
    </>
  );
}

export default App;
