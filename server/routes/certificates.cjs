/**
 * EU-DOC 后端服务 - 证书 CRUD 路由
 * 版本: 1.0.2
 *
 * 变更记录 (1.0.2):
 * - 修改 POST / - 创建证书时自动关联当前用户，普通用户证书默认 pending，管理员直接 approved
 * - 修改 GET / - 前台查询只显示 review_status='approved'，支持 review_status 筛选参数
 * - 新增 PUT /:id/review - 审核证书（仅管理员）
 * - 普通用户不能修改 review_status 字段
 *
 * 路由:
 * - GET    /           - 获取证书列表（公开，支持分页/搜索/筛选/排序）
 * - GET    /:id        - 获取单个证书详情（公开）
 * - POST   /           - 创建证书（需认证）
 * - PUT    /:id        - 更新证书（需认证）
 * - DELETE /:id        - 删除证书（需认证）
 * - PUT    /:id/review - 审核证书（需管理员权限）
 * - POST   /:id/upload - 上传证书 PDF 文件（需认证）
 * - POST   /import     - 批量导入证书（需认证）
 */

const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { db } = require('../db.cjs');
const { generateThumbnail } = require('../utils/pdfThumbnail.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');

const router = Router();

/**
 * 文件上传配置（multer）
 *
 * multer 是 Express 的文件上传中间件，负责处理 multipart/form-data 格式的请求
 * - dest: 文件存储目录
 * - limits: 限制文件大小（10MB）
 * - fileFilter: 只允许 PDF 文件
 */
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 PDF 文件'));
    }
  },
});

/**
 * GET /api/certificates
 * 获取证书列表（公开接口）
 *
 * 查询参数:
 * - page: 页码（默认 1）
 * - pageSize: 每页条数（默认 10）
 * - search: 搜索关键词（匹配证书编号、产品名称、型号）
 * - category: 按类别筛选
 * - status: 按状态筛选（active/expired/revoked）
 * - reviewStatus: 按审核状态筛选（pending/approved/rejected）
 * - issuer: 按发证机构筛选
 * - standard: 按认证标准筛选
 * - companyId: 按企业 ID 筛选
 * - myUploads: 只查看当前用户上传的证书（需要认证）
 * - sortBy: 排序字段（默认 created_at）
 * - sortOrder: 排序方向（ASC/DESC，默认 DESC）
 */
