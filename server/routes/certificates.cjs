/**
 * EU-DOC 证书路由 v2.0
 *
 * 基于新的数据模型：documents + certificate_metadata + products
 * API 保持向后兼容，返回格式与 v1.x 一致
 */

const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');
const { hasCompanyRole } = require('../middleware/companyRole.cjs');

const router = Router();
const CERTIFICATE_CREATE_ROLES = ['applicant', 'owner', 'admin'];
const CERTIFICATE_EDITOR_ROLES = ['applicant', 'owner', 'admin', 'uploader'];

function requireCertificateEditor(req, res, next) {
  const certificate = db.prepare(`
    SELECT d.*, cm.cert_no
    FROM documents d
    INNER JOIN certificate_metadata cm ON d.id = cm.document_id
    WHERE d.id = ? AND d.document_type = 'certificate'
  `).get(req.params.id);

  if (!certificate) {
    return res.status(404).json({ success: false, message: '证书不存在' });
  }
  if (!hasCompanyRole(req, certificate.company_id, CERTIFICATE_EDITOR_ROLES)) {
    return res.status(403).json({ success: false, message: '无权操作该证书' });
  }

  req.certificate = certificate;
  next();
}

// GET /api/certificates - 获取证书列表（支持搜索、筛选、排序）
router.get('/', (req, res) => {
  const needsPrivateScope = Boolean(req.query.reviewStatus || req.query.myUploads);
  if (needsPrivateScope && !req.admin) {
    return authMiddleware(req, res, () => handleCertificateList(req, res));
  }
  return handleCertificateList(req, res);
});

