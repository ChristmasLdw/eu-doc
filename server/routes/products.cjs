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
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');
const { requireCompanyRole } = require('../middleware/companyRole.cjs');

const router = Router();

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/products');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `product-${req.params.id}-${Date.now()}${ext}`);
  },
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('只支持 JPG、PNG、WebP 产品图'));
  },
});

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
    const authHeader = req.headers.authorization;
    const hasToken = authHeader && authHeader.startsWith('Bearer ');

    if (!hasToken) {
      conditions.push("COALESCE(c.verification_status, 'pending') = 'verified'");
      conditions.push('COALESCE(c.public_visible, 1) = 1');
    }

    if (status && status !== 'all') {
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
      LEFT JOIN companies c ON p.company_id = c.id
      LEFT JOIN categories cat ON p.category_primary_id = cat.id
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
    company_id, name, name_en, model, description, description_en,
    category_primary_id, status = 'active'
  } = req.body;

  // 必填字段校验
  if (!company_id || !name) {
    return res.status(400).json({
      success: false,
      message: '企业ID和产品名称为必填项',
    });
  }

  // 权限检查：用户必须是该企业的 owner/admin
  if (req.admin.role !== 'platform_admin' && req.admin.role !== 'admin') {
    const membership = db.prepare(`
      SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND status = 'active'
    `).get(req.admin.id, company_id);

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: '您不是该企业的成员，无法创建产品',
      });
    }

    if (!['owner', 'admin', 'applicant'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有企业所有者和管理员可以创建产品',
      });
    }
  }

  try {
    const result = db.prepare(`
      INSERT INTO products (
        company_id, name, name_en, model, description, description_en,
        category_primary_id, status, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      company_id,
      name,
      name_en || null,
      model || null,
      description || null,
      description_en || null,
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

  // 权限检查：用户必须是该企业的 owner/admin
  if (req.admin.role !== 'platform_admin' && req.admin.role !== 'admin') {
    const membership = db.prepare(`
      SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND status = 'active'
    `).get(req.admin.id, product.company_id);

    if (!membership || !['owner', 'admin', 'applicant'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: '无权编辑该产品',
      });
    }
  }

  try {
    const fields = ['name', 'name_en', 'model', 'description', 'description_en', 'category_primary_id', 'status'];
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

// POST /api/v2/products/:id/image - 上传产品图
router.post('/:id/image', authMiddleware, imageUpload.single('image'), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(404).json({ success: false, message: '产品不存在' });
  }
  if (!req.file) return res.status(400).json({ success: false, message: '请选择产品图片' });

  const imagePath = `/uploads/products/${req.file.filename}`;
  db.prepare('UPDATE products SET image_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(imagePath, product.id);
  db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.admin.id, 'upload_product_image', 'product', product.id, JSON.stringify({ image_path: imagePath }), req.ip);
  res.json({ success: true, message: '产品图已上传', data: { image_path: imagePath } });
});

// DELETE /api/v2/products/:id - 删除产品
router.delete('/:id', authMiddleware, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: '产品不存在',
    });
  }

  // 权限校验：非管理员只能删除自己企业的产品
  if (req.admin.role !== 'admin') {
    // 获取用户所属企业
    const userCompany = db.prepare('SELECT company_name FROM admins WHERE id = ?').get(req.admin.id);
    const productCompany = db.prepare('SELECT name FROM companies WHERE id = ?').get(product.company_id);

    if (!userCompany || !productCompany || userCompany.company_name !== productCompany.name) {
      return res.status(403).json({
        success: false,
        message: '无权删除该产品',
      });
    }
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
