/**
 * EU-DOC v2.0 - 文档管理 API
 *
 * 路由:
 * - GET    /api/v2/documents           - 获取文档列表
 * - GET    /api/v2/documents/:id       - 获取文档详情
 * - POST   /api/v2/documents           - 创建文档（需认证，支持文件上传）
 * - PUT    /api/v2/documents/:id       - 更新文档（需认证）
 * - DELETE /api/v2/documents/:id       - 删除文档（需认证）
 */

const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');
const { requireCompanyRole } = require('../middleware/companyRole.cjs');
const { assertUnverifiedCompanyUploadAllowed, removeUploadedFiles, UNVERIFIED_COMPANY_MAX_FILE_SIZE, documentFileFilter } = require('../utils/uploadLimits.cjs');

const router = Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: UNVERIFIED_COMPANY_MAX_FILE_SIZE },
  fileFilter: documentFileFilter,
});

// GET /api/v2/documents - 获取资料列表
router.get('/', (req, res) => {
  const needsPrivateAuth = req.query.mine === '1' || req.query.status === 'all' || req.query.reviewStatus === 'all';
  if (needsPrivateAuth) {
    return authMiddleware(req, res, () => listDocuments(req, res));
  }
  return listDocuments(req, res);
});

function listDocuments(req, res) {
  try {
    const {
      page = 1,
      pageSize = 10,
      search,
      companyId,
      productId,
      documentType,
      reviewStatus,
      status = 'active',
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = req.query;

    // 参数校验
    const allowedSortFields = ['created_at', 'updated_at', 'title'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 构建 WHERE 条件
    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      conditions.push('d.status = ?');
      params.push(status);
    }

    // 未登录用户只能看到已审核通过的文档
    const authHeader = req.headers.authorization;
    const hasToken = authHeader && authHeader.startsWith('Bearer ');

    const mineOnly = req.query.mine === '1';
    const privateStatusRequested = status === 'all' || reviewStatus === 'all';

    if (mineOnly) {
      if (req.admin.role !== 'admin' && req.admin.role !== 'platform_admin') {
        conditions.push(`d.company_id IN (
          SELECT company_id FROM company_members
          WHERE user_id = ? AND status = 'active'
        )`);
        params.push(req.admin.id);
      }
    } else if (privateStatusRequested) {
      if (!req.admin) return res.status(401).json({ success: false, message: '查看全部状态资料需要登录' });
      if (req.admin.role !== 'admin' && req.admin.role !== 'platform_admin') {
        if (!companyId) return res.status(403).json({ success: false, message: '请选择有权限的企业' });
        const membership = db.prepare(`
          SELECT id FROM company_members
          WHERE user_id = ? AND company_id = ? AND status = 'active'
        `).get(req.admin.id, Number(companyId));
        if (!membership) return res.status(403).json({ success: false, message: '无权查看该企业的资料' });
      }
    } else {
      conditions.push("d.review_status = 'approved'");
      conditions.push("COALESCE(c.verification_status, 'pending') = 'verified'");
      conditions.push('COALESCE(c.public_visible, 1) = 1');
    }

    if (reviewStatus && reviewStatus !== 'all') {
      conditions.push('d.review_status = ?');
      params.push(reviewStatus);
    }

    if (search) {
      conditions.push('(d.title LIKE ? OR p.name LIKE ? OR c.name LIKE ?)');
      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword);
    }

    if (companyId) {
      conditions.push('d.company_id = ?');
      params.push(Number(companyId));
    }

    if (productId) {
      conditions.push('d.product_id = ?');
      params.push(Number(productId));
    }

    if (documentType) {
      conditions.push('d.document_type = ?');
      params.push(documentType);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // 查询总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM documents d
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN companies c ON d.company_id = c.id
      ${whereClause}
    `;
    const { total } = db.prepare(countSql).get(...params);

    // 查询数据
    const offset = (Number(page) - 1) * Number(pageSize);
    const dataSql = `
      SELECT
        d.*,
        cl.thumbnail_path as legacy_thumbnail_path,
        p.name as product_name,
        p.model as product_model,
        c.name as company_name,
        u.display_name as uploaded_by_name,
        cm.cert_no,
        cm.standard,
        cm.issuer,
        cm.issue_date,
        cm.expiry_date
      FROM documents d
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN companies c ON d.company_id = c.id
      LEFT JOIN certificates_legacy cl ON d.id = cl.id
      LEFT JOIN users u ON d.uploaded_by = u.id
      LEFT JOIN certificate_metadata cm ON d.id = cm.document_id
      ${whereClause}
      ORDER BY d.${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;

    const documents = db.prepare(dataSql).all(...params, Number(pageSize), offset).map((doc) => {
      if (!doc.thumbnail_path && doc.legacy_thumbnail_path) doc.thumbnail_path = doc.legacy_thumbnail_path;
      delete doc.legacy_thumbnail_path;
      return doc;
    });

    res.json({
      success: true,
      data: documents,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    });
  } catch (error) {
    console.error('[错误] GET /api/v2/documents:', error);
    res.status(500).json({
      success: false,
      message: '查询文档列表失败: ' + error.message,
    });
  }
}

// GET /api/v2/documents/:id - 获取文档详情
router.get('/:id', (req, res) => {
  try {
    const document = db.prepare(`
      SELECT
        d.*,
        cl.thumbnail_path as legacy_thumbnail_path,
        p.name as product_name,
        p.model as product_model,
        c.name as company_name,
        c.name_en as company_name_en,
        u.display_name as uploaded_by_name,
        reviewer.display_name as reviewed_by_name
      FROM documents d
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN companies c ON d.company_id = c.id
      LEFT JOIN certificates_legacy cl ON d.id = cl.id
      LEFT JOIN users u ON d.uploaded_by = u.id
      LEFT JOIN users reviewer ON d.reviewed_by = reviewer.id
      WHERE d.id = ?
    `).get(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: '文档不存在',
      });
    }

    if (!document.thumbnail_path && document.legacy_thumbnail_path) {
      document.thumbnail_path = document.legacy_thumbnail_path;
    }
    delete document.legacy_thumbnail_path;

    // 如果是证书，获取证书元数据
    if (document.document_type === 'certificate') {
      const certMeta = db.prepare('SELECT * FROM certificate_metadata WHERE document_id = ?').get(document.id);
      document.certificate_metadata = certMeta;
    }

    // 获取文档的标签
    const tags = db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN document_tags dt ON t.id = dt.tag_id
      WHERE dt.document_id = ?
    `).all(document.id);

    document.tags = tags;

    res.json({ success: true, data: document });
  } catch (error) {
    console.error('[错误] GET /api/v2/documents/:id:', error);
    res.status(500).json({
      success: false,
      message: '查询文档详情失败: ' + error.message,
    });
  }
});

// POST /api/v2/documents - 创建文档（支持文件上传）
router.post('/', authMiddleware, upload.single('file'), (req, res) => {
  const product_id = req.body.productId;
  const document_type = req.body.documentType;
  const cert_no = req.body.certNo;
  const issue_date = req.body.issueDate;
  const expiry_date = req.body.expiryDate;
  const confirmed_authentic = req.body.confirmedAuthentic;
  const confirmed_authorized = req.body.confirmedAuthorized;
  const accepted_disclaimer = req.body.acceptedDisclaimer;
  const { title, language = 'en', standard, issuer } = req.body;

  // 上传确认校验（必须勾选所有确认项）
  if (!confirmed_authentic || !confirmed_authorized || !accepted_disclaimer) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({
      success: false,
      message: '请确认所有声明事项后再上传',
    });
  }

  // 从产品获取企业ID
  let company_id = req.body.companyId;
  if (!company_id && product_id) {
    const product = db.prepare('SELECT company_id FROM products WHERE id = ?').get(product_id);
    if (product) company_id = product.company_id;
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: '请选择要上传的文件',
    });
  }

  // 必填字段校验
  if (!company_id || !product_id || !document_type || !title) {
    // 删除已上传的文件
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({
      success: false,
      message: '企业ID、产品ID、文档类型和标题为必填项',
    });
  }

  // 权限检查：用户必须是该企业的 owner/admin/uploader
  if (req.admin.role !== 'platform_admin' && req.admin.role !== 'admin') {
    const membership = db.prepare(`
      SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND status = 'active'
    `).get(req.admin.id, company_id);

    if (!membership) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({
        success: false,
        message: '您不是该企业的成员，无法上传文档',
      });
    }

    if (!['owner', 'admin', 'uploader', 'applicant'].includes(membership.role)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({
        success: false,
        message: '权限不足，只有企业所有者、管理员和上传者可以上传文档',
      });
    }
  }

  try {
    assertUnverifiedCompanyUploadAllowed(company_id, req.file ? [req.file] : [], req.file ? 1 : 0);
  } catch (error) {
    removeUploadedFiles(req.file ? [req.file] : []);
    return res.status(400).json({ success: false, message: error.message });
  }

  // 文档类型校验
  const validTypes = ['certificate', 'declaration_of_conformity', 'manual', 'test_report', 'other'];
  if (!validTypes.includes(document_type)) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({
      success: false,
      message: '无效的文档类型',
    });
  }

  // 确定审核状态：管理员直接通过，普通用户待审核
  const reviewStatus = ['admin', 'platform_admin'].includes(req.admin.role) ? 'approved' : 'pending';

  // 处理文件路径
  let file_path = null;
  let file_size = null;
  let mime_type = null;
  if (req.file) {
    file_path = `/documents/${req.file.filename}`;
    file_size = req.file.size;
    mime_type = req.file.mimetype;
  }

  try {
    const result = db.prepare(`
      INSERT INTO documents (
        company_id, product_id, document_type, title, language,
        file_path, file_size, mime_type, status, review_status, uploaded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      company_id,
      product_id,
      document_type,
      title,
      language,
      file_path,
      file_size,
      mime_type,
      'active',
      reviewStatus,
      req.admin.id
    );

    const documentId = result.lastInsertRowid;

    // 如果是证书类型，创建证书元数据
    if (document_type === 'certificate' && cert_no) {
      db.prepare(`
        INSERT INTO certificate_metadata (document_id, cert_no, standard, issuer, issue_date, expiry_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(documentId, cert_no, standard || null, issuer || null, issue_date || null, expiry_date || null);
    }

    // 记录审计日志
    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'create', 'document', documentId,
      JSON.stringify({ document_type, title, review_status: reviewStatus }), req.ip
    );

    // 记录上传确认
    db.prepare(`
      INSERT INTO upload_confirmations (document_id, user_id, company_id, confirmed_authentic, confirmed_authorized, accepted_disclaimer, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      documentId,
      req.admin.id,
      company_id,
      confirmed_authentic ? 1 : 0,
      confirmed_authorized ? 1 : 0,
      accepted_disclaimer ? 1 : 0,
      req.ip,
      req.headers['user-agent'] || null
    );

    res.status(201).json({
      success: true,
      message: reviewStatus === 'pending' ? '文档已提交，等待管理员审核' : '文档创建成功',
      id: documentId,
      data: {
        id: documentId,
        file_path,
        file_size,
        mime_type,
        review_status: reviewStatus,
      },
    });
  } catch (error) {
    // 删除已上传的文件
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('创建文档失败:', error);
    res.status(500).json({
      success: false,
      message: '创建文档失败: ' + error.message,
    });
  }
});

// PUT /api/v2/documents/:id - 更新文档
router.put('/:id', authMiddleware, (req, res) => {
  const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: '文档不存在',
    });
  }

  try {
    const body = {
      ...req.body,
      file_path: req.body.filePath,
      review_status: req.body.reviewStatus,
    };
    const fields = ['title', 'language', 'file_path', 'status'];
    if (['admin', 'platform_admin'].includes(req.admin.role)) {
      fields.push('review_status');
    }

    const setParts = [];
    const values = [];
    const changes = {};

    for (const field of fields) {
      if (body[field] !== undefined) {
        setParts.push(`${field} = ?`);
        values.push(body[field]);
        changes[field] = { old: document[field], new: body[field] };
      }
    }

    if (setParts.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供需要更新的字段',
      });
    }

    setParts.push('updated_at = CURRENT_TIMESTAMP');

    db.prepare(`UPDATE documents SET ${setParts.join(', ')} WHERE id = ?`)
      .run(...values, document.id);

    if (document.document_type === 'certificate') {
      const certBody = {
        ...req.body,
        cert_no: req.body.certNo,
        issue_date: req.body.issueDate,
        expiry_date: req.body.expiryDate,
      };
      const certFields = ['cert_no', 'standard', 'issuer', 'issue_date', 'expiry_date'];
      const certSetParts = [];
      const certValues = [];
      for (const field of certFields) {
        if (certBody[field] !== undefined) {
          certSetParts.push(`${field} = ?`);
          certValues.push(certBody[field]);
        }
      }
      if (certSetParts.length > 0) {
        const existingMeta = db.prepare('SELECT id FROM certificate_metadata WHERE document_id = ?').get(document.id);
        if (existingMeta) {
          db.prepare(`UPDATE certificate_metadata SET ${certSetParts.join(', ')} WHERE document_id = ?`)
            .run(...certValues, document.id);
        } else {
          db.prepare('INSERT INTO certificate_metadata (document_id, cert_no, standard, issuer, issue_date, expiry_date) VALUES (?, ?, ?, ?, ?, ?)')
            .run(document.id, certBody.cert_no || null, certBody.standard || null, certBody.issuer || null, certBody.issue_date || null, certBody.expiry_date || null);
        }
      }
    }

    // 记录审计日志
    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'update', 'document', document.id,
      JSON.stringify(changes), req.ip
    );

    res.json({ success: true, message: '文档更新成功' });
  } catch (error) {
    console.error('更新文档失败:', error);
    res.status(500).json({
      success: false,
      message: '更新文档失败: ' + error.message,
    });
  }
});

