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


function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip;
}

function getUserAgent(req) {
  return String(req.headers['user-agent'] || '').slice(0, 300);
}

function recordAuthAudit({ userId = null, action, targetId = null, detail, req }) {
  db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, action, 'user', targetId, detail ? JSON.stringify(detail) : null, getClientIp(req));
}

/**
 * POST /api/auth/register
 * 用户注册（邮箱）
 */
router.post('/register', (req, res) => {
  const { email, password, displayName } = req.body;

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
    `).run(email, hash, displayName || email.split('@')[0], 'user', 'active', 0);

    const userId = result.lastInsertRowid;

    // 注册时不再自动创建企业，用户需要在后台手动创建并提交认证

    // 生成验证令牌
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24小时
    db.prepare(`
      INSERT INTO email_verifications (user_id, email, token, type, expires_at)
      VALUES (?, ?, ?, 'verify', ?)
    `).run(userId, email, verifyToken, expiresAt);

    // 生成 token
    const user = db.prepare('SELECT id, email, display_name, platform_role, session_version FROM users WHERE id = ?').get(userId);
    const token = generateToken(user);

    recordAuthAudit({
      userId,
      action: 'register',
      targetId: userId,
      detail: { email, userAgent: getUserAgent(req) },
      req,
    });

    const response = {
      success: true,
      message: '注册成功，请查收验证邮件',
      token,
      user: { id: user.id, email: user.email, displayName: user.display_name, role: user.platform_role },
    };
    if (process.env.NODE_ENV === 'development') {
      response.verifyToken = verifyToken;
    }

    res.status(201).json(response);
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
      const isLegacyMatch = bcrypt.compareSync(password, legacyAdmin.password_hash);
      if (!isLegacyMatch) {
        recordAuthAudit({
          action: 'login_failed',
          detail: { loginId, reason: 'bad_legacy_password', userAgent: getUserAgent(req) },
          req,
        });
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
      }

      // 兼容旧账号 admin：通过后映射到正式平台管理员账号。
      user = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@eu-doc.local');
    }
  }

  if (!user) {
    recordAuthAudit({
      action: 'login_failed',
      detail: { loginId, reason: 'user_not_found', userAgent: getUserAgent(req) },
      req,
    });
    return res.status(401).json({ success: false, message: '邮箱/用户名或密码错误' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    recordAuthAudit({
      userId: user.id,
      action: 'login_failed',
      targetId: user.id,
      detail: { loginId, reason: 'bad_password', userAgent: getUserAgent(req) },
      req,
    });
    return res.status(401).json({ success: false, message: '邮箱/用户名或密码错误' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ success: false, message: '账号已被禁用' });
  }

  const token = generateToken(user);

  recordAuthAudit({
    userId: user.id,
    action: 'login',
    targetId: user.id,
    detail: { userAgent: getUserAgent(req) },
    req,
  });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.platform_role,
      emailVerified: user.email_verified,
      session_version: user.session_version || 0,
    },
  });
});

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, display_name, platform_role, email_verified, phone, user_code, session_version, created_at FROM users WHERE id = ?')
    .get(req.admin.id);

  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  // 获取用户的企业列表
  const companies = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.name_en,
      c.verification_status,
      c.public_visible,
      c.status,
      cm.role as member_role
    FROM company_members cm
    JOIN companies c ON cm.company_id = c.id
    WHERE cm.user_id = ? AND cm.status = 'active'
  `).all(user.id);

  res.json({ success: true, user: { ...user, displayName: user.display_name, platformRole: user.platform_role, emailVerified: user.email_verified, userCode: user.user_code, sessionVersion: user.session_version, createdAt: user.created_at, companies } });
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

  const response = {
    success: true,
    message: '如果该邮箱已注册，您将收到重置密码邮件',
  };
  if (process.env.NODE_ENV === 'development') {
    response.resetToken = resetToken;
  }

  res.json(response);
});

/**
 * POST /api/auth/reset-password
 * 重置密码
 */
