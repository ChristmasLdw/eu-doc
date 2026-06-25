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
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');

const router = Router();

function ensureCompanyColumns() {
  const columns = db.prepare('PRAGMA table_info(companies)').all().map((col) => col.name);
  const addColumn = (name, definition) => {
    if (!columns.includes(name)) db.prepare(`ALTER TABLE companies ADD COLUMN ${name} ${definition}`).run();
  };
  addColumn('slug', 'TEXT');
  addColumn('website', 'TEXT');
  addColumn('description', 'TEXT');
  addColumn('main_category', 'TEXT');
  addColumn('public_visible', 'INTEGER DEFAULT 1');
}

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
  ensureCompanyColumns();
  const { page = 1, pageSize = 20, search } = req.query;

  if (req.query.my === '1') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '未提供认证令牌，请先登录' });
    }
    const { authMiddleware } = require('../middleware/auth.cjs');
    return authMiddleware(req, res, () => {
      const companies = db.prepare(`
        SELECT c.*, cm.role as member_role
        FROM company_members cm
        JOIN companies c ON cm.company_id = c.id
        WHERE cm.user_id = ? AND cm.status = 'active'
        ORDER BY c.created_at DESC
      `).all(req.admin.id);
      res.json({ success: true, data: companies });
    });
  }

  const conditions = ["COALESCE(c.verification_status, 'pending') = 'verified'", 'COALESCE(c.public_visible, 1) = 1'];
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
  ensureCompanyColumns();
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);

  if (!company) {
    return res.status(404).json({
      success: false,
      message: '企业不存在',
    });
  }

  const isPublicCompany = company.verification_status === 'verified' && company.public_visible !== 0;
  if (!isPublicCompany) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ success: false, message: '该公司尚未认证，暂不公开展示' });
    }
    return authMiddleware(req, res, () => {
      const membership = db.prepare(`
        SELECT id FROM company_members
        WHERE user_id = ? AND company_id = ? AND status = 'active'
      `).get(req.admin.id, company.id);
      if (!membership && req.admin.role !== 'admin' && req.admin.role !== 'platform_admin') {
        return res.status(403).json({ success: false, message: '该公司尚未认证，暂不公开展示' });
      }
      return sendCompanyDetail(res, company);
    });
  }

  return sendCompanyDetail(res, company);
});

