/**
 * EU-DOC v2.0 - 企业成员管理 API
 */

const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');

const router = Router();

function getActiveMembership(userId, companyId) {
  return db.prepare(`
    SELECT role
    FROM company_members
    WHERE user_id = ? AND company_id = ? AND status = 'active'
  `).get(userId, companyId);
}

function isPlatformAdmin(req) {
  return ['admin', 'platform_admin'].includes(req.admin?.role);
}

function writeMemberAudit(req, action, companyId, detail) {
  db.prepare(`
    INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address)
    VALUES (?, ?, 'company', ?, ?, ?)
  `).run(req.admin.id, action, companyId, JSON.stringify(detail), req.ip);
}

/**
 * GET /api/v2/company-members
 * 获取企业成员列表
 */
router.get('/', authMiddleware, (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ success: false, message: '请提供企业ID' });
  }

  // 检查用户是否有权限查看该企业成员
  const membership = getActiveMembership(req.admin.id, companyId);

  if (!membership && !isPlatformAdmin(req)) {
    return res.status(403).json({ success: false, message: '无权查看该企业成员' });
  }

  const members = db.prepare(`
    SELECT cm.id, cm.role, cm.status, cm.joined_at,
           u.id as user_id, u.email, u.display_name
    FROM company_members cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.company_id = ?
    ORDER BY cm.joined_at ASC
  `).all(companyId);

  res.json({
    success: true,
    data: members,
    operatorRole: membership?.role || 'platform_admin',
    permissions: isPlatformAdmin(req) ? {
      canInvite: false,
      canChangeRoles: false,
      canRemoveMembers: false,
      readOnly: true,
    } : {
      canInvite: ['applicant', 'owner', 'admin'].includes(membership.role),
      canChangeRoles: ['applicant', 'owner'].includes(membership.role),
      canRemoveMembers: ['applicant', 'owner', 'admin'].includes(membership.role),
    },
  });
});

/**
 * GET /api/v2/company-members/activity
 * 获取当前企业的真实操作记录
 */
router.get('/activity', authMiddleware, (req, res) => {
  const companyId = Number(req.query.companyId);
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);

  if (!companyId) {
    return res.status(400).json({ success: false, message: '请提供企业ID' });
  }

  const membership = getActiveMembership(req.admin.id, companyId);
  if (!membership && !isPlatformAdmin(req)) {
    return res.status(403).json({ success: false, message: '无权查看该企业操作记录' });
  }

  const logs = db.prepare(`
    SELECT
      al.id,
      al.action,
      al.target_type,
      al.target_id,
      al.detail,
      al.created_at,
      COALESCE(u.display_name, u.email, '未知用户') AS actor_name,
      u.email AS actor_email,
      CASE
        WHEN al.target_type = 'company' THEN (SELECT name FROM companies WHERE id = al.target_id)
        WHEN al.target_type = 'product' THEN (SELECT name FROM products WHERE id = al.target_id)
        WHEN al.target_type IN ('document', 'certificate') THEN (SELECT title FROM documents WHERE id = al.target_id)
        ELSE NULL
      END AS target_name
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.admin_id
    WHERE
      (al.target_type = 'company' AND al.target_id = ?)
      OR (
        al.target_type = 'product'
        AND EXISTS (SELECT 1 FROM products p WHERE p.id = al.target_id AND p.company_id = ?)
      )
      OR (
        al.target_type IN ('document', 'certificate')
        AND EXISTS (SELECT 1 FROM documents d WHERE d.id = al.target_id AND d.company_id = ?)
      )
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT ?
  `).all(companyId, companyId, companyId, limit);

  res.json({ success: true, data: logs });
});

/**
 * POST /api/v2/company-members/invite
 * 邀请成员（通过邮箱）
 */
router.post('/invite', authMiddleware, (req, res) => {
  const companyId = req.body.companyId;
  const { email, role } = req.body;

  if (!companyId || !email || !role) {
    return res.status(400).json({ success: false, message: '缺少必填字段' });
  }

  const validRoles = ['admin', 'uploader', 'viewer'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: '无效的角色' });
  }

  // 检查操作者是否是该企业的 owner 或 admin
  const operatorMembership = getActiveMembership(req.admin.id, companyId);

  if (!operatorMembership || !['applicant', 'owner', 'admin'].includes(operatorMembership.role)) {
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
  `).get(invitedUser.id, companyId);

  if (existingMember) {
    return res.status(409).json({ success: false, message: '该用户已是企业成员' });
  }

  try {
    db.prepare(`
      INSERT INTO company_members (user_id, company_id, role, status, invited_by)
      VALUES (?, ?, ?, 'active', ?)
    `).run(invitedUser.id, companyId, role, req.admin.id);

    writeMemberAudit(req, 'invite_member', companyId, { email, role, memberUserId: invitedUser.id });

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

  // 企业申请人在认证前承担所有者职责；认证通过后会自动转为 owner。
  const operatorMembership = getActiveMembership(req.admin.id, member.company_id);

  if (!operatorMembership || !['applicant', 'owner'].includes(operatorMembership.role)) {
    return res.status(403).json({ success: false, message: '只有企业所有者可以修改成员角色' });
  }

  const memberUser = db.prepare('SELECT email, display_name FROM users WHERE id = ?').get(member.user_id);
  db.prepare('UPDATE company_members SET role = ? WHERE id = ?').run(role, req.params.id);
  writeMemberAudit(req, 'update_member_role', member.company_id, {
    memberId: member.id,
    memberUserId: member.user_id,
    email: memberUser?.email,
    displayName: memberUser?.display_name,
    oldRole: member.role,
    newRole: role,
  });

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
  const operatorMembership = getActiveMembership(req.admin.id, member.company_id);

  if (!operatorMembership) {
    return res.status(403).json({ success: false, message: '无权操作' });
  }

  if (member.user_id !== req.admin.id && !['applicant', 'owner', 'admin'].includes(operatorMembership.role)) {
    return res.status(403).json({ success: false, message: '无权移除该成员' });
  }

  const memberUser = db.prepare('SELECT email, display_name FROM users WHERE id = ?').get(member.user_id);
  db.prepare('DELETE FROM company_members WHERE id = ?').run(req.params.id);
  writeMemberAudit(req, 'remove_member', member.company_id, {
    memberId: member.id,
    memberUserId: member.user_id,
    email: memberUser?.email,
    displayName: memberUser?.display_name,
    role: member.role,
  });

  res.json({ success: true, message: '成员已移除' });
});

/**
 * POST /api/v2/company-members
 * 创建企业（自动成为 owner）
 */
router.post('/', authMiddleware, (req, res) => {
  const { name, nameEn } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: '企业名称为必填项' });
  }

  try {
    // 创建企业
    const result = db.prepare('INSERT INTO companies (name, name_en) VALUES (?, ?)').run(name, nameEn || null);
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
