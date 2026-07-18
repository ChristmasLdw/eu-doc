/**
 * EU-DOC v2.0 - 标签管理 API
 *
 * 路由:
 * - GET    /api/v2/tags                - 获取标签列表
 * - GET    /api/v2/tags/:id            - 获取标签详情
 * - POST   /api/v2/tags                - 创建标签（需管理员）
 * - PUT    /api/v2/tags/:id            - 更新标签（需管理员）
 * - DELETE /api/v2/tags/:id            - 删除标签（需管理员）
 * - POST   /api/v2/tags/:id/products   - 给产品打标签（需认证）
 * - DELETE /api/v2/tags/:id/products/:productId - 移除产品标签（需认证）
 * - POST   /api/v2/tags/:id/documents  - 给文档打标签（需认证）
 * - DELETE /api/v2/tags/:id/documents/:documentId - 移除文档标签（需认证）
 */

const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');
const { hasCompanyRole } = require('../middleware/companyRole.cjs');

const router = Router();
const PRODUCT_TAG_EDITOR_ROLES = ['applicant', 'owner', 'admin'];
const DOCUMENT_TAG_EDITOR_ROLES = ['applicant', 'owner', 'admin', 'uploader'];

// GET /api/v2/tags - 获取标签列表
router.get('/', (req, res) => {
  try {
    const { includeCount = 'true', type } = req.query;

    let sql = `
      SELECT
        t.id,
        t.name,
        t.name_en,
        t.type,
        t.description,
        t.status,
        t.created_at
    `;

    // 是否包含使用统计
    if (includeCount === 'true') {
      sql += `,
        (SELECT COUNT(*) FROM product_tags WHERE tag_id = t.id) as product_count,
        (SELECT COUNT(*) FROM document_tags WHERE tag_id = t.id) as document_count
      `;
    }

    sql += `
      FROM tags t
      WHERE t.status = 'active'
    `;

    const params = [];

    // 筛选标签类型
    if (type) {
      sql += ` AND t.type = ?`;
      params.push(type);
    }

    sql += `
      ORDER BY t.id ASC
    `;

    const tags = db.prepare(sql).all(...params);

    res.json({
      success: true,
      data: tags,
      total: tags.length,
    });
  } catch (error) {
    console.error('[错误] GET /api/v2/tags:', error);
    res.status(500).json({
      success: false,
      message: '查询标签列表失败: ' + error.message,
    });
  }
});

// GET /api/v2/tags/:id - 获取标签详情
router.get('/:id', (req, res) => {
  try {
    const tag = db.prepare(`
      SELECT
        t.*,
        (SELECT COUNT(*) FROM product_tags WHERE tag_id = t.id) as product_count,
        (SELECT COUNT(*) FROM document_tags WHERE tag_id = t.id) as document_count
      FROM tags t
      WHERE t.id = ?
    `).get(req.params.id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: '标签不存在',
      });
    }

    // 获取使用该标签的产品（最多10个）
    const products = db.prepare(`
      SELECT p.id, p.name, p.model
      FROM products p
      INNER JOIN product_tags pt ON p.id = pt.product_id
      WHERE pt.tag_id = ?
      LIMIT 10
    `).all(tag.id);

    tag.sample_products = products;

    // 获取使用该标签的文档（最多10个）
    const documents = db.prepare(`
      SELECT d.id, d.title, d.document_type
      FROM documents d
      INNER JOIN document_tags dt ON d.id = dt.document_id
      WHERE dt.tag_id = ?
      LIMIT 10
    `).all(tag.id);

    tag.sample_documents = documents;

    res.json({ success: true, data: tag });
  } catch (error) {
    console.error('[错误] GET /api/v2/tags/:id:', error);
    res.status(500).json({
      success: false,
      message: '查询标签详情失败: ' + error.message,
    });
  }
});

