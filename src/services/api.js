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
function createHeaders(customHeaders = {}, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (!options.skipAuth) {
    const token = localStorage.getItem('admin_token');
    if (token && !/[\r\n]/.test(token)) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (token) {
      localStorage.removeItem('admin_token');
    }
  }

  return headers;
}

/**
 * 通用请求函数
 * 处理所有 HTTP 请求的公共逻辑：token 附加、401 跳转、JSON 解析
 */
async function request(url, options = {}) {
  const { headers: customHeaders, raw, skipAuth, silentAuth, ...restOptions } = options;

  // 如果是 FormData（文件上传），不设置 Content-Type，让浏览器自动设置 boundary
  const isFormData = options.body instanceof FormData;
  const headers = createHeaders(customHeaders, { skipAuth });

  // FormData 上传时必须让浏览器自动生成 Content-Type 和 boundary
  if (isFormData) {
    delete headers['Content-Type'];
  }

  try {
    const response = await fetch(`${BASE_URL}${url}`, { ...restOptions, headers });

    // 401 未授权：后台/个人操作需要跳登录；前台公开页的状态探测可静默失败。
    if (response.status === 401) {
      if (silentAuth) {
        throw new Error('UNAUTHORIZED_SILENT');
      }
      localStorage.removeItem('admin_token');
      // 只在后台相关页面自动跳转，避免未登录用户查看公开页面时被打断。
      const pathname = window.location.pathname;
      const shouldRedirectToLogin = pathname.includes('/admin') || pathname.includes('/company-verification');
      if (shouldRedirectToLogin && !pathname.includes('/admin/login') && !pathname.includes('/admin/register')) {
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

function withBasename(path) {
  if (!path || !path.startsWith('/') || path.startsWith(`${BASENAME}/`)) return path;
  return `${BASENAME}${path}`;
}

function normalizeStandard(standard) {
  if (standard === 'CE EN 1384') return 'CE EN 1384:2023';
  if (standard === 'UKCA EN 1384') return 'UKCA EN 1384:2023';
  return standard;
}

function mapCertificate(cert) {
  if (!cert) return null;
  const mapped = keysToCamelCase(cert);
  mapped.standard = normalizeStandard(mapped.standard);
  // 后端字段 file_path/thumbnail_path/manual_path/declaration_path 对应前端 fileUrl/thumbnailUrl/manualUrl/declarationUrl
  // 需要添加 basename 前缀，因为部署在 /eu-doc/ 子路径下
  if (mapped.filePath !== undefined) {
    mapped.fileUrl = withBasename(mapped.filePath);
    delete mapped.filePath;
  }
  if (mapped.thumbnailPath !== undefined) {
    mapped.thumbnailUrl = withBasename(mapped.thumbnailPath);
    delete mapped.thumbnailPath;
  }
  if (mapped.manualPath !== undefined) {
    mapped.manualUrl = withBasename(mapped.manualPath);
    delete mapped.manualPath;
  }
  if (mapped.declarationPath !== undefined) {
    mapped.declarationUrl = withBasename(mapped.declarationPath);
    delete mapped.declarationPath;
  }
  if (Array.isArray(mapped.declarationVersions)) {
    mapped.declarationVersions = mapped.declarationVersions.map((version) => ({
      ...version,
      url: withBasename(version.path || version.url),
    }));
  }
  return mapped;
}

// ===== 认证相关 API =====

/** 用户注册（注册成功后自动登录，返回 token 和用户信息） */
export function register(email, password, displayName) {
  const body = { email, password };
  if (displayName) body.displayName = displayName;
  return request('/auth/register', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify(body),
  });
}

/** 用户登录（支持邮箱或用户名） */
export function login(emailOrUsername, password) {
  return request('/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ username: emailOrUsername, password }),
  });
}

/** 获取当前用户信息（验证 token 有效性） */
export async function getMe() {
  const response = await request('/auth/me');
  // v2.0 后端返回 {success: true, user: {...}}，需要提取 user 字段
  return response.user || response.admin || response;
}

/** 获取用户列表（仅管理员） */
export function getUsers(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') query.set(key, value);
  });
  return request(`/auth/users${query.toString() ? `?${query}` : ''}`, { raw: true }).then(keysToCamelCase);
}

export function getUser(id) {
  return request(`/auth/users/${id}`).then(keysToCamelCase);
}