function handleCertificateList(req, res) {
  try {
    const {
      page = 1,
      pageSize = 10,
      search,
      status,
      reviewStatus,
      issuer,
      standard,
      category,
      companyId,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      myUploads,
    } = req.query;

    // 参数校验
    const allowedSortFields = ['created_at', 'issue_date', 'expiry_date', 'cert_no'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 构建 WHERE 条件
    const conditions = ["d.document_type = 'certificate'"];
    const params = [];

    const isPrivateQuery = Boolean(req.admin && (reviewStatus || myUploads));
    const isPlatformAdmin = req.admin && (req.admin.role === 'admin' || req.admin.role === 'platform_admin');

    if (!isPrivateQuery) {
      conditions.push("d.review_status = 'approved'");
      conditions.push("COALESCE(d.status, 'active') != 'deleted'");
      conditions.push("COALESCE(comp.verification_status, 'pending') = 'verified'");
      conditions.push('COALESCE(comp.public_visible, 1) = 1');
    } else if (!isPlatformAdmin) {
      conditions.push(`d.company_id IN (
        SELECT company_id FROM company_members
        WHERE user_id = ? AND status = 'active'
      )`);
      params.push(req.admin.id);
    }

    if (myUploads && !isPlatformAdmin) {
      conditions.push('d.uploaded_by = ?');
      params.push(req.admin.id);
    }

    // 搜索条件
    if (search) {
      conditions.push('(cm.cert_no LIKE ? OR p.name LIKE ? OR p.model LIKE ? OR comp.name LIKE ? OR comp.name_en LIKE ?)');
      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword, keyword, keyword);
    }

    const getCategoryFilter = (categoryName) => {
      if (!categoryName) return null;

      // 分类筛选按“整棵分类树”匹配：选择一级分类时，也包含其下所有二/三级分类。
      const descendants = db.prepare(`
        WITH RECURSIVE category_tree AS (
          SELECT id, name, parent_id
          FROM categories
          WHERE name = ? AND status = 'active'
          UNION ALL
          SELECT c.id, c.name, c.parent_id
          FROM categories c
          INNER JOIN category_tree ct ON c.parent_id = ct.id
          WHERE c.status = 'active'
        )
        SELECT id, name FROM category_tree
      `).all(categoryName);

      const ids = descendants.map((item) => item.id);
      const names = Array.from(new Set([categoryName, ...descendants.map((item) => item.name)]));
      const parts = [];
      const values = [];

      if (ids.length > 0) {
        parts.push(`p.category_primary_id IN (${ids.map(() => '?').join(', ')})`);
        values.push(...ids);
      }
      if (names.length > 0) {
        const placeholders = names.map(() => '?').join(', ');
        parts.push(`cat.name IN (${placeholders})`);
        parts.push(`parent_cat.name IN (${placeholders})`);
        parts.push(`grand_cat.name IN (${placeholders})`);
        parts.push(`cl.category IN (${placeholders})`);
        values.push(...names, ...names, ...names, ...names);
      }

      if (parts.length === 0) return null;
      return { condition: `(${parts.join(' OR ')})`, values };
    };

    // 筛选条件
    if (status) {
      conditions.push('cm.certificate_status = ?');
      params.push(status);
    }
    if (reviewStatus) {
      conditions.push('d.review_status = ?');
      params.push(reviewStatus);
    }
    if (issuer) {
      conditions.push('cm.issuer = ?');
      params.push(issuer);
    }
    if (standard) {
      conditions.push('cm.standard LIKE ?');
      params.push(`%${standard}%`);
    }
    if (category) {
      const categoryFilter = getCategoryFilter(category);
      if (categoryFilter) {
        conditions.push(categoryFilter.condition);
        params.push(...categoryFilter.values);
      }
    }
    if (companyId) {
      conditions.push('d.company_id = ?');
      params.push(Number(companyId));
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    // 映射排序字段
    let orderByField = 'd.created_at';
    if (safeSortBy === 'issue_date') orderByField = 'cm.issue_date';
    else if (safeSortBy === 'expiry_date') orderByField = 'cm.expiry_date';
    else if (safeSortBy === 'cert_no') orderByField = 'cm.cert_no';

    // 查询总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM documents d
      INNER JOIN certificate_metadata cm ON d.id = cm.document_id
      LEFT JOIN companies comp ON d.company_id = comp.id
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN certificates_legacy cl ON d.id = cl.id
      LEFT JOIN categories cat ON p.category_primary_id = cat.id
      LEFT JOIN categories parent_cat ON cat.parent_id = parent_cat.id
      LEFT JOIN categories grand_cat ON parent_cat.parent_id = grand_cat.id
      ${whereClause}
    `;
    const { total } = db.prepare(countSql).get(...params);

    // 查询数据
    const offset = (Number(page) - 1) * Number(pageSize);
    const dataSql = `
      SELECT
        d.id,
        d.product_id,
        cm.cert_no,
        d.company_id,
        p.name as product_name,
        p.model,
        cm.standard,
        cm.issuer,
        cm.issue_date,
        cm.expiry_date,
        cm.certificate_status as status,
        d.file_path,
        cl.thumbnail_path,
        d.review_status,
        cm.remark,
        d.created_at,
        d.updated_at,
        comp.name as company_name,
        COALESCE(cat.name, cl.category) as category
      FROM documents d
      INNER JOIN certificate_metadata cm ON d.id = cm.document_id
      LEFT JOIN certificates_legacy cl ON d.id = cl.id
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN companies comp ON d.company_id = comp.id
      LEFT JOIN categories cat ON p.category_primary_id = cat.id
      LEFT JOIN categories parent_cat ON cat.parent_id = parent_cat.id
      LEFT JOIN categories grand_cat ON parent_cat.parent_id = grand_cat.id
      ${whereClause}
      ORDER BY ${orderByField} ${safeSortOrder}
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
  } catch (error) {
    console.error('[错误] GET /api/certificates:', error);
    res.status(500).json({
      success: false,
      message: '查询证书列表失败: ' + error.message,
    });
  }
}

// GET /api/certificates/:id - 获取证书详情
router.get('/:id', (req, res) => {
  try {
    const cert = db.prepare(`
      SELECT
        d.id,
        cm.cert_no,
        d.company_id,
        p.name as product_name,
        p.model,
        cm.standard,
        cm.issuer,
        cm.issue_date,
        cm.expiry_date,
        cm.certificate_status as status,
        d.file_path,
        cl.thumbnail_path,
        cl.manual_path,
        cl.declaration_path,
        d.review_status,
        cm.remark,
        d.created_at,
        d.updated_at,
        comp.name as company_name,
        comp.name_en as company_name_en
      FROM documents d
      INNER JOIN certificate_metadata cm ON d.id = cm.document_id
      LEFT JOIN certificates_legacy cl ON d.id = cl.id
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN companies comp ON d.company_id = comp.id
      WHERE d.id = ?
        AND d.document_type = 'certificate'
        AND COALESCE(d.status, 'active') != 'deleted'
        AND COALESCE(d.review_status, 'approved') = 'approved'
        AND COALESCE(comp.verification_status, 'pending') = 'verified'
        AND COALESCE(comp.public_visible, 1) = 1
    `).get(req.params.id);

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: '证书不存在',
      });
    }

    res.json({ success: true, data: cert });
  } catch (error) {
    console.error('[错误] GET /api/certificates/:id:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST /api/certificates - 创建新证书（需认证）
router.post('/', authMiddleware, (req, res) => {
  const {
    certNo, companyId, productName, model, standard,
    issuer, issueDate, expiryDate, status, remark,
  } = req.body;
  const cert_no = certNo;
  const company_id = companyId;
  const product_name = productName;
  const issue_date = issueDate;
  const expiry_date = expiryDate;

  // 必填字段校验
  if (!cert_no || !product_name) {
    return res.status(400).json({
      success: false,
      message: '证书编号和产品名称为必填项',
    });
  }

  // 检查证书编号是否已存在
  const existingCert = db.prepare(`
    SELECT d.id, cm.cert_no, p.name as product_name, comp.name as company_name
    FROM documents d
    INNER JOIN certificate_metadata cm ON d.id = cm.document_id
    LEFT JOIN products p ON d.product_id = p.id
    LEFT JOIN companies comp ON d.company_id = comp.id
    WHERE cm.cert_no = ?
  `).get(cert_no);

  if (existingCert) {
    return res.status(409).json({
      success: false,
      message: '证书编号已存在',
      duplicate: true,
      existingCertificate: {
        id: existingCert.id,
        certNo: existingCert.cert_no,
        productName: existingCert.product_name,
        companyName: existingCert.company_name,
      }
    });
  }

  // 确定审核状态：管理员直接通过，普通用户待审核
  const reviewStatus = ['admin', 'platform_admin'].includes(req.admin.role) ? 'approved' : 'pending';

  // 如果用户有 company_name 且未指定 company_id，自动关联企业
  let finalCompanyId = company_id || null;
  if (!finalCompanyId && req.admin.company_name) {
    const company = db.prepare('SELECT id FROM companies WHERE name = ?').get(req.admin.company_name);
    if (company) {
      finalCompanyId = company.id;
    }
  }

  if (!finalCompanyId) {
    return res.status(400).json({
      success: false,
      message: '必须指定企业',
    });
  }

  if (!hasCompanyRole(req, finalCompanyId, CERTIFICATE_CREATE_ROLES)) {
    return res.status(403).json({ success: false, message: '无权为该企业创建证书' });
  }

  try {
    // v2.0: 使用事务创建 product + document + certificate_metadata
    const result = db.transaction(() => {
      // 1. 查找或创建产品
      let productId = null;
      const existingProduct = db.prepare(`
        SELECT id FROM products
        WHERE company_id = ? AND name = ? AND (model = ? OR (model IS NULL AND ? IS NULL))
      `).get(finalCompanyId, product_name, model, model);

      if (existingProduct) {
        productId = existingProduct.id;
      } else {
        const productResult = db.prepare(`
          INSERT INTO products (company_id, name, model, status, created_by, created_at)
          VALUES (?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
        `).run(finalCompanyId, product_name, model || null, req.admin.id);
        productId = productResult.lastInsertRowid;
      }

      // 2. 创建文档记录
      const docResult = db.prepare(`
        INSERT INTO documents (
          company_id, product_id, document_type, title, language,
          file_path, status, review_status, uploaded_by, created_at
        ) VALUES (?, ?, 'certificate', ?, 'en', NULL, 'active', ?, ?, CURRENT_TIMESTAMP)
      `).run(
        finalCompanyId,
        productId,
        `${product_name} - ${cert_no}`,
        reviewStatus,
        req.admin.id
      );

      const documentId = docResult.lastInsertRowid;

      // 3. 创建证书元数据
      db.prepare(`
        INSERT INTO certificate_metadata (
          document_id, cert_no, standard, issuer, issue_date, expiry_date, certificate_status, remark
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        documentId,
        cert_no,
        standard || null,
        issuer || null,
        issue_date || null,
        expiry_date || null,
        status || 'active',
        remark || null
      );

      return { documentId, productId };
    })();

    // 记录审计日志
    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'create', 'certificate', result.documentId,
      JSON.stringify({ cert_no, product_name, review_status: reviewStatus }), req.ip
    );

    res.status(201).json({
      success: true,
      message: reviewStatus === 'pending' ? '证书已提交，等待管理员审核' : '证书创建成功',
      id: result.documentId,
    });
  } catch (error) {
    console.error('创建证书失败:', error);
    res.status(500).json({
      success: false,
      message: '创建证书失败: ' + error.message,
    });
  }
});

module.exports = router;

// PUT /api/certificates/:id - 更新证书（需认证）
router.put('/:id', authMiddleware, requireCertificateEditor, (req, res) => {
  const cert = db.prepare(`
    SELECT d.*, cm.cert_no, p.id as product_id, p.name as product_name, p.model
    FROM documents d
    INNER JOIN certificate_metadata cm ON d.id = cm.document_id
    LEFT JOIN products p ON d.product_id = p.id
    WHERE d.id = ? AND d.document_type = 'certificate'
  `).get(req.params.id);

  if (!cert) {
    return res.status(404).json({
      success: false,
      message: '证书不存在',
    });
  }

  try {
    db.transaction(() => {
      const changes = {};

      // 更新 certificate_metadata 表字段
      const metaBody = {
        cert_no: req.body.certNo,
        standard: req.body.standard,
        issuer: req.body.issuer,
        issue_date: req.body.issueDate,
        expiry_date: req.body.expiryDate,
        remark: req.body.remark,
      };
      const metaFields = ['cert_no', 'standard', 'issuer', 'issue_date', 'expiry_date', 'remark'];
      const metaSetParts = [];
      const metaValues = [];

      for (const field of metaFields) {
        if (metaBody[field] !== undefined) {
          metaSetParts.push(`${field} = ?`);
          metaValues.push(metaBody[field]);
          changes[field] = { old: cert[field], new: metaBody[field] };
        }
      }

      if (metaSetParts.length > 0) {
        db.prepare(`UPDATE certificate_metadata SET ${metaSetParts.join(', ')} WHERE document_id = ?`)
          .run(...metaValues, cert.id);
      }

      // 更新 documents 表
      if (['admin', 'platform_admin'].includes(req.admin.role) && req.body.reviewStatus !== undefined) {
        db.prepare('UPDATE documents SET review_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(req.body.reviewStatus, cert.id);
        changes.review_status = { old: cert.review_status, new: req.body.reviewStatus };
      }

      // 记录审计日志
      if (Object.keys(changes).length > 0) {
        db.prepare(
          'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(
          req.admin.id, 'update', 'certificate', cert.id,
          JSON.stringify(changes), req.ip
        );
      }
    })();

    res.json({ success: true, message: '证书更新成功' });
  } catch (error) {
    console.error('更新证书失败:', error);
    res.status(500).json({
      success: false,
      message: '更新证书失败: ' + error.message,
    });
  }
});

// DELETE /api/certificates/:id - 删除证书（需认证）
router.delete('/:id', authMiddleware, requireCertificateEditor, (req, res) => {
  const cert = db.prepare(`
    SELECT d.*, cm.cert_no, p.name as product_name
    FROM documents d
    INNER JOIN certificate_metadata cm ON d.id = cm.document_id
    LEFT JOIN products p ON d.product_id = p.id
    WHERE d.id = ? AND d.document_type = 'certificate'
  `).get(req.params.id);

  if (!cert) {
    return res.status(404).json({
      success: false,
      message: '证书不存在',
    });
  }

  // 软删除：设置状态为 deleted
  db.prepare('UPDATE documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('deleted', cert.id);

  // 记录审计日志
  db.prepare(
    'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    req.admin.id, 'delete', 'certificate', cert.id,
    JSON.stringify({ cert_no: cert.cert_no, product_name: cert.product_name }), req.ip
  );

  res.json({ success: true, message: '证书已删除' });
});

module.exports = router;

// PUT /api/certificates/:id/review - 审核证书（仅管理员）
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

  const cert = db.prepare(`
    SELECT d.*, cm.cert_no
    FROM documents d
    INNER JOIN certificate_metadata cm ON d.id = cm.document_id
    WHERE d.id = ? AND d.document_type = 'certificate'
  `).get(certId);

  if (!cert) {
    return res.status(404).json({
      success: false,
      message: '证书不存在',
    });
  }

  // 更新审核状态
  db.prepare(`
    UPDATE documents
    SET review_status = ?, review_note = COALESCE(?, review_note), reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, remark || null, req.admin.id, certId);

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

// 文件上传配置
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateThumbnail } = require('../utils/pdfThumbnail.cjs');

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 PDF 文件'));
    }
  },
});

// POST /api/certificates/:id/upload - 上传证书 PDF 文件（需认证）
router.post("/:id/upload", authMiddleware, requireCertificateEditor, upload.single("file"), async (req, res) => {
  const cert = req.certificate;

  if (!req.file) {
    return res.status(400).json({ success: false, message: "请选择要上传的 PDF 文件" });
  }

  try {
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

    db.prepare("UPDATE documents SET file_path = ?, file_size = ?, mime_type = 'application/pdf', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(filePath, req.file.size, cert.id);

    db.prepare("INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)")
      .run(req.admin.id, "upload", "certificate", cert.id, JSON.stringify({ file: filePath, thumbnail: thumbnailPath }), req.ip);

    res.json({
      success: true,
      message: "文件上传成功",
      filePath,
      thumbnailPath,
    });
  } catch (error) {
    console.error("上传处理失败:", error);
    res.status(500).json({ success: false, message: "文件处理失败: " + error.message });
  }
});

// POST /api/certificates/import - 批量导入证书（需认证）
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
  const getCompanyById = db.prepare('SELECT id FROM companies WHERE id = ?');
  const isPlatformAdmin = ['admin', 'platform_admin'].includes(req.admin.role);

  for (const cert of certList) {
    if (!cert.cert_no || !cert.product_name) continue;

    const company = cert.companyId
      ? getCompanyById.get(cert.companyId)
      : cert.companyName
        ? getCompany.get(cert.companyName)
        : null;

    if (!isPlatformAdmin) {
      if (!company) {
        return res.status(400).json({ success: false, message: '批量导入只能使用已有企业' });
      }
      if (!hasCompanyRole(req, company.id, CERTIFICATE_CREATE_ROLES)) {
        return res.status(403).json({ success: false, message: '无权向批次中的企业导入证书' });
      }
    }
  }

  const reviewStatus = isPlatformAdmin ? 'approved' : 'pending';

  // 使用事务确保批量操作的原子性
  const result = db.transaction(() => {
    let imported = 0;
    let skipped = 0;

    for (const cert of certList) {
      if (!cert.cert_no || !cert.product_name) {
        skipped++;
        continue;
      }

      try {
        // 处理企业关联
        let companyId = cert.companyId || null;
        if (!companyId && cert.companyName) {
          if (isPlatformAdmin) {
            insertCompany.run(cert.companyName, cert.companyName);
          }
          const company = getCompany.get(cert.companyName);
          companyId = company ? company.id : null;
        }

        if (!companyId) {
          skipped++;
          continue;
        }

        // 检查证书是否已存在
        const existing = db.prepare(
          'SELECT id FROM certificate_metadata WHERE cert_no = ?'
        ).get(cert.cert_no);

        if (existing) {
          skipped++;
          continue;
        }

        // 查找或创建产品
        let productId = null;
        const existingProduct = db.prepare(`
          SELECT id FROM products
          WHERE company_id = ? AND name = ? AND (model = ? OR (model IS NULL AND ? IS NULL))
        `).get(companyId, cert.product_name, cert.model, cert.model);

        if (existingProduct) {
          productId = existingProduct.id;
        } else {
          const productResult = db.prepare(`
            INSERT INTO products (company_id, name, model, status, created_by, created_at)
            VALUES (?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
          `).run(companyId, cert.product_name, cert.model || null, req.admin.id);
          productId = productResult.lastInsertRowid;
        }

        // 创建文档记录
        const docResult = db.prepare(`
          INSERT INTO documents (
            company_id, product_id, document_type, title, language,
            file_path, status, review_status, uploaded_by, created_at
          ) VALUES (?, ?, 'certificate', ?, 'en', NULL, 'active', ?, ?, CURRENT_TIMESTAMP)
        `).run(
          companyId,
          productId,
          `${cert.product_name} - ${cert.cert_no}`,
          reviewStatus,
          req.admin.id
        );

        const documentId = docResult.lastInsertRowid;

        // 创建证书元数据
        db.prepare(`
          INSERT INTO certificate_metadata (
            document_id, cert_no, standard, issuer, issue_date, expiry_date, certificate_status, remark
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          documentId,
          cert.cert_no,
          cert.standard || null,
          cert.issuer || null,
          cert.issueDate || null,
          cert.expiryDate || null,
          cert.status || 'active',
          null
        );

        imported++;
      } catch (err) {
        console.error(`导入证书 ${cert.cert_no} 失败:`, err);
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
