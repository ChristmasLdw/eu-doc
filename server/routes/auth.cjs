/**
 * EU-DOC 后端服务 - 认证路由 v2.0
 *
 * 支持邮箱注册/登录、邮箱验证、密码重置
 */

const { Router } = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin, generateToken } = require('../middleware/auth.cjs');

const router = Router();

/**
 * POST /api/auth/register
 * 用户注册（邮箱）
 */
router.post('/register', (req, res) => {
  const { email, password, display_name, company_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: '请提供邮箱和密码' });
  }

  // 邮箱格式校验
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: '邮箱格式不正确' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: '密码长度不能少于6位' });
  }

  // 检查邮箱是否已存在
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ success: false, message: '该邮箱已注册' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, display_name, platform_role, status, email_verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(email, hash, display_name || email.split('@')[0], 'user', 'active', 0);

    const userId = result.lastInsertRowid;

    // 如果提供了企业名称，自动创建企业并关联
    if (company_name && company_name.trim()) {
      const trimmedCompany = company_name.trim();
      db.prepare('INSERT OR IGNORE INTO companies (name, name_en) VALUES (?, ?)').run(trimmedCompany, trimmedCompany);
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get(trimmedCompany);
      if (company) {
        db.prepare('INSERT OR IGNORE INTO company_members (user_id, company_id, role) VALUES (?, ?, ?)')
          .run(userId, company.id, 'owner');
      }
    }

    // 生成验证令牌
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24小时
    db.prepare(`
      INSERT INTO email_verifications (user_id, email, token, type, expires_at)
      VALUES (?, ?, ?, 'verify', ?)
    `).run(userId, email, verifyToken, expiresAt);

    // 生成 token
    const user = db.prepare('SELECT id, email, display_name, platform_role FROM users WHERE id = ?').get(userId);
    const token = generateToken(user);

    // 记录日志
    db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, 'register', 'user', userId, JSON.stringify({ email }), req.ip);

    res.status(201).json({
      success: true,
      message: '注册成功，请查收验证邮件',
      token,
      user: { id: user.id, email: user.email, display_name: user.display_name, role: user.platform_role },
      verify_token: verifyToken, // 开发环境返回，生产环境应通过邮件发送
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ success: false, message: '注册失败，请稍后重试' });
  }
});

/**
 * POST /api/auth/login
 * 用户登录（支持邮箱或用户名）
 */
router.post('/login', (req, res) => {
  const { email, username, password } = req.body;
  const loginId = email || username;

  if (!loginId || !password) {
    return res.status(400).json({ success: false, message: '请提供邮箱/用户名和密码' });
  }

  // 先查 users 表（邮箱登录）
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(loginId);

  // 如果没找到，查 admins_legacy 表（用户名登录，向后兼容）
  if (!user) {
    const legacyAdmin = db.prepare('SELECT * FROM admins_legacy WHERE username = ?').get(loginId);
    if (legacyAdmin) {
      const isMatch = bcrypt.compareSync(password, legacyAdmin.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
      }
      // 从 users 表查找对应用户
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(`${loginId}@legacy.local`);
    }
  }

  if (!user) {
    return res.status(401).json({ success: false, message: '邮箱/用户名或密码错误' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: '邮箱/用户名或密码错误' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ success: false, message: '账号已被禁用' });
  }

  const token = generateToken(user);

  db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, ip_address) VALUES (?, ?, ?, ?, ?)')
    .run(user.id, 'login', 'user', user.id, req.ip);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      role: user.platform_role,
      email_verified: user.email_verified,
    },
  });
});

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, display_name, platform_role, email_verified, phone, created_at FROM users WHERE id = ?')
    .get(req.admin.id);

  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  // 获取用户的企业列表
  const companies = db.prepare(`
    SELECT c.id, c.name, cm.role as member_role
    FROM company_members cm
    JOIN companies c ON cm.company_id = c.id
    WHERE cm.user_id = ? AND cm.status = 'active'
  `).all(user.id);

  res.json({ success: true, user: { ...user, companies } });
});

/**
 * POST /api/auth/verify-email
 * 验证邮箱
 */
router.post('/verify-email', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: '缺少验证令牌' });
  }

  const verification = db.prepare(`
    SELECT * FROM email_verifications
    WHERE token = ? AND type = 'verify' AND used = 0 AND expires_at > datetime('now')
  `).get(token);

  if (!verification) {
    return res.status(400).json({ success: false, message: '验证令牌无效或已过期' });
  }

  db.prepare('UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(verification.user_id);
  db.prepare('UPDATE email_verifications SET used = 1 WHERE id = ?').run(verification.id);

  res.json({ success: true, message: '邮箱验证成功' });
});

/**
 * POST /api/auth/forgot-password
 * 忘记密码 - 发送重置令牌
 */
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: '请提供邮箱' });
  }

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!user) {
    // 安全考虑：不透露用户是否存在
    return res.json({ success: true, message: '如果该邮箱已注册，您将收到重置密码邮件' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(); // 1小时

  db.prepare(`
    INSERT INTO email_verifications (user_id, email, token, type, expires_at)
    VALUES (?, ?, ?, 'reset', ?)
  `).run(user.id, email, resetToken, expiresAt);

  res.json({
    success: true,
    message: '如果该邮箱已注册，您将收到重置密码邮件',
    reset_token: resetToken, // 开发环境返回，生产环境应通过邮件发送
  });
});

/**
 * POST /api/auth/reset-password
 * 重置密码
 */
router.post('/reset-password', (req, res) => {
  const { token, new_password } = req.body;

  if (!token || !new_password) {
    return res.status(400).json({ success: false, message: '缺少令牌或新密码' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ success: false, message: '密码长度不能少于6位' });
  }

  const verification = db.prepare(`
    SELECT * FROM email_verifications
    WHERE token = ? AND type = 'reset' AND used = 0 AND expires_at > datetime('now')
  `).get(token);

  if (!verification) {
    return res.status(400).json({ success: false, message: '重置令牌无效或已过期' });
  }

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(hash, verification.user_id);
  db.prepare('UPDATE email_verifications SET used = 1 WHERE id = ?').run(verification.id);

  res.json({ success: true, message: '密码重置成功，请使用新密码登录' });
});

/**
 * PUT /api/auth/password
 * 修改密码（需登录）
 */
router.put('/password', authMiddleware, (req, res) => {
  const { old_password, new_password } = req.body;

  if (!old_password || !new_password) {
    return res.status(400).json({ success: false, message: '请提供原密码和新密码' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ success: false, message: '新密码长度不能少于6位' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.admin.id);

  if (!bcrypt.compareSync(old_password, user.password_hash)) {
    return res.status(401).json({ success: false, message: '原密码错误' });
  }

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(hash, user.id);

  db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, ip_address) VALUES (?, ?, ?, ?, ?)')
    .run(user.id, 'update_password', 'user', user.id, req.ip);

  res.json({ success: true, message: '密码修改成功' });
});

/**
 * GET /api/auth/users
 * 获取用户列表（仅管理员）
 */
router.get('/users', authMiddleware, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT id, email, display_name, platform_role, email_verified, status, created_at
    FROM users ORDER BY created_at DESC
  `).all();

  res.json({ success: true, data: users });
});

module.exports = router;
