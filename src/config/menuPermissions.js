/**
 * EU-DOC 后台菜单权限配置
 *
 * 设计思路：
 * - 集中管理所有菜单的权限要求
 * - 后期只需修改此文件即可控制权限
 * - 当前阶段：所有菜单都开放（平台管理员视角）
 */

/**
 * 菜单权限配置
 *
 * 配置说明：
 * - requiredRoles: 允许访问的角色列表
 *   - 'all': 所有人都能访问
 *   - ['platform_admin']: 仅平台管理员
 *   - ['platform_admin', 'owner', 'admin']: 多个角色
 *
 * - requiredPlatformRole: 平台角色要求（后期启用）
 *   - ['admin', 'platform_admin']: 需要平台管理员角色
 *
 * - requiredCompanyRole: 企业角色要求（后期启用）
 *   - ['owner', 'admin']: 需要企业所有者或管理员角色
 */
export const MENU_PERMISSIONS = {
  // 仪表盘 - 所有人可访问
  dashboard: {
    label: '仪表盘',
    requiredRoles: ['all'],
    description: '查看数据统计和概览',
  },

  // 产品管理 - 后期限制：owner/admin
  products: {
    label: '产品管理',
    requiredRoles: ['all'], // 当前阶段：所有人
    // 后期启用：requiredCompanyRole: ['owner', 'admin']
    description: '管理企业产品信息',
  },

  // 资料管理 - 后期限制：owner/admin/uploader
  documents: {
    label: '资料管理',
    requiredRoles: ['all'], // 当前阶段：所有人
    // 后期启用：requiredCompanyRole: ['owner', 'admin', 'uploader']
    description: '管理产品相关资料',
  },

  // 我的企业 - 后期限制：owner/admin
  company: {
    label: '我的企业',
    requiredRoles: ['all'], // 当前阶段：所有人
    // 后期启用：requiredCompanyRole: ['owner', 'admin']
    description: '查看和编辑企业信息',
  },

  // 团队成员 - 后期限制：owner/admin
  members: {
    label: '团队成员',
    requiredRoles: ['all'], // 当前阶段：所有人
    // 后期启用：requiredCompanyRole: ['owner', 'admin']
    description: '管理企业成员和权限',
  },

  // 企业认证审核 - 仅平台管理员
  companyVerifications: {
    label: '企业认证审核',
    requiredRoles: ['all'], // 当前阶段：所有人
    // 后期启用：requiredPlatformRole: ['admin', 'platform_admin']
    description: '审核企业认证申请（仅管理员）',
  },

  // 上传确认记录 - 仅平台管理员
  uploadConfirmations: {
    label: '上传确认记录',
    requiredRoles: ['all'], // 当前阶段：所有人
    // 后期启用：requiredPlatformRole: ['admin', 'platform_admin']
    description: '查看资料上传确认记录（仅管理员）',
  },

  // 个人设置 - 所有人可访问
  settings: {
    label: '个人设置',
    requiredRoles: ['all'],
    description: '修改个人信息和密码',
  },

  // 错误报告 - 后期限制：owner/admin
  reports: {
    label: '错误报告',
    requiredRoles: ['all'], // 当前阶段：所有人
    // 后期启用：requiredCompanyRole: ['owner', 'admin']
    description: '查看用户反馈的错误报告',
  },

  // 操作日志 - 仅平台管理员
  logs: {
    label: '操作日志',
    requiredRoles: ['all'], // 当前阶段：所有人
    // 后期启用：requiredPlatformRole: ['admin', 'platform_admin']
    description: '查看系统操作日志（仅管理员）',
  },
};

/**
 * 检查用户是否有权限访问指定菜单
 *
 * @param {string} menuKey - 菜单标识符（MENU_PERMISSIONS 中的 key）
 * @param {object} user - 用户对象
 * @param {string} user.platform_role - 平台角色（admin/platform_admin/user）
 * @param {string} user.company_role - 企业角色（owner/admin/uploader/viewer）
 * @returns {boolean} - 是否有权限
 */
export function checkMenuPermission(menuKey, user) {
  const config = MENU_PERMISSIONS[menuKey];

  // 未配置的菜单默认允许访问
  if (!config) return true;

  // 如果配置为 'all'，所有人都能访问
  if (config.requiredRoles.includes('all')) {
    return true;
  }

  // ==========================================
  // 当前阶段：返回 true（所有菜单都开放）
  // ==========================================
  return true;

  // ==========================================
  // 后期启用：以下是完整的权限检查逻辑
  // ==========================================

  // // 1. 检查平台角色
  // if (config.requiredPlatformRole) {
  //   if (!user.platform_role) return false;
  //   if (config.requiredPlatformRole.includes(user.platform_role)) {
  //     return true;
  //   }
  // }

  // // 2. 检查企业角色
  // if (config.requiredCompanyRole) {
  //   if (!user.company_role) return false;
  //   if (config.requiredCompanyRole.includes(user.company_role)) {
  //     return true;
  //   }
  // }

  // // 3. 检查通用角色列表
  // if (config.requiredRoles.length > 0) {
  //   const userRoles = [user.platform_role, user.company_role].filter(Boolean);
  //   return config.requiredRoles.some(role => userRoles.includes(role));
  // }

  // // 默认拒绝
  // return false;
}

/**
 * 获取菜单的权限提示信息
 *
 * @param {string} menuKey - 菜单标识符
 * @returns {string} - 权限提示文本
 */
export function getPermissionHint(menuKey) {
  const config = MENU_PERMISSIONS[menuKey];
  if (!config) return '';

  // 当前阶段：所有功能都可用
  return '';

  // 后期启用：
  // if (config.requiredPlatformRole) {
  //   return '此功能仅限平台管理员使用';
  // }
  // if (config.requiredCompanyRole) {
  //   const roles = config.requiredCompanyRole.join('、');
  //   return `此功能需要以下角色：${roles}`;
  // }
  // return '您没有权限访问此功能';
}

/**
 * 使用示例：
 *
 * import { checkMenuPermission, getPermissionHint } from '@/config/menuPermissions';
 *
 * const hasPermission = checkMenuPermission('products', admin);
 * const hint = getPermissionHint('products');
 *
 * if (!hasPermission) {
 *   console.log(hint); // 显示权限提示
 * }
 */
