/**
 * EU-DOC 前台/后台 - API 服务层
 * 版本: 1.0.3
 *
 * 变更记录 (1.0.3):
 * - 修正 getCertificates() 参数名匹配后端实际接口（search/pageSize/sortBy/sortOrder）
 * - 新增 toCamelCase() 字段映射：将后端 snake_case 转为前端 camelCase
 * - 新增 mapCertificate() 专门处理证书对象的字段映射
 * - getCertificates() 返回值增加 pagination 字段
 * - getCertificate() 返回值自动做字段映射
 *
 * 变更记录 (1.0.2):
 * - 新增 register() - 用户注册
 * - 新增 getUsers() - 获取用户列表（管理员）
 * - 新增 reviewCertificate() - 审核证书（管理员）
 * - 新增 getCertificatesWithReview() - 获取所有审核状态的证书（管理员）
 *
 * 设计意图:
 * - 集中封装所有后端 API 调用，其他组件只需调用这里的函数
 * - 自动附加 JWT token，处理 401 自动跳转登录
 * - 单一职责：只负责网络请求，不包含业务逻辑
 * - 后端数据库使用 snake_case（如 cert_no），前端 JS 习惯用 camelCase（如 certNo）
 *   字段映射集中在 api.js 中完成，前端页面代码无需关心命名差异
 *
 * 知识点 - 为什么需要 API 服务层？
 * 如果每个组件都直接写 fetch 请求，会有这些问题：
 * 1. 重复代码：每个组件都要写 baseURL、token 处理、错误处理
 * 2. 难维护：后端接口地址变了，要改很多地方
 * 3. 难测试：无法单独测试 API 逻辑
 * 把所有请求集中到一个文件，就是「单一职责原则」的体现。
 */

// 使用相对路径，由 Vite 开发服务器代理到后端（见 vite.config.js 的 server.proxy 配置）
// 生产环境部署时，需要通过 Nginx 等反向代理将 /api 转发到后端服务
const BASE_URL = '/eu-doc/api';

/**
 * 创建请求头
 * 自动从 localStorage 读取 JWT token 并附加到 Authorization 头
 */
function createHeaders(customHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  const token = localStorage.getItem('admin_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * 通用请求函数
 * 处理所有 HTTP 请求的公共逻辑：token 附加、401 跳转、JSON 解析
 */
async function request(url, options = {}) {
  const { headers: customHeaders, raw, ...restOptions } = options;

  // 如果是 FormData（文件上传），不设置 Content-Type，让浏览器自动设置 boundary
  const isFormData = options.body instanceof FormData;
  const headers = isFormData
    ? createHeaders({ ...customHeaders, 'Content-Type': undefined })
    : createHeaders(customHeaders);

  // 删除 Content-Type 为 undefined 的条目
  if (headers['Content-Type'] === undefined) {
    delete headers['Content-Type'];
  }

  try {
    const response = await fetch(`${BASE_URL}${url}`, { ...restOptions, headers });

    // 401 未授权 -> 清除 token 并跳转登录页
    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      // 只在非登录/注册页时跳转，避免死循环
      if (!window.location.pathname.includes('/admin/login') && !window.location.pathname.includes('/admin/register')) {
        window.location.href = `${BASENAME}/admin/login`;
      }
      throw new Error('登录已过期，请重新登录');
    }

    // 204 No Content（如删除成功）
    if (response.status === 204) return null;

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `请求失败 (${response.status})`);
    }

    // raw 模式：返回完整的响应体（不解包 data 字段）
    // 用于需要访问 data 之外字段的情况（如 pagination）
    if (raw) return data;

    return data.data !== undefined ? data.data : data;
  } catch (error) {
    // 网络错误等非 HTTP 错误
    if (error.message === 'Failed to fetch') {
      throw new Error('网络连接失败，请检查后端服务是否运行');
    }
    throw error;
  }
}

// ===== 字段映射工具 =====

/**
 * 将 snake_case 字符串转为 camelCase
 * 例如: 'cert_no' -> 'certNo', 'company_name' -> 'companyName'
 *
 * 知识点 - 为什么需要这个转换？
 * 后端数据库和 API 通常使用 snake_case（Python/SQL 惯例），
 * 前端 JavaScript 习惯使用 camelCase。
 * 集中在一个地方做转换，比在每个组件里手动映射要整洁得多。
 */
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 将对象的 snake_case 键名转为 camelCase
 * 递归处理，支持嵌套对象和数组
 */
function keysToCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(keysToCamelCase);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    // 递归处理嵌套对象和数组
    result[toCamelCase(key)] = typeof value === 'object' && value !== null
      ? keysToCamelCase(value)
      : value;
  }
  return result;
}

/**
 * 证书对象字段映射（snake_case -> camelCase）
 * 同时处理 file_path -> fileUrl, thumbnail_path -> thumbnailUrl 等特殊映射
 *
 * 设计意图:
 * 后端存储的是 file_path 和 thumbnail_path，但前端期望的是 fileUrl 和 thumbnailUrl。
 * 这里统一转换，让前端页面代码保持与 mockData 一致的数据结构。
 */
// 获取应用的 basename（与 vite.config.js 的 base 和 BrowserRouter 的 basename 一致）
const BASENAME = '/eu-doc';

function mapCertificate(cert) {
  if (!cert) return null;
  const mapped = keysToCamelCase(cert);
  // 后端字段 file_path/thumbnail_path 对应前端 fileUrl/thumbnailUrl
  // 需要添加 basename 前缀，因为部署在 /eu-doc/ 子路径下
  if (mapped.filePath !== undefined) {
    mapped.fileUrl = mapped.filePath ? `${BASENAME}${mapped.filePath}` : null;
    delete mapped.filePath;
  }
  if (mapped.thumbnailPath !== undefined) {
    mapped.thumbnailUrl = mapped.thumbnailPath ? `${BASENAME}${mapped.thumbnailPath}` : null;
    delete mapped.thumbnailPath;
  }
  return mapped;
}

// ===== 认证相关 API =====