export function updateUserAccess(id, data) {
  return request(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
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


function uploadFormDataWithProgress(url, formData, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}${url}`);

    const headers = createHeaders({}, {});
    delete headers['Content-Type'];
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const percent = Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100)));
      onProgress({ percent, loaded: event.loaded, total: event.total, phase: 'uploading' });
    };

    xhr.onload = () => {
      if (onProgress) onProgress({ percent: 100, phase: 'processing' });
      let data = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        reject(new Error('服务器返回内容无法解析'));
        return;
      }

      if (xhr.status === 401) {
        localStorage.removeItem('admin_token');
        const pathname = window.location.pathname;
        const shouldRedirectToLogin = pathname.includes('/admin') || pathname.includes('/company-verification');
        if (shouldRedirectToLogin && !pathname.includes('/admin/login') && !pathname.includes('/admin/register')) {
          window.location.href = `${BASENAME}/admin/login`;
        }
        reject(new Error('登录已过期，请重新登录'));
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(data?.message || `请求失败 (${xhr.status})`));
        return;
      }

      resolve(data?.data !== undefined ? data.data : data);
    };

    xhr.onerror = () => reject(new Error('网络连接失败，请检查后端服务是否运行'));
    xhr.onabort = () => reject(new Error('上传已取消'));
    xhr.send(formData);
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

/** 获取当前登录用户可管理的企业列表 */
export function getMyCompanies() {
  return request('/companies?my=1&pageSize=100').then((data) => {
    if (Array.isArray(data)) return data.map(keysToCamelCase);
    if (data && Array.isArray(data.data)) return data.data.map(keysToCamelCase);
    return [];
  });
}


/** 提交企业认证申请 */
export function submitCompanyVerification(companyId, payload = {}) {
  const formData = new FormData();
  if (payload.businessLicenseNo) formData.append('businessLicenseNo', payload.businessLicenseNo);
  if (payload.contactPerson) formData.append('contactPerson', payload.contactPerson);
  if (payload.contactEmail) formData.append('contactEmail', payload.contactEmail);
  if (payload.businessLicenseFile) formData.append('businessLicense', payload.businessLicenseFile);
  if (payload.authorizationLetterFile) formData.append('authorizationLetter', payload.authorizationLetterFile);
  return request(`/companies/${companyId}/verification`, {
    method: 'POST',
    body: formData,
  });
}

/** 获取企业认证审核列表 */
export function getCompanyVerificationDocuments(companyId) {
  return request(`/v2/company-verifications/${companyId}/documents`).then(keysToCamelCase);
}

export async function getCompanyVerificationFile(documentId) {
  const headers = createHeaders();
  delete headers['Content-Type'];
  const response = await fetch(`${BASE_URL}/v2/company-verifications/documents/${documentId}/file`, { headers });
  if (!response.ok) throw new Error('认证材料读取失败');
  return response.blob();
}

export function getCompanyVerifications(status = '') {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/v2/company-verifications${query}`).then((data) => {
    if (Array.isArray(data)) return data.map(keysToCamelCase);
    if (data && Array.isArray(data.data)) return data.data.map(keysToCamelCase);
    return [];
  });
}

