/**
 * EU-DOC 后端服务 - 企业管理路由
 * 版本: 1.0.1
 *
 * 路由:
 * - GET    /     - 获取企业列表（公开接口）
 * - GET    /:id  - 获取企业详情（公开接口）
 * - POST   /     - 创建企业（需认证）
 * - PUT    /:id  - 更新企业（需认证）
 * - DELETE /:id  - 删除企业（需认证）
 */

const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');

const router = Router();

/**
 * GET /api/companies
 * 获取企业列表（公开接口）
 *
 * 查询参数:
 * - page, pageSize: 分页
 * - search: 搜索企业名称
 */
router.get('/', (req, res) => {
  const { page = 1, pageSize = 20, search } = req.query;

  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(name LIKE ? OR name_en LIKE ?)');
    const keyword = `%${search}%`;
    params.push(keyword, keyword);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const { total } = db.prepare(`SELECT COUNT(*) as total FROM companies ${whereClause}`).get(...params);

  const offset = (Number(page) - 1) * Number(pageSize);
  const companies = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM certificates WHERE company_id = c.id) as cert_count
    FROM companies c
    ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  res.json({
    success: true,
    data: companies,
    pagination: {
      page: Number(page),
      pageSize: Number(pageSize),
      total,
      totalPages: Math.ceil(total / Number(pageSize)),
    },
  });
});

/**
 * GET /api/companies/:id
 * 获取企业详情（公开接口）
 * 包含该企业下的所有证书
 */
router.get('/:id', (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);

  if (!company) {
    return res.status(404).json({
      success: false,
      message: '企业不存在',
    });
  }

  // 查询该企业下的所有证书
  const certificates = db.prepare(
    'SELECT id, cert_no, product_name, category, model, standard, issuer, status, issue_date, expiry_date, file_path, thumbnail_path FROM certificates WHERE company_id = ? ORDER BY created_at DESC'
  ).all(company.id);

  res.json({
    success: true,
    data: {
      ...company,
      certificates,
    },
  });
});

/**
 * POST /api/companies
 * 创建企业（需认证）
 */
router.post('/', authMiddleware, (req, res) => {
  const { name, name_en, contact_person, contact_email, contact_phone, address } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: '企业名称为必填项',
    });
  }

  try {
    const result = db.prepare(`
      INSERT INTO companies (name, name_en, contact_person, contact_email, contact_phone, address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, name_en || null, contact_person || null, contact_email || null, contact_phone || null, address || null);

    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'create', 'company', result.lastInsertRowid,
      JSON.stringify({ name }), req.ip
    );

    res.status(201).json({
      success: true,
      message: '企业创建成功',
      id: result.lastInsertRowid,
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({
        success: false,
        message: '企业名称已存在',
      });
    }
    throw err;
  }
});

/**
 * PUT /api/companies/:id
 * 更新企业（需认证）
 */
router.put('/:id', authMiddleware, (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);

  if (!company) {
    return res.status(404).json({
      success: false,
      message: '企业不存在',
    });
  }

  const fields = ['name', 'name_en', 'contact_person', 'contact_email', 'contact_phone', 'address'];
  const setParts = [];
  const values = [];
  const changes = {};

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      setParts.push(`${field} = ?`);
      values.push(req.body[field]);
      changes[field] = { old: company[field], new: req.body[field] };
    }
  }

  if (setParts.length === 0) {
    return res.status(400).json({
      success: false,
      message: '没有提供需要更新的字段',
    });
  }

  setParts.push('updated_at = CURRENT_TIMESTAMP');

  db.prepare(`UPDATE companies SET ${setParts.join(', ')} WHERE id = ?`)
    .run(...values, company.id);

  db.prepare(
    'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    req.admin.id, 'update', 'company', company.id,
    JSON.stringify(changes), req.ip
  );

  res.json({ success: true, message: '企业更新成功' });
});

/**
 * DELETE /api/companies/:id
 * 删除企业（需认证）
 * 注意：如果该企业下有关联证书，会阻止删除（外键约束）
 */
router.delete('/:id', authMiddleware, (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);

  if (!company) {
    return res.status(404).json({
      success: false,
      message: '企业不存在',
    });
  }

  // 检查是否有关联证书
  const certCount = db.prepare('SELECT COUNT(*) as cnt FROM certificates WHERE company_id = ?').get(company.id);

  if (certCount.cnt > 0) {
    return res.status(409).json({
      success: false,
      message: `该企业下有 ${certCount.cnt} 条证书记录，请先删除或转移相关证书`,
    });
  }

  db.prepare('DELETE FROM companies WHERE id = ?').run(company.id);

  db.prepare(
    'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    req.admin.id, 'delete', 'company', company.id,
    JSON.stringify({ name: company.name }), req.ip
  );

  res.json({ success: true, message: '企业已删除' });
});

module.exports = router;