/** 用户注册（注册成功后自动登录，返回 token 和用户信息） */
export function register(username, password, companyName) {
  const body = { username, password };
  if (companyName) body.company_name = companyName;
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** 用户登录 */
export function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

/** 获取当前用户信息（验证 token 有效性） */
export function getMe() {
  return request('/auth/me');
}

/** 获取用户列表（仅管理员） */
export function getUsers() {
  return request('/auth/users');
}

/** 修改密码 */
export function updatePassword(oldPassword, newPassword) {
  return request('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

// ===== 证书管理 API =====

/** 获取证书列表（支持分页、搜索、筛选、排序）
 *
 * 参数说明（与后端 API 参数名一致）:
 * - search: 搜索关键词（匹配 cert_no, product_name, model）
 * - category: 按类别筛选
 * - status: 按状态筛选（active/expired/revoked）
 * - issuer: 按发证机构筛选
 * - standard: 按认证标准筛选
 * - reviewStatus: 按审核状态筛选（管理员用）
 * - page: 页码（默认 1）
 * - pageSize: 每页条数（默认 10）
 * - sortBy: 排序字段（默认 created_at）
 * - sortOrder: 排序方向（ASC/DESC，默认 DESC）
 *
 * 返回值: { data: [证书数组(已映射为camelCase)], pagination: { page, pageSize, total, totalPages } }
 */
export function getCertificates(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.pageSize) query.set('pageSize', params.pageSize);
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.category) query.set('category', params.category);
  if (params.issuer) query.set('issuer', params.issuer);
  if (params.standard) query.set('standard', params.standard);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  // 支持按审核状态筛选（管理员查看所有状态的证书）
  if (params.reviewStatus) query.set('reviewStatus', params.reviewStatus);

  return request(`/certificates?${query.toString()}`, { raw: true }).then((response) => {
    // raw 模式返回完整响应: { data: [...], pagination: {...} }
    // 对每条证书做字段映射
    if (response && Array.isArray(response.data)) {
      response.data = response.data.map(mapCertificate);
    }
    // pagination 也做 camelCase 映射（page_size -> pageSize, total_pages -> totalPages）
    if (response && response.pagination) {
      response.pagination = keysToCamelCase(response.pagination);
    }
    return response;
  });
}

/** 获取单个证书详情（返回值已映射为 camelCase） */
export function getCertificate(id) {
  return request(`/certificates/${id}`).then(mapCertificate);
}

/** 创建证书 */
export function createCertificate(data) {
  return request('/certificates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 更新证书 */
export function updateCertificate(id, data) {
  return request(`/certificates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/** 删除证书 */
export function deleteCertificate(id) {
  return request(`/certificates/${id}`, { method: 'DELETE' });
}

/** 审核证书（仅管理员） */
export function reviewCertificate(id, status, remark) {
  return request(`/certificates/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify({ status, remark }),
  });
}

/** 上传证书 PDF 文件 */
export function uploadCertificateFile(id, file) {
  const formData = new FormData();
  formData.append('file', file);
  return request(`/certificates/${id}/upload`, {
    method: 'POST',
    body: formData,
  });
}

// ===== 企业管理 API =====

/** 获取企业列表（支持搜索和分页） */
export function getCompanies(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.pageSize) query.set('pageSize', params.pageSize);
  if (params.search) query.set('search', params.search);
  const qs = query.toString();
  return request(`/companies${qs ? `?${qs}` : ''}`).then((data) => {
    if (Array.isArray(data)) {
      return { data: data.map(keysToCamelCase) };
    }
    if (data && Array.isArray(data.data)) {
      data.data = data.data.map(keysToCamelCase);
    }
    return data;
  });
}

/** 获取企业详情（包含该企业的所有证书） */
export function getCompany(id) {
  return request(`/companies/${id}`).then((data) => {
    // 将证书列表中的证书也做字段映射
    if (data && Array.isArray(data.certificates)) {
      data.certificates = data.certificates.map(mapCertificate);
    }
    const mapped = keysToCamelCase(data);
    // 处理 logo_path -> logoUrl 映射
    if (mapped.logoPath !== undefined) {
      mapped.logoUrl = mapped.logoPath ? `${BASENAME}${mapped.logoPath}` : null;
      delete mapped.logoPath;
    }
    return mapped;
  });
}

/** 创建企业 */
export function createCompany(data) {
  return request('/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 更新企业 */
export function updateCompany(id, data) {
  return request(`/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/** 删除企业 */
export function deleteCompany(id) {
  return request(`/companies/${id}`, { method: 'DELETE' });
}

/** 上传企业Logo */
export function uploadCompanyLogo(id, file) {
  const formData = new FormData();
  formData.append('logo', file);
  return request(`/companies/${id}/logo`, {
    method: 'POST',
    body: formData,
  });
}

// ===== 统计相关 API =====

/** 获取统计总览（返回值已映射为 camelCase） */
export function getStats() {
  return request('/stats/overview').then(keysToCamelCase);
}

/** 获取最近操作日志 */
export function getRecentLogs() {
  return request('/stats/recent');
}

/** 获取用户个人统计数据（已登录用户） */
export function getUserStats() {
  return request('/stats/user').then((data) => {
    // 映射字段名为 camelCase
    const mapped = keysToCamelCase(data);
    // 映射 recentUploads 中的证书对象
    if (mapped && Array.isArray(mapped.recentUploads)) {
      mapped.recentUploads = mapped.recentUploads.map(mapCertificate);
    }
    return mapped;
  });
}

// ===== 证书错误报告 API =====

/** 提交证书错误报告 */
export function submitReport(certId, reportType, description, reporterEmail, reporterName) {
  return request('/reports', {
    method: 'POST',
    body: JSON.stringify({
      certId,
      reportType,
      description,
      reporterEmail,
      reporterName,
    }),
  });
}

/** 获取报告列表（管理员） */
export function getReports(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.certId) query.set('certId', params.certId);
  if (params.page) query.set('page', params.page);
  if (params.pageSize) query.set('pageSize', params.pageSize);
  const qs = query.toString();
  return request(`/reports${qs ? `?${qs}` : ''}`, { raw: true }).then((response) => {
    if (response && Array.isArray(response.data)) {
      response.data = response.data.map(keysToCamelCase);
    }
    if (response && response.pagination) {
      response.pagination = keysToCamelCase(response.pagination);
    }
    return response;
  });
}

/** 获取单个报告详情（管理员） */
export function getReport(id) {
  return request(`/reports/${id}`).then(keysToCamelCase);
}

/** 更新报告状态（管理员） */
export function updateReportStatus(id, status, adminResponse) {
  return request(`/reports/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, adminResponse }),
  });
}

/** 检查重复证书 */
export function checkDuplicates(certId) {
  return request(`/reports/check-duplicates/${certId}`).then(keysToCamelCase);
}