function sendCompanyDetail(res, company) {

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
}

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
      INSERT INTO companies (name, name_en, contact_person, contact_email, contact_phone, address, verification_status, public_visible, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, 'draft')
    `).run(name, name_en || null, contact_person || null, contact_email || null, contact_phone || null, address || null);

    const companyId = result.lastInsertRowid;

    console.log('[创建企业] 企业ID:', companyId, '用户ID:', req.admin.id);

    // 将创建者添加为企业所有者
    try {
      db.prepare(`
        INSERT INTO company_members (user_id, company_id, role, status, invited_by)
        VALUES (?, ?, 'applicant', 'active', ?)
      `).run(req.admin.id, companyId, req.admin.id);
      console.log('[创建企业] 成员关系创建成功');
    } catch (memberErr) {
      console.error('[创建企业] 创建成员关系失败:', memberErr.message);
    }

    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'create', 'company', companyId,
      JSON.stringify({ name }), req.ip
    );

    res.status(201).json({
      success: true,
      message: '企业创建成功',
      id: companyId,
    });
  } catch (err) {
    console.error('[创建企业] 错误:', err.message);
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
  ensureCompanyColumns();
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);

  if (!company) {
    return res.status(404).json({
      success: false,
      message: '企业不存在',
    });
  }

  const fields = ['name', 'name_en', 'contact_person', 'contact_email', 'contact_phone', 'address', 'slug', 'website', 'description', 'main_category', 'public_visible'];
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

/**
 * POST /api/companies/:id/verification
 * 提交企业认证申请（需认证）
 */
router.post('/:id/verification', authMiddleware, logoUpload.fields([
  { name: 'business_license', maxCount: 1 },
  { name: 'authorization_letter', maxCount: 1 }
]), (req, res) => {
  const companyId = req.params.id;

  // 检查企业是否存在
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
  if (!company) {
    return res.status(404).json({ success: false, message: '企业不存在' });
  }

  // 检查用户是否是该企业的成员
  const membership = db.prepare('SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND status = ?')
    .get(req.admin.id, companyId, 'active');

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ success: false, message: '只有企业所有者或管理员可以申请认证' });
  }

  // 检查是否已经认证或待审核
  if (company.verification_status === 'verified') {
    return res.status(400).json({ success: false, message: '企业已通过认证' });
  }
  if (company.verification_status === 'pending') {
    return res.status(400).json({ success: false, message: '认证申请审核中，请耐心等待' });
  }

  if (!req.files || !req.files.business_license) {
    return res.status(400).json({ success: false, message: '请上传营业执照' });
  }

  try {
    // 保存文件到 company_verification_documents 表
    const businessLicenseFile = req.files.business_license[0];
    const businessLicensePath = `/logos/${businessLicenseFile.filename}`;

    db.prepare(`
      INSERT INTO company_verification_documents (company_id, document_type, file_path, file_size, uploaded_by, review_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(companyId, 'business_license', businessLicensePath, businessLicenseFile.size, req.admin.id, 'pending');

    // 如果有授权书
    if (req.files.authorization_letter) {
      const authLetterFile = req.files.authorization_letter[0];
      const authLetterPath = `/logos/${authLetterFile.filename}`;
      db.prepare(`
        INSERT INTO company_verification_documents (company_id, document_type, file_path, file_size, uploaded_by, review_status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(companyId, 'authorization_letter', authLetterPath, authLetterFile.size, req.admin.id, 'pending');
    }

    // 更新企业认证状态为待审核
    db.prepare('UPDATE companies SET verification_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('pending', companyId);

    // 记录审计日志
    db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.admin.id, 'submit_verification', 'company', companyId, JSON.stringify({ status: 'pending' }), req.ip);

    res.json({ success: true, message: '认证申请已提交，等待管理员审核' });
  } catch (err) {
    console.error('提交认证申请失败:', err);
    res.status(500).json({ success: false, message: '提交失败' });
  }
});

/**
 * GET /api/v2/companies/verifications
 * 获取企业认证申请列表（仅管理员）
 */
router.get('/verifications', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { status } = req.query;

    let whereClause = '';
    const params = [];

    if (status) {
      whereClause = 'WHERE c.verification_status = ?';
      params.push(status);
    }

    const companies = db.prepare(`
      SELECT c.id as company_id, c.name as company_name, c.business_license_no, c.contact_person,
             c.contact_email, c.verification_status, c.created_at, c.updated_at
      FROM companies c
      ${whereClause}
      ORDER BY c.updated_at DESC
    `).all(...params);

    res.json({ success: true, data: companies });
  } catch (err) {
    console.error('获取认证列表失败:', err);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

/**
 * PUT /api/companies/:id/verification
 * 审核企业认证（仅管理员）
 */
router.put('/:id/verification', authMiddleware, requireAdmin, (req, res) => {
  const companyId = req.params.id;
  const { action, note } = req.body; // action: 'approve' or 'reject'

  if (!action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: '无效的操作' });
  }

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
  if (!company) {
    return res.status(404).json({ success: false, message: '企业不存在' });
  }

  if (company.verification_status !== 'pending') {
    return res.status(400).json({ success: false, message: '该企业当前不是待审核状态' });
  }

  try {
    const newStatus = action === 'approve' ? 'verified' : 'rejected';

    db.prepare(`
      UPDATE companies
      SET verification_status = ?, verified_at = CURRENT_TIMESTAMP, verified_by = ?, verification_note = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newStatus, req.admin.id, note || null, companyId);

    // 记录审计日志
    db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.admin.id, action === 'approve' ? 'approve_verification' : 'reject_verification', 'company', companyId,
           JSON.stringify({ status: newStatus, note }), req.ip);

    res.json({ success: true, message: action === 'approve' ? '认证已通过' : '认证已拒绝' });
  } catch (err) {
    console.error('审核失败:', err);
    res.status(500).json({ success: false, message: '审核失败' });
  }
});


module.exports = router;