// POST /api/v2/documents/:id/replace - 替换文档文件
router.post('/:id/replace', authMiddleware, upload.single('file'), (req, res) => {
  const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);

  if (!document) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(404).json({ success: false, message: '文档不存在' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: '请选择要替换的文件' });
  }

  try {
    assertUnverifiedCompanyUploadAllowed(document.company_id, [req.file], 0);
  } catch (error) {
    removeUploadedFiles([req.file]);
    return res.status(400).json({ success: false, message: error.message });
  }

  const filePath = `/documents/${req.file.filename}`;
  db.prepare(`
    UPDATE documents
    SET file_path = ?, file_size = ?, mime_type = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(filePath, req.file.size, req.file.mimetype, document.id);

  db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.admin.id, 'replace_file', 'document', document.id, JSON.stringify({ old: document.file_path, new: filePath }), req.ip);

  res.json({
    success: true,
    message: '文件已替换',
    data: { file_path: filePath, file_size: req.file.size, mime_type: req.file.mimetype },
  });
});

// DELETE /api/v2/documents/:id - 删除文档
router.delete('/:id', authMiddleware, (req, res) => {
  const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: '文档不存在',
    });
  }

  // 软删除
  db.prepare('UPDATE documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('deleted', document.id);

  // 记录审计日志
  db.prepare(
    'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    req.admin.id, 'delete', 'document', document.id,
    JSON.stringify({ document_type: document.document_type, title: document.title }), req.ip
  );

  res.json({ success: true, message: '文档已删除' });
});

module.exports = router;
