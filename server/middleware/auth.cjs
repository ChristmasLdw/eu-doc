/**
 * EU-DOC 后端服务 - JWT 认证中间件
 * 版本: 1.0.2
 *
 * 变更记录 (1.0.2):
 * - authMiddleware 解码后额外携带 role 和 company_name 字段
 * - 新增 requireAdmin 中间件：在 requireAuth 基础上要求 role='admin'
 * - generateToken 支持携带 role 信息
 *
 * 职责:
 * - 验证请求中携带的 JWT token 是否合法
 * - 将解码后的用户信息挂载到 req.admin 上，供后续路由使用
 * - 保护需要认证的 API 接口
 *
 * 什么是 JWT（JSON Web Token）?
 * - JWT 是一种轻量级的身份认证方案，由三部分组成：Header.Payload.Signature
 * - 客户端登录后拿到一个 token，之后每次请求都在 Header 中携带这个 token
 * - 服务端通过验证 token 的签名来确认用户身份，不需要查数据库（无状态）
 *
 * 什么是中间件（Middleware）?
 * - Express 的中间件是一个函数，在请求到达最终路由处理函数之前/之后执行
 * - 类似流水线上的"检查站"，可以拦截、修改或放行请求
 * - 认证中间件的作用就是：检查 token -> 有效则放行，无效则返回 401 错误
 */

const jwt = require('jsonwebtoken');
const { db } = require('../db.cjs');

// JWT 密钥（生产环境应从环境变量读取，这里提供默认值用于开发）
const JWT_SECRET = process.env.JWT_SECRET || 'eu-doc-secret-key-change-in-production';

/**
 * JWT 认证中间件（requireAuth）
 *
 * 工作流程:
 * 1. 从请求头 Authorization 中提取 token（格式: "Bearer <token>"）
 * 2. 使用密钥验证 token 的签名和有效期
 * 3. 验证通过 -> 将用户信息挂载到 req.admin，调用 next() 放行
 * 4. 验证失败 -> 返回 401 Unauthorized 错误
 *
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 调用此函数将控制权传递给下一个中间件/路由
 */
function authMiddleware(req, res, next) {
  // 获取 Authorization 请求头
  const authHeader = req.headers.authorization;

  // 检查是否存在 Authorization 头，且格式是否为 "Bearer xxx"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '未提供认证令牌，请先登录',
    });
  }

  // 提取 token（去掉 "Bearer " 前缀）
  const token = authHeader.substring(7);

  try {
    // jwt.verify: 验证 token 的签名和有效期
    // 如果 token 过期或签名不匹配，会抛出错误（被 catch 捕获）
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = db.prepare(`
      SELECT email, display_name, platform_role, status, session_version
      FROM users
      WHERE id = ?
    `).get(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: '账号不存在或已被禁用，请重新登录',
      });
    }

    if ((user.session_version || 0) !== (decoded.session_version || 0)) {
      return res.status(401).json({
        success: false,
        message: '登录状态已失效，请重新登录',
      });
    }

    // 将解码后的用户信息挂载到请求对象上
    req.admin = {
      id: decoded.id,
      username: user.email || decoded.username || decoded.email,
      email: user.email || decoded.email || decoded.username,
      role: user.platform_role || 'user',
      company_name: decoded.company_name || null,
      session_version: user.session_version || 0,
    };

    // 调用 next() 将控制权传递给下一个中间件或路由处理函数
    next();
  } catch (err) {
    // Token 验证失败（过期、无效、被篡改等）
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '认证令牌已过期，请重新登录',
      });
    }
    return res.status(401).json({
      success: false,
      message: '认证令牌无效',
    });
  }
}

/**
 * 管理员权限中间件（requireAdmin）
 *
 * 在 authMiddleware 基础上额外检查用户角色是否为 admin
 * 用法：router.get('/users', authMiddleware, requireAdmin, handler)
 *
 * 设计思路：中间件组合（Middleware Composition）
 * - authMiddleware 负责"验证身份"（你是谁？）
 * - requireAdmin 负责"验证权限"（你能做什么？）
 * - 两个职责分离，可以灵活组合
 */
function requireAdmin(req, res, next) {
  if (!req.admin || (req.admin.role !== 'admin' && req.admin.role !== 'platform_admin')) {
    return res.status(403).json({
      success: false,
      message: '权限不足，仅管理员可执行此操作',
    });
  }
  next();
}

/**
 * 生成 JWT token
 *
 * @param {Object} user - 用户对象（包含 id, username, role, company_name）
 * @returns {string} JWT token 字符串
 *
 * jwt.sign 参数说明:
 * - 第1个参数: payload（要编码的数据，不要放密码等敏感信息）
 * - 第2个参数: 密钥（用于签名，防止 token 被篡改）
 * - 第3个参数: 选项（expiresIn: token 有效期，'7d' = 7天）
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username || user.email,
      email: user.email || user.username,
      role: user.role || user.platform_role || 'user',
      company_name: user.company_name || null,
      session_version: user.session_version || 0,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { authMiddleware, requireAdmin, generateToken, JWT_SECRET };