router.get('/', (req, res) => {
  const {
    page = 1,
    pageSize = 10,
    search,
    category,
    status,
    reviewStatus,
    issuer,
    standard,
    companyId,
    myUploads,
    sortBy = 'created_at',
    sortOrder = 'DESC',
  } = req.query;

  // 参数安全校验：防止 SQL 注入（只允许预定义的排序字段）
  const allowedSortFields = [
    'created_at', 'issue_date', 'expiry_date', 'product_name', 'cert_no',
  ];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // 构建 WHERE 条件和参数（使用参数化查询防止 SQL 注入）
  const conditions = [];
  const params = [];

  // 前台公开查询默认只显示已审核通过的证书
  // 如果请求中携带了 token（已登录用户），则不做此限制（管理员可看全部）
  const authHeader = req.headers.authorization;
  const hasToken = authHeader && authHeader.startsWith('Bearer ');

  // 如果是查看"我的上传"，需要通过 audit_logs 追踪用户上传的证书
  let userCertIds = [];
  if (myUploads === 'true' && hasToken) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

      // 查找该用户创建的所有证书ID
      userCertIds = db.prepare(`
        SELECT DISTINCT target_id
        FROM audit_logs
        WHERE admin_id = ? AND action = 'create' AND target_type = 'certificate'
      `).all(decoded.userId).map(row => row.target_id);

      if (userCertIds.length > 0) {
        const placeholders = userCertIds.map(() => '?').join(',');
        conditions.push(`c.id IN (${placeholders})`);
        params.push(...userCertIds);
      } else {
        // 用户还没有上传过证书，返回空列表
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            total: 0,
            totalPages: 0,
          },
        });
      }
    } catch (error) {
      return res.status(401).json({ success: false, message: '无效的认证令牌' });
    }
  } else if (!hasToken || !reviewStatus) {
    // 未登录或未指定 reviewStatus 时，只显示已审核通过的
    if (!reviewStatus) {
      conditions.push("review_status = 'approved'");
    }
  }

  // 搜索条件：匹配证书编号、产品名称、型号、分类、公司名称
  if (search) {
    conditions.push('(c.cert_no LIKE ? OR c.product_name LIKE ? OR c.model LIKE ? OR c.category LIKE ? OR comp.name LIKE ? OR comp.name_en LIKE ?)');
    const keyword = `%${search}%`;
    params.push(keyword, keyword, keyword, keyword, keyword, keyword);
  }

  // 各筛选条件
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (reviewStatus) {
    conditions.push('review_status = ?');
    params.push(reviewStatus);
  }
  if (issuer) {
    conditions.push('issuer = ?');
    params.push(issuer);
  }
  if (standard) {
    conditions.push('standard = ?');
    params.push(standard);
  }
  if (companyId) {
    conditions.push('company_id = ?');
    params.push(Number(companyId));
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // 查询总数（用于分页计算）
  const countSql = `SELECT COUNT(*) as total FROM certificates c LEFT JOIN companies comp ON c.company_id = comp.id ${whereClause}`;
  const { total } = db.prepare(countSql).get(...params);

  // 查询当前页数据
  const offset = (Number(page) - 1) * Number(pageSize);
  const dataSql = `
    SELECT c.*, comp.name as company_name
    FROM certificates c
    LEFT JOIN companies comp ON c.company_id = comp.id
    ${whereClause}
    ORDER BY c.${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;

  const certificates = db.prepare(dataSql).all(...params, Number(pageSize), offset);

  res.json({
    success: true,
    data: certificates,
    pagination: {
      page: Number(page),
      pageSize: Number(pageSize),
      total,
      totalPages: Math.ceil(total / Number(pageSize)),
    },
  });
});

/**
 * GET /api/certificates/:id
 * 获取单个证书详情（公开接口）
 */
router.get('/:id', (req, res) => {
  const cert = db.prepare(`
    SELECT c.*, comp.name as company_name, comp.name_en as company_name_en
    FROM certificates c
    LEFT JOIN companies comp ON c.company_id = comp.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!cert) {
    return res.status(404).json({
      success: false,
      message: '证书不存在',
    });
  }

  res.json({ success: true, data: cert });
});

/**
 * POST /api/certificates
 * 创建新证书（需认证）
 *
 * 请求体: { cert_no, company_id, product_name, category, model, standard, issuer, ... }
 *
 * 权限逻辑:
 * - 管理员创建的证书 review_status 直接为 'approved'
 * - 普通用户创建的证书 review_status 为 'pending'（待审核）
 * - 如果用户有 company_name，自动关联到对应企业
 */
