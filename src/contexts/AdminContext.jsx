/**
 * EU-DOC 后台管理 - 用户认证 Context
 * 版本: 1.0.2
 *
 * 变更记录 (1.0.2):
 * - state 新增 role 字段（区分管理员 admin 和普通用户 user）
 * - 新增 register 方法（用户注册，注册后自动登录）
 * - 新增 isAdmin 计算属性（role === 'admin'）
 * - login 方法适配新的返回值结构（包含 role）
 *
 * 设计意图:
 * - 用 React Context 管理全局的登录状态，所有子组件都可以访问
 * - 页面刷新时自动验证 token 是否仍然有效
 * - 提供 login / register / logout / updateAdmin 方法供组件调用
 *
 * 知识点 - 什么是 Context？
 * React 的 props 传递是「逐层向下」的（父 -> 子 -> 孙）。
 * 如果一个状态（如登录信息）需要被很多深层组件使用，逐层传递 props 会很繁琐。
 * Context 就是解决这个问题的：在顶层创建一个「共享数据源」，任何子组件都可以直接读取。
 *
 * 知识点 - 什么是 useReducer？
 * useReducer 是 useState 的「升级版」，适合管理复杂状态。
 * useState 只能 set 一个值，useReducer 可以根据不同的 action 类型执行不同的逻辑。
 * 类比：useState 像是「直接赋值」，useReducer 像是「发指令」。
 */

import { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import * as api from '../services/api';

// ===== 状态类型定义 =====
// 初始状态：未登录
const initialState = {
  admin: null,       // 用户信息对象 { id, username, role, company_name, ... }
  token: null,        // JWT token
  loading: true,      // 是否正在验证（初始化时为 true，验证完成后变 false）
  error: null,        // 错误信息
};

// ===== Reducer：根据 action 类型更新状态 =====
function adminReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { ...state, admin: action.payload.admin, token: action.payload.token, loading: false, error: null };
    case 'LOGIN_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'LOGOUT':
      return { ...initialState, loading: false };
    case 'UPDATE_ADMIN':
      return { ...state, admin: { ...state.admin, ...action.payload } };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// ===== 创建 Context =====
const AdminContext = createContext(null);

// ===== Provider 组件：包裹在应用顶层，提供状态给所有子组件 =====
export function AdminProvider({ children }) {
  const [state, dispatch] = useReducer(adminReducer, initialState);

  // 页面加载时自动验证 token 有效性
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    // 有 token，调用 /auth/me 验证是否仍然有效
    api.getMe()
      .then((admin) => {
        dispatch({ type: 'LOGIN_SUCCESS', payload: { admin, token } });
      })
      .catch(() => {
        // token 无效，清除并恢复未登录状态
        localStorage.removeItem('admin_token');
        dispatch({ type: 'LOGOUT' });
      });
  }, []);

  // 登录方法
  const login = useCallback(async (username, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const data = await api.login(username, password);
      // 后端返回 { success, token, admin: { id, username, role, ... } }
      localStorage.setItem('admin_token', data.token);
      dispatch({ type: 'LOGIN_SUCCESS', payload: { admin: data.admin, token: data.token } });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAIL', payload: error.message });
      throw error;
    }
  }, []);

  // 注册方法（注册成功后自动登录）
  const register = useCallback(async (username, password, companyName) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const data = await api.register(username, password, companyName);
      // 后端返回 { success, token, user: { id, username, role, ... } }
      localStorage.setItem('admin_token', data.token);
      dispatch({ type: 'LOGIN_SUCCESS', payload: { admin: data.user, token: data.token } });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAIL', payload: error.message });
      throw error;
    }
  }, []);

  // 登出方法
  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    dispatch({ type: 'LOGOUT' });
  }, []);

  // 更新用户信息
  const updateAdmin = useCallback((updates) => {
    dispatch({ type: 'UPDATE_ADMIN', payload: updates });
  }, []);

  // isAdmin 计算属性：判断当前用户是否为管理员
  // useMemo 缓存计算结果，避免每次渲染都重新计算
  const isAdmin = useMemo(() => state.admin?.role === 'admin', [state.admin?.role]);

  const value = useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    updateAdmin,
    isAdmin,
  }), [state, login, register, logout, updateAdmin, isAdmin]);

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

// ===== 自定义 Hook：方便组件使用 Context =====
// 知识点 - 为什么用自定义 Hook 而不是直接 useContext？
// 自定义 Hook 可以封装额外的逻辑（如参数校验），且语义更清晰。
// 如果直接写 useContext(AdminContext)，忘记用 Provider 包裹时不会报错，只会得到 null。
// 在自定义 Hook 里可以加判断，给出更友好的错误提示。
export function useAdmin() {
  const context = useContext(AdminContext);
  // 容错处理：HMR 热更新时 Context 可能短暂为 null
  if (!context) {
    return {
      admin: null, token: null, loading: false, error: null,
      isAdmin: false,
      login: async () => {}, register: async () => {},
      logout: () => {}, updateAdmin: () => {},
    };
  }
  return context;
}
