/**
 * EU-DOC 后端服务 - 企业管理路由
 * 版本: 1.0.2
 *
 * 变更记录 (1.0.2):
 * - 新增 POST /:id/logo - 上传企业Logo
 *
 * 路由:
 * - GET    /           - 获取企业列表（公开接口）
 * - GET    /:id        - 获取企业详情（公开接口）
 * - POST   /           - 创建企业（需认证）
 * - PUT    /:id        - 更新企业（需认证）
 * - DELETE /:id        - 删除企业（需认证）
 * - POST   /:id/logo   - 上传企业Logo（需认证）
 */

const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');

const router = Router();

// 配置multer用于Logo上传
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const companyId = req.params.id;
    cb(null, `company-${companyId}-${Date.now()}${ext}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG 格式的图片'));
    }
  }
});

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
      (SELECT COUNT(*) FROM documents d WHERE d.company_id = c.id AND d.document_type = 'certificate') as cert_count
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

  // 查询该企业下的所有证书（v2.0: 从documents+certificate_metadata+products查询）
  const certificates = db.prepare(`
    SELECT 
      d.id,
      cm.cert_no as certNo,
      p.name as productName,
      p.model,
      cm.standard,
      cm.issuer,
      d.status,
      cm.issue_date as issueDate,
      cm.expiry_date as expiryDate,
      d.file_path as filePath
    FROM documents d
    LEFT JOIN certificate_metadata cm ON d.id = cm.document_id
    LEFT JOIN products p ON d.product_id = p.id
    WHERE d.company_id = ? AND d.document_type = 'certificate'
    ORDER BY d.created_at DESC
  `).all(company.id);

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
  const certCount = db.prepare("SELECT COUNT(*) as cnt FROM documents WHERE company_id = ? AND document_type = 'certificate'").get(company.id);

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

/**
 * POST /api/companies/:id/logo
 * 上传企业Logo（需认证）
 */
router.post('/:id/logo', authMiddleware, logoUpload.single('logo'), (req, res) => {
  const companyId = req.params.id;

  // 检查企业是否存在
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);

  if (!company) {
    // 删除已上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(404).json({
      success: false,
      message: '企业不存在',
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: '未上传文件',
    });
  }

  // 删除旧Logo文件
  if (company.logo_path) {
    const oldLogoPath = path.join(__dirname, '../public', company.logo_path);
    if (fs.existsSync(oldLogoPath)) {
      fs.unlinkSync(oldLogoPath);
    }
  }

  // 保存新Logo路径到数据库
  const logoPath = `/logos/${req.file.filename}`;
  db.prepare('UPDATE companies SET logo_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(logoPath, companyId);

  // 记录审计日志
  db.prepare(
    'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    req.admin.id, 'upload_logo', 'company', companyId,
    JSON.stringify({ logo_path: logoPath }), req.ip
  );

  res.json({
    success: true,
    message: 'Logo上传成功',
    logoPath,
  });
});

module.exports = router;
