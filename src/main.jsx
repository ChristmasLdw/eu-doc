/**
 * EU-DOC 证书查询系统 - 主入口文件
 * 版本: 2.0.0
 *
 * 变更记录 (2.0.0):
 * - 添加多语言支持 (i18n)
 * - 添加主题管理 (ThemeProvider)
 * - 初始化 i18n 配置
 *
 * 这里是整个应用的入口点。主要做了四件事：
 * 1. 初始化多语言系统
 * 2. 用 BrowserRouter 包裹整个应用，启用前端路由功能
 * 3. 用 ThemeProvider 提供主题切换功能（明亮/暗黑）
 * 4. 用 AdminProvider 提供管理员登录状态（全局共享）
 *
 * 知识点 - Provider 的包裹顺序很重要：
 * BrowserRouter 在最外层（因为路由是基础功能），
 * ThemeProvider 在中间层（主题切换），
 * AdminProvider 在内层（因为它需要用到路由的 navigate 功能）。
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AdminProvider } from './contexts/AdminContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './i18n'; // 初始化 i18n
import './styles/global.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename="/eu-doc">
      <ThemeProvider>
        <AdminProvider>
          <App />
        </AdminProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
