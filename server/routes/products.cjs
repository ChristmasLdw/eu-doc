/**
 * EU-DOC v2.0 - 产品管理 API
 *
 * 路由:
 * - GET    /api/v2/products           - 获取产品列表
 * - GET    /api/v2/products/:id       - 获取产品详情
 * - POST   /api/v2/products           - 创建产品（需认证）
 * - PUT    /api/v2/products/:id       - 更新产品（需认证）
 * - DELETE /api/v2/products/:id       - 删除产品（需认证）
 * - GET    /api/v2/products/:id/documents - 获取产品的所有文档
 */

const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');

const router = Router();

// GET /api/v2/products - 获取产品列表
router.get('/', (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      search,
      companyId,
      categoryId,
      status = 'active',
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = req.query;

    // 参数校验
    const allowedSortFields = ['created_at', 'updated_at', 'name'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 构建 WHERE 条件
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(p.name LIKE ? OR p.model LIKE ? OR p.description LIKE ?)');
      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword);
    }

    if (companyId) {
      conditions.push('p.company_id = ?');
      params.push(Number(companyId));
    }

    if (categoryId) {
      conditions.push('p.category_primary_id = ?');
      params.push(Number(categoryId));
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // 查询总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `;
    const { total } = db.prepare(countSql).get(...params);

    // 查询数据
    const offset = (Number(page) - 1) * Number(pageSize);
    const dataSql = `
      SELECT
        p.*,
        c.name as company_name,
        cat.name as category_name,
        (SELECT COUNT(*) FROM documents WHERE product_id = p.id) as document_count,
        (SELECT COUNT(*) FROM documents WHERE product_id = p.id AND document_type = 'certificate') as certificate_count
      FROM products p
      LEFT JOIN companies c ON p.company_id = c.id
      LEFT JOIN categories cat ON p.category_primary_id = cat.id
      ${whereClause}
      ORDER BY p.${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;

    const products = db.prepare(dataSql).all(...params, Number(pageSize), offset);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    });
  } catch (error) {
    console.error('[错误] GET /api/v2/products:', error);
    res.status(500).json({
      success: false,
      message: '查询产品列表失败: ' + error.message,
    });
  }
});

// GET /api/v2/products/:id - 获取产品详情
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare(`
      SELECT
        p.*,
        c.name as company_name,
        c.name_en as company_name_en,
        cat.name as category_name,
        u.display_name as created_by_name
      FROM products p
      LEFT JOIN companies c ON p.company_id = c.id
      LEFT JOIN categories cat ON p.category_primary_id = cat.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '产品不存在',
      });
    }

    // 获取产品的标签
    const tags = db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN product_tags pt ON t.id = pt.tag_id
      WHERE pt.product_id = ?
    `).all(product.id);

    product.tags = tags;

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('[错误] GET /api/v2/products/:id:', error);
    res.status(500).json({
      success: false,
      message: '查询产品详情失败: ' + error.message,
    });
  }
});

// GET /api/v2/products/:id/documents - 获取产品的所有文档
router.get('/:id/documents', (req, res) => {
  try {
    const documents = db.prepare(`
      SELECT
        d.*,
        CASE
          WHEN d.document_type = 'certificate' THEN cm.cert_no
          ELSE NULL
        END as cert_no
      FROM documents d
      LEFT JOIN certificate_metadata cm ON d.id = cm.document_id AND d.document_type = 'certificate'
      WHERE d.product_id = ?
      ORDER BY d.created_at DESC
    `).all(req.params.id);

    res.json({
      success: true,
      data: documents,
      total: documents.length,
    });
  } catch (error) {
    console.error('[错误] GET /api/v2/products/:id/documents:', error);
    res.status(500).json({
      success: false,
      message: '查询产品文档失败: ' + error.message,
    });
  }
});

// POST /api/v2/products - 创建产品
router.post('/', authMiddleware, (req, res) => {
  const {
    company_id, name, model, description, category_primary_id, status = 'active'
  } = req.body;

  // 必填字段校验
  if (!company_id || !name) {
    return res.status(400).json({
      success: false,
      message: '企业ID和产品名称为必填项',
    });
  }

  try {
    const result = db.prepare(`
      INSERT INTO products (
        company_id, name, model, description, category_primary_id, status, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      company_id,
      name,
      model || null,
      description || null,
      category_primary_id || null,
      status,
      req.admin.id
    );

    // 记录审计日志
    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'create', 'product', result.lastInsertRowid,
      JSON.stringify({ name, model }), req.ip
    );

    res.status(201).json({
      success: true,
      message: '产品创建成功',
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('创建产品失败:', error);
    res.status(500).json({
      success: false,
      message: '创建产品失败: ' + error.message,
    });
  }
});

// PUT /api/v2/products/:id - 更新产品
router.put('/:id', authMiddleware, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: '产品不存在',
    });
  }

  try {
    const fields = ['name', 'model', 'description', 'category_primary_id', 'status'];
    const setParts = [];
    const values = [];
    const changes = {};

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        setParts.push(`${field} = ?`);
        values.push(req.body[field]);
        changes[field] = { old: product[field], new: req.body[field] };
      }
    }

    if (setParts.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供需要更新的字段',
      });
    }

    setParts.push('updated_at = CURRENT_TIMESTAMP');

    db.prepare(`UPDATE products SET ${setParts.join(', ')} WHERE id = ?`)
      .run(...values, product.id);

    // 记录审计日志
    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'update', 'product', product.id,
      JSON.stringify(changes), req.ip
    );

    res.json({ success: true, message: '产品更新成功' });
  } catch (error) {
    console.error('更新产品失败:', error);
    res.status(500).json({
      success: false,
      message: '更新产品失败: ' + error.message,
    });
  }
});

// DELETE /api/v2/products/:id - 删除产品
router.delete('/:id', authMiddleware, requireAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: '产品不存在',
    });
  }

  // 检查是否有关联文档
  const { count } = db.prepare('SELECT COUNT(*) as count FROM documents WHERE product_id = ?').get(product.id);

  if (count > 0) {
    return res.status(400).json({
      success: false,
      message: `该产品下有 ${count} 个文档，请先删除所有文档`,
    });
  }

  // 软删除
  db.prepare('UPDATE products SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('deleted', product.id);

  // 记录审计日志
  db.prepare(
    'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    req.admin.id, 'delete', 'product', product.id,
    JSON.stringify({ name: product.name, model: product.model }), req.ip
  );

  res.json({ success: true, message: '产品已删除' });
});

module.exports = router;