router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ success: false, message: '缺少令牌或新密码' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: '密码长度不能少于6位' });
  }

  const verification = db.prepare(`
    SELECT * FROM email_verifications
    WHERE token = ? AND type = 'reset' AND used = 0 AND expires_at > datetime('now')
  `).get(token);

  if (!verification) {
    return res.status(400).json({ success: false, message: '重置令牌无效或已过期' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, session_version = COALESCE(session_version, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(hash, verification.user_id);
  db.prepare('UPDATE email_verifications SET used = 1 WHERE id = ?').run(verification.id);

  res.json({ success: true, message: '密码重置成功，请使用新密码登录' });
});

/**
 * PUT /api/auth/password
 * 修改密码（需登录）
 */
router.put('/password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: '请提供原密码和新密码' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: '新密码长度不能少于6位' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.admin.id);

  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(401).json({ success: false, message: '原密码错误' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, session_version = COALESCE(session_version, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(hash, user.id);

  // 兼容旧用户名登录：admin -> admin@legacy.local
  if (user.email && user.email.endsWith('@legacy.local')) {
    const legacyUsername = user.email.replace('@legacy.local', '');
    db.prepare('UPDATE admins_legacy SET password_hash = ? WHERE username = ?')
      .run(hash, legacyUsername);
  }

  db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, ip_address) VALUES (?, ?, ?, ?, ?)')
    .run(user.id, 'update_password', 'user', user.id, req.ip);

  res.json({ success: true, message: '密码修改成功' });
});

/**
 * GET /api/auth/users
 * 获取用户列表（仅管理员）
 */
router.get('/users', authMiddleware, requireAdmin, (req, res) => {
  const { search = '', role = 'all', status = 'all', page = 1, pageSize = 50 } = req.query;
  const conditions = [];
  const params = [];

  if (search.trim()) {
    const keyword = `%${search.trim()}%`;
    conditions.push('(u.email LIKE ? OR u.display_name LIKE ? OR u.phone LIKE ? OR u.user_code LIKE ?)');
    params.push(keyword, keyword, keyword, keyword);
  }
  if (status !== 'all') {
    conditions.push('u.status = ?');
    params.push(status);
  }
  if (role === 'platform_admin') {
    conditions.push("u.platform_role IN ('admin', 'platform_admin')");
  } else if (role === 'company_member') {
    conditions.push("EXISTS (SELECT 1 FROM company_members cm WHERE cm.user_id = u.id AND cm.status = 'active')");
  } else if (role === 'user') {
    conditions.push("u.platform_role = 'user' AND NOT EXISTS (SELECT 1 FROM company_members cm WHERE cm.user_id = u.id AND cm.status = 'active')");
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(200, Math.max(1, Number(pageSize) || 50));
  const offset = (safePage - 1) * safePageSize;
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM users u ${where}`).get(...params);
  const users = db.prepare(`
    SELECT u.id, u.email, u.phone, u.display_name, u.user_code, u.platform_role, u.email_verified,
           u.status, u.created_at, u.updated_at,
           COUNT(DISTINCT CASE WHEN cm.status = 'active' THEN cm.company_id END) AS company_count,
           GROUP_CONCAT(DISTINCT CASE WHEN cm.status = 'active' THEN c.name END) AS company_names
    FROM users u
    LEFT JOIN company_members cm ON cm.user_id = u.id
    LEFT JOIN companies c ON c.id = cm.company_id
    ${where}
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, safePageSize, offset);

  const summary = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN platform_role IN ('admin', 'platform_admin') THEN 1 ELSE 0 END) AS platform_admins,
      SUM(CASE WHEN EXISTS (SELECT 1 FROM company_members cm WHERE cm.user_id = users.id AND cm.status = 'active') THEN 1 ELSE 0 END) AS company_users,
      SUM(CASE WHEN platform_role = 'user' AND NOT EXISTS (SELECT 1 FROM company_members cm WHERE cm.user_id = users.id AND cm.status = 'active') THEN 1 ELSE 0 END) AS regular_users,
      SUM(CASE WHEN status != 'active' THEN 1 ELSE 0 END) AS disabled_users
    FROM users
  `).get();

  res.json({
    success: true,
    data: users,
    summary,
    pagination: { page: safePage, pageSize: safePageSize, total, totalPages: Math.ceil(total / safePageSize) },
  });
});

router.get('/users/:id', authMiddleware, requireAdmin, (req, res) => {
  const user = db.prepare(`
    SELECT id, email, phone, display_name, real_name, position, department, user_code,
           platform_role, email_verified, phone_verified, status, created_at, updated_at
    FROM users WHERE id = ?
  `).get(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
  user.companies = db.prepare(`
    SELECT cm.company_id, c.name AS company_name, cm.role, cm.status, cm.joined_at
    FROM company_members cm JOIN companies c ON c.id = cm.company_id
    WHERE cm.user_id = ? ORDER BY cm.joined_at DESC
  `).all(user.id);
  return res.json({ success: true, data: user });
});

router.put('/users/:id', authMiddleware, requireAdmin, (req, res) => {
  const target = db.prepare('SELECT id, platform_role, status FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ success: false, message: '用户不存在' });

  const fields = [];
  const values = [];
  const changes = {};
  if (req.body.status !== undefined) {
    if (!['active', 'disabled'].includes(req.body.status)) return res.status(400).json({ success: false, message: '账号状态无效' });
    if (target.id === req.admin.id && req.body.status !== 'active') return res.status(400).json({ success: false, message: '不能禁用当前登录账号' });
    fields.push('status = ?');
    values.push(req.body.status);
    changes.status = { old: target.status, new: req.body.status };
  }
  if (req.body.platformRole !== undefined) {
    if (!['user', 'platform_admin'].includes(req.body.platformRole)) return res.status(400).json({ success: false, message: '平台角色无效' });
    if (target.id === req.admin.id && req.body.platformRole !== 'platform_admin') return res.status(400).json({ success: false, message: '不能移除当前账号的平台管理员权限' });
    fields.push('platform_role = ?');
    values.push(req.body.platformRole);
    changes.platform_role = { old: target.platform_role, new: req.body.platformRole };
  }
  if (!fields.length) return res.status(400).json({ success: false, message: '没有需要更新的字段' });
  fields.push('session_version = COALESCE(session_version, 0) + 1', 'updated_at = CURRENT_TIMESTAMP');
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values, target.id);
  db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.admin.id, 'update_user_access', 'user', target.id, JSON.stringify(changes), req.ip);
  return res.json({ success: true, message: '用户权限已更新' });
});

module.exports = router;
