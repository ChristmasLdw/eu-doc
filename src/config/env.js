/**
 * EU-DOC 前端环境变量配置
 * 统一管理所有环境变量，避免硬编码
 */

export const ENV = {
  // 应用基础路径
  BASE_PATH: import.meta.env.VITE_APP_BASE_PATH || '/eu-doc',

  // API 服务器地址
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3007/api',

  // 是否为开发环境
  IS_DEV: import.meta.env.DEV,

  // 是否为生产环境
  IS_PROD: import.meta.env.PROD,
};

// 辅助函数：构建完整的 API URL
export function apiUrl(path) {
  // 确保 path 以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${ENV.API_BASE_URL}${normalizedPath}`;
}

// 辅助函数：构建完整的前端路径
export function appPath(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${ENV.BASE_PATH}${normalizedPath}`;
}

export default ENV;
