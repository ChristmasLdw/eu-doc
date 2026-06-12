/**
 * EU-DOC 主题管理 Context
 * 版本: 1.0.0
 *
 * 功能:
 * - 提供明亮/暗黑主题切换
 * - 持久化主题选择到 localStorage
 * - 自动应用主题到 document.documentElement
 *
 * 使用:
 * import { useTheme } from './contexts/ThemeContext';
 * const { theme, toggleTheme } = useTheme();
 */

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // 从 localStorage 读取用户偏好，默认为 light
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    // 应用主题到 document 的 data-theme 属性
    document.documentElement.setAttribute('data-theme', theme);
    // 持久化到 localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
