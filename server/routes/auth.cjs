/**
 * EU-DOC 后端服务 - 认证路由
 * 版本: 1.0.2
 *
 * 变更记录 (1.0.2):
 * - 新增 POST /register - 用户注册（普通用户自行注册）
 * - 新增 GET /users - 获取用户列表（仅管理员）
 * - 修改 POST /login - 返回值包含 role 和 company_name
 * - 修改 GET /me - 返回值包含 role 和 company_name
 *
 * 路由:
 * - POST /register - 用户注册（公开）
 * - POST /login    - 用户登录，返回 JWT token
 * - GET  /me       - 获取当前用户信息（需认证）
 * - GET  /users    - 获取用户列表（需管理员权限）
 * - PUT  /password - 修改密码（需认证）
 */

const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin, generateToken } = require('../middleware/auth.cjs');

const router = Router();

/**
 * POST /api/auth/register
 * 用户注册接口（公开）
 *
 * 请求体: { username, password, company_name? }
 * 返回: { success: true, token, user: { id, username, role, company_name } }
 *
 * 注册流程:
 * 1. 校验参数（用户名 3-20 位，密码 6-30 位）
 * 2. 检查用户名是否已存在
 * 3. 如果提供了 company_name，在 companies 表中创建（如不存在）
 * 4. 创建用户（role 默认 'user'）
 * 5. 生成 JWT token 并返回（注册即自动登录）
 */
router.post('/register', (req, res) => {
  const { username, password, company_name } = req.body;

  // 参数校验
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '请提供用户名和密码',
    });
  }

  // 用户名长度校验
  if (username.trim().length < 3 || username.trim().length > 20) {
    return res.status(400).json({
      success: false,
      message: '用户名长度需在 3-20 个字符之间',
    });
  }

  // 密码长度校验
  if (password.length < 6 || password.length > 30) {
    return res.status(400).json({
      success: false,
      message: '密码长度需在 6-30 个字符之间',
    });
  }

  const trimmedUsername = username.trim();

  // 检查用户名是否已存在
  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(trimmedUsername);
  if (existing) {
    return res.status(409).json({
      success: false,
      message: '用户名已存在',
    });
  }

  // 如果提供了企业名称，确保 companies 表中有该企业记录
  let companyId = null;
  if (company_name && company_name.trim()) {
    const trimmedCompany = company_name.trim();
    db.prepare('INSERT OR IGNORE INTO companies (name, name_en) VALUES (?, ?)').run(trimmedCompany, trimmedCompany);
    const company = db.prepare('SELECT id FROM companies WHERE name = ?').get(trimmedCompany);
    companyId = company ? company.id : null;
  }

  try {
    // 创建用户
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO admins (username, password_hash, role, company_name) VALUES (?, ?, ?, ?)'
    ).run(trimmedUsername, hash, 'user', company_name ? company_name.trim() : null);

    // 获取创建的用户信息
    const user = db.prepare('SELECT id, username, role, company_name, created_at FROM admins WHERE id = ?').get(result.lastInsertRowid);

    // 生成 token（注册即自动登录）
    const token = generateToken(user);

    // 记录注册日志
    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(user.id, 'register', 'user', user.id, JSON.stringify({ username: user.username, company_name: user.company_name }), req.ip);

    res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    console.error('注册失败:', err.message);
    return res.status(500).json({
      success: false,
      message: '注册失败，请稍后重试',
    });
  }
});

/**
 * POST /api/auth/login
 * 用户登录接口
 *
 * 请求体: { username: string, password: string }
 * 返回: { success: true, token: string, admin: { id, username, role, company_name, created_at } }
 *
 * 登录流程:
 * 1. 根据用户名查询数据库
 * 2. 使用 bcrypt 比对密码哈希
 * 3. 生成 JWT token 返回给客户端
 * 4. 记录登录审计日志
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // 参数校验
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '请提供用户名和密码',
    });
  }

  // 查询用户（使用参数化查询防止 SQL 注入）
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

  if (!admin) {
    return res.status(401).json({
      success: false,
      message: '用户名或密码错误',
    });
  }

  // bcrypt.compareSync: 比较明文密码和哈希值是否匹配
  // 即使密码错误，比较操作也会花费相同时间（防止计时攻击）
  const isMatch = bcrypt.compareSync(password, admin.password_hash);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: '用户名或密码错误',
    });
  }

  // 生成 JWT token
  const token = generateToken(admin);

  // 记录登录日志
  db.prepare(
    'INSERT INTO audit_logs (admin_id, action, target_type, target_id, ip_address) VALUES (?, ?, ?, ?, ?)'
  ).run(admin.id, 'login', 'admin', admin.id, req.ip);

  // 返回 token 和用户基本信息（不返回密码哈希）
  res.json({
    success: true,
    token,
    admin: {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      company_name: admin.company_name,
      created_at: admin.created_at,
    },
  });
});

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 *
 * 需要在请求头中携带有效的 JWT token
 * authMiddleware 会将解码后的用户信息挂载到 req.admin
 */
router.get('/me', authMiddleware, (req, res) => {
  const admin = db.prepare('SELECT id, username, role, company_name, created_at FROM admins WHERE id = ?').get(req.admin.id);

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: '用户不存在',
    });
  }

  res.json({ success: true, admin });
});

/**
 * GET /api/auth/users
 * 获取用户列表（仅管理员）
 *
 * 返回所有注册用户的基本信息，按创建时间倒序
 */
router.get('/users', authMiddleware, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, role, company_name, created_at
    FROM admins
    ORDER BY created_at DESC
  `).all();

  res.json({ success: true, data: users });
});

/**
 * PUT /api/auth/password
 * 修改当前用户密码
 *
 * 请求体: { oldPassword: string, newPassword: string }
 */
router.put('/password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: '请提供原密码和新密码',
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: '新密码长度不能少于6位',
    });
  }

  // 查询当前用户完整信息（包含密码哈希）
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);

  // 验证原密码
  if (!bcrypt.compareSync(oldPassword, admin.password_hash)) {
    return res.status(401).json({
      success: false,
      message: '原密码错误',
    });
  }

  // 生成新密码哈希并更新
  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(newHash, admin.id);

  // 记录密码修改日志
  db.prepare(
    'INSERT INTO audit_logs (admin_id, action, target_type, target_id, ip_address) VALUES (?, ?, ?, ?, ?)'
  ).run(admin.id, 'update_password', 'admin', admin.id, req.ip);

  res.json({ success: true, message: '密码修改成功' });
});

module.exports = router;
