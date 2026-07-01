/**
 * EU-DOC 后端服务 - 企业角色权限检查中间件
 * 用于检查用户在特定企业中的角色权限
 */

const { db } = require('../db.cjs');

/**
 * 检查用户在企业中的角色权限
 * @param {Array<string>} allowedRoles - 允许的角色列表，如 ['owner', 'admin']
 * @returns {Function} Express 中间件函数
 */
function requireCompanyRole(allowedRoles) {
  return (req, res, next) => {
    const companyId = req.params.companyId || req.params.id || req.body.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: '缺少企业ID参数',
      });
    }

    // 平台管理员拥有所有权限
    if (req.admin.role === 'platform_admin' || req.admin.role === 'admin') {
      return next();
    }

    // 查询用户在该企业中的角色
    const membership = db.prepare(`
      SELECT role FROM company_members
      WHERE user_id = ? AND company_id = ? AND status = 'active'
    `).get(req.admin.id, companyId);

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: '您不是该企业的成员',
      });
    }

    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足，无法执行此操作',
      });
    }

    // 将用户在该企业的角色附加到请求对象上，供后续使用
    req.companyRole = membership.role;
    next();
  };
}

/**
 * 检查用户是否属于某个企业（任意角色）
 */
function requireCompanyMember(req, res, next) {
  const companyId = req.params.companyId || req.params.id || req.body.companyId;

  if (!companyId) {
    return res.status(400).json({
      success: false,
      message: '缺少企业ID参数',
    });
  }

  // 平台管理员拥有所有权限
  if (req.admin.role === 'platform_admin' || req.admin.role === 'admin') {
    return next();
  }

  const membership = db.prepare(`
    SELECT role FROM company_members
    WHERE user_id = ? AND company_id = ? AND status = 'active'
  `).get(req.admin.id, companyId);

  if (!membership) {
    return res.status(403).json({
      success: false,
      message: '您不是该企业的成员',
    });
  }

  req.companyRole = membership.role;
  next();
}

module.exports = {
  requireCompanyRole,
  requireCompanyMember,
};