// POST /api/v2/tags - 创建标签
router.post('/', authMiddleware, requireAdmin, (req, res) => {
  const {
    name, nameEn, type = 'general', description, status = 'active'
  } = req.body;
  const name_en = nameEn;

  // 必填字段校验
  if (!name) {
    return res.status(400).json({
      success: false,
      message: '标签名称为必填项',
    });
  }

  try {
    const result = db.prepare(`
      INSERT INTO tags (
        name, name_en, type, description, status, created_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      name,
      name_en || null,
      type,
      description || null,
      status
    );

    // 记录审计日志
    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'create', 'tag', result.lastInsertRowid,
      JSON.stringify({ name, type }), req.ip
    );

    res.status(201).json({
      success: true,
      message: '标签创建成功',
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('创建标签失败:', error);
    res.status(500).json({
      success: false,
      message: '创建标签失败: ' + error.message,
    });
  }
});

// PUT /api/v2/tags/:id - 更新标签
router.put('/:id', authMiddleware, requireAdmin, (req, res) => {
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);

  if (!tag) {
    return res.status(404).json({
      success: false,
      message: '标签不存在',
    });
  }

  try {
    const body = {
      name: req.body.name,
      name_en: req.body.nameEn,
      type: req.body.type,
      description: req.body.description,
      status: req.body.status,
    };
    const fields = ['name', 'name_en', 'type', 'description', 'status'];
    const setParts = [];
    const values = [];
    const changes = {};

    for (const field of fields) {
      if (body[field] !== undefined) {
        setParts.push(`${field} = ?`);
        values.push(body[field]);
        changes[field] = { old: tag[field], new: body[field] };
      }
    }

    if (setParts.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供需要更新的字段',
      });
    }

    setParts.push('updated_at = CURRENT_TIMESTAMP');

    db.prepare(`UPDATE tags SET ${setParts.join(', ')} WHERE id = ?`)
      .run(...values, tag.id);

    // 记录审计日志
    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'update', 'tag', tag.id,
      JSON.stringify(changes), req.ip
    );

    res.json({ success: true, message: '标签更新成功' });
  } catch (error) {
    console.error('更新标签失败:', error);
    res.status(500).json({
      success: false,
      message: '更新标签失败: ' + error.message,
    });
  }
});

// DELETE /api/v2/tags/:id - 删除标签
router.delete('/:id', authMiddleware, requireAdmin, (req, res) => {
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);

  if (!tag) {
    return res.status(404).json({
      success: false,
      message: '标签不存在',
    });
  }

  try {
    // 使用事务删除标签及其关联关系
    db.transaction(() => {
      // 软删除标签
      db.prepare('UPDATE tags SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('deleted', tag.id);

      // 删除产品标签关联
      db.prepare('DELETE FROM product_tags WHERE tag_id = ?').run(tag.id);

      // 删除文档标签关联
      db.prepare('DELETE FROM document_tags WHERE tag_id = ?').run(tag.id);
    })();

    // 记录审计日志
    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'delete', 'tag', tag.id,
      JSON.stringify({ name: tag.name }), req.ip
    );

    res.json({ success: true, message: '标签已删除' });
  } catch (error) {
    console.error('删除标签失败:', error);
    res.status(500).json({
      success: false,
      message: '删除标签失败: ' + error.message,
    });
  }
});

// POST /api/v2/tags/:id/products - 给产品打标签
router.post('/:id/products', authMiddleware, (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({
      success: false,
      message: '产品ID为必填项',
    });
  }

  // 验证标签是否存在
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
  if (!tag) {
    return res.status(404).json({
      success: false,
      message: '标签不存在',
    });
  }

  // 验证产品是否存在
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: '产品不存在',
    });
  }

  if (!hasCompanyRole(req, product.company_id, PRODUCT_TAG_EDITOR_ROLES)) {
    return res.status(403).json({ success: false, message: '无权修改该产品的标签' });
  }

  // 检查是否已经打过标签
  const existing = db.prepare('SELECT * FROM product_tags WHERE product_id = ? AND tag_id = ?')
    .get(productId, tag.id);

  if (existing) {
    return res.status(409).json({
      success: false,
      message: '该产品已有此标签',
    });
  }

  try {
    db.prepare('INSERT INTO product_tags (product_id, tag_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .run(productId, tag.id);

    res.json({ success: true, message: '标签添加成功' });
  } catch (error) {
    console.error('添加产品标签失败:', error);
    res.status(500).json({
      success: false,
      message: '添加标签失败: ' + error.message,
    });
  }
});

// DELETE /api/v2/tags/:id/products/:productId - 移除产品标签
router.delete('/:id/products/:productId', authMiddleware, (req, res) => {
  const product = db.prepare('SELECT company_id FROM products WHERE id = ?').get(req.params.productId);
  if (!product) {
    return res.status(404).json({ success: false, message: '产品不存在' });
  }
  if (!hasCompanyRole(req, product.company_id, PRODUCT_TAG_EDITOR_ROLES)) {
    return res.status(403).json({ success: false, message: '无权修改该产品的标签' });
  }

  const result = db.prepare('DELETE FROM product_tags WHERE tag_id = ? AND product_id = ?')
    .run(req.params.id, req.params.productId);

  if (result.changes === 0) {
    return res.status(404).json({
      success: false,
      message: '标签关联不存在',
    });
  }

  res.json({ success: true, message: '标签已移除' });
});

// POST /api/v2/tags/:id/documents - 给文档打标签
router.post('/:id/documents', authMiddleware, (req, res) => {
  const { documentId } = req.body;

  if (!documentId) {
    return res.status(400).json({
      success: false,
      message: '文档ID为必填项',
    });
  }

  // 验证标签是否存在
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
  if (!tag) {
    return res.status(404).json({
      success: false,
      message: '标签不存在',
    });
  }

  // 验证文档是否存在
  const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId);
  if (!document) {
    return res.status(404).json({
      success: false,
      message: '文档不存在',
    });
  }

  if (!hasCompanyRole(req, document.company_id, DOCUMENT_TAG_EDITOR_ROLES)) {
    return res.status(403).json({ success: false, message: '无权修改该文档的标签' });
  }

  // 检查是否已经打过标签
  const existing = db.prepare('SELECT * FROM document_tags WHERE document_id = ? AND tag_id = ?')
    .get(documentId, tag.id);

  if (existing) {
    return res.status(409).json({
      success: false,
      message: '该文档已有此标签',
    });
  }

  try {
    db.prepare('INSERT INTO document_tags (document_id, tag_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .run(documentId, tag.id);

    res.json({ success: true, message: '标签添加成功' });
  } catch (error) {
    console.error('添加文档标签失败:', error);
    res.status(500).json({
      success: false,
      message: '添加标签失败: ' + error.message,
    });
  }
});

// DELETE /api/v2/tags/:id/documents/:documentId - 移除文档标签
router.delete('/:id/documents/:documentId', authMiddleware, (req, res) => {
  const document = db.prepare('SELECT company_id FROM documents WHERE id = ?').get(req.params.documentId);
  if (!document) {
    return res.status(404).json({ success: false, message: '文档不存在' });
  }
  if (!hasCompanyRole(req, document.company_id, DOCUMENT_TAG_EDITOR_ROLES)) {
    return res.status(403).json({ success: false, message: '无权修改该文档的标签' });
  }

  const result = db.prepare('DELETE FROM document_tags WHERE tag_id = ? AND document_id = ?')
    .run(req.params.id, req.params.documentId);

  if (result.changes === 0) {
    return res.status(404).json({
      success: false,
      message: '标签关联不存在',
    });
  }

  res.json({ success: true, message: '标签已移除' });
});

module.exports = router;