router.post('/', authMiddleware, (req, res) => {
  const {
    cert_no, company_id, product_name, category, model, standard,
    issuer, issue_date, expiry_date, status, source_url, remark,
  } = req.body;

  // 必填字段校验
  if (!cert_no || !product_name) {
    return res.status(400).json({
      success: false,
      message: '证书编号和产品名称为必填项',
    });
  }

  // 确定审核状态：管理员直接通过，普通用户待审核
  const reviewStatus = req.admin.role === 'admin' ? 'approved' : 'pending';

  // 如果用户有 company_name 且未指定 company_id，自动关联企业
  let finalCompanyId = company_id || null;
  if (!finalCompanyId && req.admin.company_name) {
    const company = db.prepare('SELECT id FROM companies WHERE name = ?').get(req.admin.company_name);
    if (company) {
      finalCompanyId = company.id;
    }
  }

  try {
    const result = db.prepare(`
      INSERT INTO certificates (
        cert_no, company_id, product_name, category, model, standard,
        issuer, issue_date, expiry_date, status, source_url, remark, review_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cert_no, finalCompanyId, product_name, category || null, model || null,
      standard || null, issuer || null, issue_date || null, expiry_date || null,
      status || 'active', source_url || null, remark || null, reviewStatus
    );

    // 记录审计日志
    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'create', 'certificate', result.lastInsertRowid,
      JSON.stringify({ cert_no, product_name, review_status: reviewStatus }), req.ip
    );

    res.status(201).json({
      success: true,
      message: reviewStatus === 'pending' ? '证书已提交，等待管理员审核' : '证书创建成功',
      id: result.lastInsertRowid,
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({
        success: false,
        message: '证书编号已存在',
      });
    }
    throw err;
  }
});

/**
 * PUT /api/certificates/:id
 * 更新证书（需认证）
 *
 * 只更新请求体中提供的字段（部分更新/PATCH 语义）
 * 普通用户不能修改 review_status 字段
 */
router.put('/:id', authMiddleware, (req, res) => {
  const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(req.params.id);

  if (!cert) {
    return res.status(404).json({
      success: false,
      message: '证书不存在',
    });
  }

  // 允许更新的字段列表
  const fields = [
    'cert_no', 'company_id', 'product_name', 'category', 'model', 'standard',
    'issuer', 'issue_date', 'expiry_date', 'status',
    'file_path', 'thumbnail_path', 'source_url', 'remark',
  ];

  // 管理员可以额外修改 review_status
  if (req.admin.role === 'admin') {
    fields.push('review_status');
  }

  // 动态构建 SET 子句（只更新客户端实际传了的字段）
  const setParts = [];
  const values = [];
  const changes = {};

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      setParts.push(`${field} = ?`);
      values.push(req.body[field]);
      changes[field] = { old: cert[field], new: req.body[field] };
    }
  }

  if (setParts.length === 0) {
    return res.status(400).json({
      success: false,
      message: '没有提供需要更新的字段',
    });
  }

  // 自动更新 updated_at 时间戳
  setParts.push('updated_at = CURRENT_TIMESTAMP');

  try {
    db.prepare(`UPDATE certificates SET ${setParts.join(', ')} WHERE id = ?`)
      .run(...values, cert.id);

    // 记录审计日志
    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'update', 'certificate', cert.id,
      JSON.stringify(changes), req.ip
    );

    res.json({ success: true, message: '证书更新成功' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({
        success: false,
        message: '证书编号已存在',
      });
    }
    throw err;
  }
});

/**
 * PUT /api/certificates/:id/review
 * 审核证书（仅管理员）
 *
 * 请求体: { status: 'approved' | 'rejected', remark? }
 *
 * 审核流程:
 * 1. 验证 status 值只能是 approved 或 rejected
 * 2. 更新证书的 review_status 和 remark
 * 3. 记录审核日志
 */
router.put('/:id/review', authMiddleware, requireAdmin, (req, res) => {
  const { status, remark } = req.body;
  const certId = req.params.id;

  // 校验审核状态值
  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: '审核状态只能是 approved（通过）或 rejected（拒绝）',
    });
  }

  const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(certId);

  if (!cert) {
    return res.status(404).json({
      success: false,
      message: '证书不存在',
    });
  }

  // 更新审核状态
  db.prepare(`
    UPDATE certificates
    SET review_status = ?, remark = COALESCE(?, remark), updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, remark || null, certId);

  // 记录审核日志
  db.prepare(
    'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    req.admin.id, 'review_' + status, 'certificate', certId,
    JSON.stringify({ cert_no: cert.cert_no, status, remark: remark || null }), req.ip
  );

  res.json({
    success: true,
    message: status === 'approved' ? '证书已审核通过' : '证书已拒绝',
  });
});

/**
 * DELETE /api/certificates/:id
 * 删除证书（需认证）
 */
router.delete('/:id', authMiddleware, (req, res) => {
  const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(req.params.id);

  if (!cert) {
    return res.status(404).json({
      success: false,
      message: '证书不存在',
    });
  }

  db.prepare('DELETE FROM certificates WHERE id = ?').run(cert.id);

  // 记录审计日志
  db.prepare(
    'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    req.admin.id, 'delete', 'certificate', cert.id,
    JSON.stringify({ cert_no: cert.cert_no, product_name: cert.product_name }), req.ip
  );

  res.json({ success: true, message: '证书已删除' });
});

/**
 * POST /api/certificates/:id/upload
 * 上传证书 PDF 文件（需认证）
 *
 * 使用 multipart/form-data 格式，字段名为 "file"
 */
router.post("/:id/upload", authMiddleware, upload.single("file"), async (req, res) => {
  const cert = db.prepare("SELECT * FROM certificates WHERE id = ?").get(req.params.id);

  if (!cert) {
    if (req.file) require("fs").unlinkSync(req.file.path);
    return res.status(404).json({ success: false, message: "证书不存在" });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: "请选择要上传的 PDF 文件" });
  }

  try {
    const fs = require("fs");
    const certDir = path.join(__dirname, "..", "uploads", "certificates");
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }
    
    const newFilename = `${cert.cert_no.replace(/[^a-zA-Z0-9-_]/g, "_")}_cert.pdf`;
    const newPath = path.join(certDir, newFilename);
    fs.renameSync(req.file.path, newPath);
    const filePath = `/certificates/${newFilename}`;

    let thumbnailPath = null;
    try {
      thumbnailPath = await generateThumbnail(newPath, cert.cert_no);
      console.log(`✓ 证书 ${cert.cert_no} 缩略图生成成功: ${thumbnailPath}`);
    } catch (thumbError) {
      console.error("缩略图生成失败:", thumbError.message);
    }

    db.prepare("UPDATE certificates SET file_path = ?, thumbnail_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(filePath, thumbnailPath, cert.id);

    db.prepare("INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)")
      .run(req.admin.id, "upload", "certificate", cert.id, JSON.stringify({ file: filePath, thumbnail: thumbnailPath }), req.ip);

    res.json({
      success: true,
      message: "文件上传成功，缩略图已自动生成",
      filePath,
      thumbnailPath,
    });
  } catch (error) {
    console.error("上传处理失败:", error);
    res.status(500).json({ success: false, message: "文件处理失败: " + error.message });
  }
});
router.post('/import', authMiddleware, (req, res) => {
  const { certificates: certList } = req.body;

  if (!Array.isArray(certList) || certList.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供证书数组',
    });
  }

  const insertCompany = db.prepare(
    'INSERT OR IGNORE INTO companies (name, name_en) VALUES (?, ?)'
  );
  const getCompany = db.prepare('SELECT id FROM companies WHERE name = ?');
  const insertCert = db.prepare(`
    INSERT OR IGNORE INTO certificates (
      cert_no, company_id, product_name, category, model, standard,
      issuer, issue_date, expiry_date, status, source_url, review_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 使用事务确保批量操作的原子性（要么全部成功，要么全部回滚）
  const result = db.transaction(() => {
    let imported = 0;
    let skipped = 0;

    for (const cert of certList) {
      if (!cert.cert_no || !cert.product_name) {
        skipped++;
        continue;
      }

      // 处理企业关联
      let companyId = null;
      if (cert.companyName) {
        insertCompany.run(cert.companyName, cert.companyName);
        const company = getCompany.get(cert.companyName);
        companyId = company ? company.id : null;
      }

      const info = insertCert.run(
        cert.cert_no, companyId, cert.product_name,
        cert.category || null, cert.model || null, cert.standard || null,
        cert.issuer || null, cert.issueDate || null, cert.expiryDate || null,
        cert.status || 'active', cert.sourceUrl || null, cert.reviewStatus || 'pending'
      );

      if (info.changes > 0) {
        imported++;
      } else {
        skipped++;
      }
    }

    return { imported, skipped };
  })();

  // 记录审计日志
  db.prepare(
    'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    req.admin.id, 'import', 'certificate', null,
    JSON.stringify({ imported: result.imported, skipped: result.skipped }), req.ip
  );

  res.json({
    success: true,
    message: `批量导入完成：成功 ${result.imported} 条，跳过 ${result.skipped} 条`,
    ...result,
  });
});

module.exports = router;
