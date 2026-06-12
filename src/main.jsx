/**
 * EU-DOC 证书查询系统 - 主入口文件
 * 版本: 1.0.1
 *
 * 这里是整个应用的入口点。主要做了三件事：
 * 1. 用 BrowserRouter 包裹整个应用，启用前端路由功能
 * 2. 用 AdminProvider 提供管理员登录状态（全局共享）
 * 3. 引入全局样式
 *
 * 知识点 - Provider 的包裹顺序很重要：
 * BrowserRouter 在最外层（因为路由是基础功能），
 * AdminProvider 在内层（因为它需要用到路由的 navigate 功能）。
 * 如果顺序反了，AdminProvider 内部使用 useNavigate 会报错。
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AdminProvider } from './contexts/AdminContext';
import './styles/global.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename="/eu-doc">
      <AdminProvider>
        <App />
      </AdminProvider>
    </BrowserRouter>
  </StrictMode>,
);