/** 平台管理员审核企业认证 */
export function reviewCompanyVerification(companyId, action, note = '') {
  return request(`/companies/${companyId}/verification`, {
    method: 'PUT',
    body: JSON.stringify({ action, note }),
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

/** 获取企业成员和当前用户的管理权限 */
export function getCompanyMembers(companyId) {
  const query = new URLSearchParams({ companyId: String(companyId) });
  return request(`/v2/company-members?${query.toString()}`, { raw: true }).then((response) => ({
    members: Array.isArray(response.data) ? response.data.map(keysToCamelCase) : [],
    operatorRole: response.operatorRole || 'viewer',
    permissions: response.permissions || {},
  }));
}

/** 添加已注册用户为企业成员 */
export function inviteCompanyMember(companyId, email, role) {
  return request('/v2/company-members/invite', {
    method: 'POST',
    body: JSON.stringify({ companyId, email, role }),
  });
}

/** 修改企业成员角色 */
export function updateCompanyMemberRole(memberId, role) {
  return request(`/v2/company-members/${memberId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

/** 移除企业成员 */
export function removeCompanyMember(memberId) {
  return request(`/v2/company-members/${memberId}`, { method: 'DELETE' });
}

/** 获取当前企业的真实操作记录 */
export function getCompanyActivity(companyId, limit = 200) {
  const query = new URLSearchParams({ companyId: String(companyId), limit: String(limit) });
  return request(`/v2/company-members/activity?${query.toString()}`).then((items) => (
    Array.isArray(items) ? items.map(keysToCamelCase) : []
  ));
}

// ===== 搜索相关 API =====

/** 获取统一搜索建议 */
export function getSearchSuggestions(query, limit = 12) {
  const qs = new URLSearchParams({ q: query || '', limit: String(limit) });
  return request(`/search/suggestions?${qs.toString()}`).then((data) => Array.isArray(data) ? data.map(keysToCamelCase) : []);
}

// ===== 统计相关 API =====

/** 获取统计总览（返回值已映射为 camelCase） */
export function getStats() {
  return request('/stats/overview').then(keysToCamelCase);
}

/** 获取最近操作日志 */
export function getRecentLogs(params = {}) {
  const query = new URLSearchParams();
  if (params.companyId) query.set('companyId', String(params.companyId));
  query.set('limit', String(params.limit || 500));
  return request(`/stats/recent?${query.toString()}`).then((items) => (
    Array.isArray(items) ? items.map(keysToCamelCase) : []
  ));
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
  if (params.search) query.set('search', params.search);
  if (params.reportType) query.set('reportType', params.reportType);
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

// ===== 后台 v2 个人类目 API =====

export function getPersonalOverview() {
  return request('/personal/overview').then(keysToCamelCase);
}

export function updatePersonalProfile(data) {
  return request('/personal/profile', {
    method: 'PUT',
    body: JSON.stringify({
      displayName: data.displayName,
      realName: data.realName,
      position: data.position,
      department: data.department,
      bio: data.bio,
    }),
  }).then(keysToCamelCase);
}

export function uploadPersonalAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);
  return request('/personal/avatar', {
    method: 'POST',
    body: formData,
  }).then(keysToCamelCase);
}

export function addFavorite(itemType, itemId, title, meta, description) {
  return request('/personal/favorites', {
    method: 'POST',
    body: JSON.stringify({
      itemType,
      itemId,
      title,
      meta,
      description,
    }),
  }).then(keysToCamelCase);
}

export function checkFavorite(itemType, itemId) {
  return request(`/personal/favorites/check?itemType=${encodeURIComponent(itemType)}&itemId=${itemId}`, { silentAuth: true })
    .then(keysToCamelCase)
    .catch((error) => {
      if (error.message === 'UNAUTHORIZED_SILENT') return { isFavorited: false, favoriteId: null };
      throw error;
    });
}

export function deleteFavorite(id) {
  return request(`/personal/favorites/${id}`, { method: 'DELETE' });
}

export function restoreFavorite(id) {
  return request(`/personal/favorites/${id}/restore`, { method: 'PUT' }).then(keysToCamelCase);
}

export function permanentDeleteFavorite(id) {
  return request(`/personal/favorites/${id}/permanent`, { method: 'DELETE' });
}

export function updateFavoriteNote(id, note) {
  return request(`/personal/favorites/${id}/note`, {
    method: 'PUT',
    body: JSON.stringify({ note }),
  });
}

export function updateHistorySetting(historyEnabled) {
  return request('/personal/history/settings', {
    method: 'PUT',
    body: JSON.stringify({ historyEnabled }),
  }).then(keysToCamelCase);
}


export function recordHistory(itemType, itemId, title, company = '', actionLabel = '查看') {
  return request('/personal/history', {
    method: 'POST',
    silentAuth: true,
    body: JSON.stringify({ itemType, itemId, title, company, actionLabel }),
  })
    .then(keysToCamelCase)
    .catch((error) => {
      if (error.message === 'UNAUTHORIZED_SILENT') return null;
      throw error;
    });
}

export function deleteHistoryItem(id) {
  return request(`/personal/history/${id}`, { method: 'DELETE' });
}

export function clearHistory() {
  return request('/personal/history', { method: 'DELETE' });
}

export function markAllNotificationsRead() {
  return request('/personal/notifications/read-all', { method: 'PUT' });
}

export function markNotificationRead(id) {
  return request(`/personal/notifications/${id}/read`, { method: 'PUT' });
}

export function revokeOtherSessions() {
  return request('/personal/sessions/revoke-others', { method: 'PUT' });
}


export function getImportItems(companyId) {
  return request(`/v2/imports?companyId=${companyId}`, { raw: true }).then((response) => {
    if (response && Array.isArray(response.data)) response.data = response.data.map(keysToCamelCase);
    return response;
  });
}

export function uploadImportFiles(companyId, files, options = {}) {
  const formData = new FormData();
  formData.append('companyId', companyId);
  Array.from(files || []).forEach((file) => formData.append('files', file, file.webkitRelativePath || file.name));
  const uploadTask = options.onProgress
    ? uploadFormDataWithProgress('/v2/imports/upload', formData, options)
    : request('/v2/imports/upload', {
      method: 'POST',
      body: formData,
    });
  return uploadTask.then(keysToCamelCase);
}

export function organizeImportItem(id, data) {
  return request(`/v2/imports/${id}/organize`, {
    method: 'POST',
    body: JSON.stringify(data),
  }).then(keysToCamelCase);
}

export function organizeImportGroup(data) {
  return request('/v2/imports/organize-group', {
    method: 'POST',
    body: JSON.stringify(data),
  }).then(keysToCamelCase);
}

export function getCompanyProducts(companyId, options = {}) {
  const privateQuery = options.includePrivate ? '&status=all' : '';
  return request(`/v2/products?companyId=${companyId}${privateQuery}&pageSize=500`, { raw: true, skipAuth: !options.includePrivate }).then((response) => {
    if (response && Array.isArray(response.data)) response.data = response.data.map(keysToCamelCase);
    return response;
  });
}

export function getCategories(taxonomyType = 'consumer', options = {}) {
  const params = new URLSearchParams();
  params.set('taxonomyType', taxonomyType);
  if (options.tree) params.set('tree', 'true');
  return request(`/v2/categories?${params.toString()}`, { raw: true }).then((response) => {
    if (response && Array.isArray(response.data)) response.data = response.data.map(keysToCamelCase);
    return response;
  });
}

export function createCategory(data) {
  return request('/v2/categories', { method: 'POST', body: JSON.stringify(data) });
}

export function updateCategory(id, data) {
  return request(`/v2/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function getPlatformSettings() {
  return request('/v2/platform-settings').then(keysToCamelCase);
}

export function updatePlatformSettings(data) {
  return request('/v2/platform-settings', { method: 'PUT', body: JSON.stringify(data) });
}

export function getPendingDocumentReviews() {
  return request('/v2/documents?status=all&reviewStatus=pending&pageSize=500', { raw: true }).then((response) => {
    if (response && Array.isArray(response.data)) response.data = response.data.map(keysToCamelCase);
    return response;
  });
}

export function reviewDocument(id, status, note = '') {
  return request(`/v2/documents/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ status, note }),
  });
}

export async function getDocumentReviewFile(id) {
  const headers = createHeaders();
  delete headers['Content-Type'];
  const response = await fetch(`${BASE_URL}/v2/documents/${id}/file`, { headers });
  if (!response.ok) {
    let message = '文件读取失败';
    try {
      const payload = await response.json();
      message = payload.message || message;
    } catch {
      // Non-JSON file errors keep the default message.
    }
    throw new Error(message);
  }
  return response.blob();
}

export function getCompanyDocuments(companyId, options = {}) {
  const privateQuery = options.includePrivate ? '&reviewStatus=all&status=all' : '';
  return request(`/v2/documents?companyId=${companyId}${privateQuery}&pageSize=500`, { raw: true, skipAuth: !options.includePrivate }).then((response) => {
    if (response && Array.isArray(response.data)) response.data = response.data.map(keysToCamelCase);
    return response;
  });
}

export function createProduct(data) {
  return request('/v2/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateProduct(id, data) {
  return request(`/v2/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteProduct(id) {
  return request(`/v2/products/${id}`, { method: 'DELETE' });
}

export function createDocument(data) {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  return request('/v2/documents', {
    method: 'POST',
    body: formData,
  });
}

export function updateDocument(id, data) {
  return request(`/v2/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function replaceDocumentFile(id, file) {
  const formData = new FormData();
  formData.append('file', file);
  return request(`/v2/documents/${id}/replace`, {
    method: 'POST',
    body: formData,
  });
}

export function uploadProductImage(id, file) {
  const formData = new FormData();
  formData.append('image', file);
  return request(`/v2/products/${id}/image`, {
    method: 'POST',
    body: formData,
  }).then(keysToCamelCase);
}

export function deleteImportItem(id) {
  return request(`/v2/imports/${id}`, { method: 'DELETE' });
}

export function reopenImportItem(id) {
  return request(`/v2/imports/${id}/reopen`, { method: 'POST' });
}

export function deleteDocument(id) {
  return request(`/v2/documents/${id}`, { method: 'DELETE' });
}
