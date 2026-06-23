/**
 * EU-DOC v2.0 - 企业成员管理 API
 */

const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');

const router = Router();

/**
 * GET /api/v2/company-members
 * 获取企业成员列表
 */
router.get('/', authMiddleware, (req, res) => {
  const { company_id } = req.query;

  if (!company_id) {
    return res.status(400).json({ success: false, message: '请提供企业ID' });
  }

  // 检查用户是否有权限查看该企业成员
  const membership = db.prepare(`
    SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND status = 'active'
  `).get(req.admin.id, company_id);

  if (!membership) {
    return res.status(403).json({ success: false, message: '无权查看该企业成员' });
  }

  const members = db.prepare(`
    SELECT cm.id, cm.role, cm.status, cm.joined_at,
           u.id as user_id, u.email, u.display_name
    FROM company_members cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.company_id = ?
    ORDER BY cm.joined_at ASC
  `).all(company_id);

  res.json({ success: true, data: members });
});

/**
 * POST /api/v2/company-members/invite
 * 邀请成员（通过邮箱）
 */
router.post('/invite', authMiddleware, (req, res) => {
  const { company_id, email, role } = req.body;

  if (!company_id || !email || !role) {
    return res.status(400).json({ success: false, message: '缺少必填字段' });
  }

  const validRoles = ['admin', 'uploader', 'viewer'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: '无效的角色' });
  }

  // 检查操作者是否是该企业的 owner 或 admin
  const operatorMembership = db.prepare(`
    SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND status = 'active'
  `).get(req.admin.id, company_id);

  if (!operatorMembership || !['owner', 'admin'].includes(operatorMembership.role)) {
    return res.status(403).json({ success: false, message: '只有企业所有者或管理员可以邀请成员' });
  }

  // 查找被邀请用户
  const invitedUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!invitedUser) {
    return res.status(404).json({ success: false, message: '该邮箱未注册' });
  }

  // 检查是否已经是成员
  const existingMember = db.prepare(`
    SELECT id FROM company_members WHERE user_id = ? AND company_id = ?
  `).get(invitedUser.id, company_id);

  if (existingMember) {
    return res.status(409).json({ success: false, message: '该用户已是企业成员' });
  }

  try {
    db.prepare(`
      INSERT INTO company_members (user_id, company_id, role, status, invited_by)
      VALUES (?, ?, ?, 'active', ?)
    `).run(invitedUser.id, company_id, role, req.admin.id);

    db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.admin.id, 'invite_member', 'company', company_id, JSON.stringify({ email, role }), req.ip);

    res.json({ success: true, message: '成员添加成功' });
  } catch (err) {
    console.error('邀请成员失败:', err);
    res.status(500).json({ success: false, message: '邀请失败' });
  }
});

/**
 * PUT /api/v2/company-members/:id/role
 * 修改成员角色
 */
router.put('/:id/role', authMiddleware, (req, res) => {
  const { role } = req.body;

  const validRoles = ['admin', 'uploader', 'viewer'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: '无效的角色' });
  }

  const member = db.prepare('SELECT * FROM company_members WHERE id = ?').get(req.params.id);
  if (!member) {
    return res.status(404).json({ success: false, message: '成员不存在' });
  }

  // 只有 owner 可以修改角色
  const operatorMembership = db.prepare(`
    SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND status = 'active'
  `).get(req.admin.id, member.company_id);

  if (!operatorMembership || operatorMembership.role !== 'owner') {
    return res.status(403).json({ success: false, message: '只有企业所有者可以修改成员角色' });
  }

  db.prepare('UPDATE company_members SET role = ? WHERE id = ?').run(role, req.params.id);

  res.json({ success: true, message: '角色修改成功' });
});

/**
 * DELETE /api/v2/company-members/:id
 * 移除成员
 */
router.delete('/:id', authMiddleware, (req, res) => {
  const member = db.prepare('SELECT * FROM company_members WHERE id = ?').get(req.params.id);
  if (!member) {
    return res.status(404).json({ success: false, message: '成员不存在' });
  }

  // 不能移除 owner
  if (member.role === 'owner') {
    return res.status(400).json({ success: false, message: '不能移除企业所有者' });
  }

  // 检查权限：owner/admin 可以移除成员，成员也可以自己退出
  const operatorMembership = db.prepare(`
    SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND status = 'active'
  `).get(req.admin.id, member.company_id);

  if (!operatorMembership) {
    return res.status(403).json({ success: false, message: '无权操作' });
  }

  if (member.user_id !== req.admin.id && !['owner', 'admin'].includes(operatorMembership.role)) {
    return res.status(403).json({ success: false, message: '无权移除该成员' });
  }

  db.prepare('DELETE FROM company_members WHERE id = ?').run(req.params.id);

  res.json({ success: true, message: '成员已移除' });
});

/**
 * POST /api/v2/company-members
 * 创建企业（自动成为 owner）
 */
router.post('/', authMiddleware, (req, res) => {
  const { name, name_en } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: '企业名称为必填项' });
  }

  try {
    // 创建企业
    const result = db.prepare('INSERT INTO companies (name, name_en) VALUES (?, ?)').run(name, name_en || null);
    const companyId = result.lastInsertRowid;

    // 创建者成为 owner
    db.prepare('INSERT INTO company_members (user_id, company_id, role) VALUES (?, ?, ?)')
      .run(req.admin.id, companyId, 'owner');

    db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.admin.id, 'create_company', 'company', companyId, JSON.stringify({ name }), req.ip);

    res.status(201).json({ success: true, message: '企业创建成功', id: companyId });
  } catch (err) {
    console.error('创建企业失败:', err);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

module.exports = router;
