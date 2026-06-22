/**
 * EU-DOC v2.0 - 文档管理 API
 *
 * 路由:
 * - GET    /api/v2/documents           - 获取文档列表
 * - GET    /api/v2/documents/:id       - 获取文档详情
 * - POST   /api/v2/documents           - 创建文档（需认证）
 * - PUT    /api/v2/documents/:id       - 更新文档（需认证）
 * - DELETE /api/v2/documents/:id       - 删除文档（需认证）
 */

const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');

const router = Router();

// GET /api/v2/documents - 获取文档列表
router.get('/', (req, res) => {
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

    if (status) {
      conditions.push('d.status = ?');
      params.push(status);
    }

    // 未登录用户只能看到已审核通过的文档
    const authHeader = req.headers.authorization;
    const hasToken = authHeader && authHeader.startsWith('Bearer ');

    if (!hasToken || !reviewStatus) {
      conditions.push("d.review_status = 'approved'");
    } else if (reviewStatus) {
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
        p.name as product_name,
        p.model as product_model,
        c.name as company_name,
        u.display_name as uploaded_by_name
      FROM documents d
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN companies c ON d.company_id = c.id
      LEFT JOIN users u ON d.uploaded_by = u.id
      ${whereClause}
      ORDER BY d.${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;

    const documents = db.prepare(dataSql).all(...params, Number(pageSize), offset);

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
});

// GET /api/v2/documents/:id - 获取文档详情
router.get('/:id', (req, res) => {
  try {
    const document = db.prepare(`
      SELECT
        d.*,
        p.name as product_name,
        p.model as product_model,
        c.name as company_name,
        c.name_en as company_name_en,
        u.display_name as uploaded_by_name,
        reviewer.display_name as reviewed_by_name
      FROM documents d
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN companies c ON d.company_id = c.id
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

// POST /api/v2/documents - 创建文档
router.post('/', authMiddleware, (req, res) => {
  const {
    company_id, product_id, document_type, title, language = 'en',
    file_path, status = 'active'
  } = req.body;

  // 必填字段校验
  if (!company_id || !product_id || !document_type || !title) {
    return res.status(400).json({
      success: false,
      message: '企业ID、产品ID、文档类型和标题为必填项',
    });
  }

  // 文档类型校验
  const validTypes = ['certificate', 'declaration_of_conformity', 'manual', 'test_report', 'other'];
  if (!validTypes.includes(document_type)) {
    return res.status(400).json({
      success: false,
      message: '无效的文档类型',
    });
  }

  // 确定审核状态：管理员直接通过，普通用户待审核
  const reviewStatus = req.admin.role === 'admin' ? 'approved' : 'pending';

  try {
    const result = db.prepare(`
      INSERT INTO documents (
        company_id, product_id, document_type, title, language,
        file_path, status, review_status, uploaded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      company_id,
      product_id,
      document_type,
      title,
      language,
      file_path || null,
      status,
      reviewStatus,
      req.admin.id
    );

    // 记录审计日志
    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'create', 'document', result.lastInsertRowid,
      JSON.stringify({ document_type, title, review_status: reviewStatus }), req.ip
    );

    res.status(201).json({
      success: true,
      message: reviewStatus === 'pending' ? '文档已提交，等待管理员审核' : '文档创建成功',
      id: result.lastInsertRowid,
    });
  } catch (error) {
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
    const fields = ['title', 'language', 'file_path', 'status'];
    if (req.admin.role === 'admin') {
      fields.push('review_status');
    }

    const setParts = [];
    const values = [];
    const changes = {};

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        setParts.push(`${field} = ?`);
        values.push(req.body[field]);
        changes[field] = { old: document[field], new: req.body[field] };
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
