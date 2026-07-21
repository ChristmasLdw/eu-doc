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
const { hasCompanyRole, requireCompanyRole } = require('../middleware/companyRole.cjs');

const router = Router();
const PRODUCT_EDITOR_ROLES = ['applicant', 'owner', 'admin'];

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) return authMiddleware(req, res, next);
  return next();
}

function canViewPrivateCompany(user, companyId) {
  if (!user) return false;
  if (user.role === 'platform_admin' || user.role === 'admin') return true;
  return Boolean(db.prepare(`
    SELECT id FROM company_members
    WHERE user_id = ? AND company_id = ? AND status = 'active'
  `).get(user.id, Number(companyId)));
}

function sanitizePublicProduct(product) {
  const sanitized = { ...product };
  delete sanitized.created_by;
  delete sanitized.created_by_name;
  return sanitized;
}

function sanitizePublicDocument(document) {
  const sanitized = { ...document };
  sanitized.file_url = `/eu-doc/api/v2/documents/${document.id}/file`;
  delete sanitized.file_path;
  delete sanitized.uploaded_by;
  delete sanitized.reviewed_by;
  delete sanitized.review_note;
  delete sanitized.reviewed_at;
  delete sanitized.legacy_thumbnail_path;
  delete sanitized.thumbnail_path;
  delete sanitized.review_status;
  return sanitized;
}

function requireProductEditor(req, res, next) {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: '产品不存在' });
  }

  if (!hasCompanyRole(req, product.company_id, PRODUCT_EDITOR_ROLES)) {
    return res.status(403).json({ success: false, message: '无权操作该产品' });
  }

  req.product = product;
  next();
}

const PRODUCT_EXTRA_FIELDS = [
  'dimensions',
  'weight',
  'material',
  'usage_scenario',
  'color',
  'package_contents',
  'warranty',
  'origin_country',
];

function tableExists(tableName) {
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName));
}

function columnExists(tableName, columnName) {
  if (!tableExists(tableName)) return false;
  return db.prepare(`PRAGMA table_info(${tableName})`).all().some((col) => col.name === columnName);
}

function ensureProductExtraColumns() {
  if (!tableExists('products')) return;
  PRODUCT_EXTRA_FIELDS.forEach((field) => {
    if (!columnExists('products', field)) {
      db.prepare(`ALTER TABLE products ADD COLUMN ${field} TEXT`).run();
    }
  });
}

function ensureProductComplianceTable() {
  ensureProductExtraColumns();
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_compliance_categories (
      product_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (product_id, category_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);
}

function normalizeIdList(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  return [...new Set(list.map((item) => Number(item)).filter(Boolean))];
}

function replaceProductComplianceCategories(productId, categoryIds) {
  ensureProductComplianceTable();
  const ids = normalizeIdList(categoryIds);
  db.prepare('DELETE FROM product_compliance_categories WHERE product_id = ?').run(productId);
  if (ids.length === 0) return;

  const insert = db.prepare('INSERT OR IGNORE INTO product_compliance_categories (product_id, category_id) VALUES (?, ?)');
  const tx = db.transaction((items) => {
    items.forEach((categoryId) => insert.run(productId, categoryId));
  });
  tx(ids);
}

function getProductComplianceCategories(productId) {
  ensureProductComplianceTable();
  if (!tableExists('categories')) return [];
  return db.prepare(`
    SELECT c.id, c.name, c.name_en, c.slug
    FROM product_compliance_categories pcc
    INNER JOIN categories c ON c.id = pcc.category_id
    WHERE pcc.product_id = ? AND COALESCE(c.status, 'active') = 'active'
    ORDER BY c.sort_order ASC, c.id ASC
  `).all(productId);
}

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

ensureProductExtraColumns();

// GET /api/v2/products - 获取产品列表
router.get('/', (req, res) => {
  const needsPrivateAuth = req.query.mine === '1' || req.query.status === 'all';
  if (needsPrivateAuth) {
    return authMiddleware(req, res, () => listProducts(req, res));
  }
  return listProducts(req, res);
});

function listProducts(req, res) {
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
    const mineOnly = req.query.mine === '1';
    const privateStatusRequested = status === 'all';
    const documentVisibilitySql = req.admin ? '' : "AND status = 'active' AND review_status = 'approved'";

    if (mineOnly) {
      if (req.admin.role !== 'admin' && req.admin.role !== 'platform_admin') {
        conditions.push(`p.company_id IN (
          SELECT company_id FROM company_members
          WHERE user_id = ? AND status = 'active'
        )`);
        params.push(req.admin.id);
      }
    } else if (privateStatusRequested) {
      if (!req.admin) return res.status(401).json({ success: false, message: '查看全部状态产品需要登录' });
      if (req.admin.role !== 'admin' && req.admin.role !== 'platform_admin') {
        if (!companyId) return res.status(403).json({ success: false, message: '请选择有权限的企业' });
        const membership = db.prepare(`
          SELECT id FROM company_members
          WHERE user_id = ? AND company_id = ? AND status = 'active'
        `).get(req.admin.id, Number(companyId));
        if (!membership) return res.status(403).json({ success: false, message: '无权查看该企业的产品资料' });
      }
    } else {
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
        cat.parent_id as category_parent_id,
        parent_cat.parent_id as category_grand_id,
        parent_cat.name as category_parent_name,
        grand_cat.name as category_grand_name,
        CASE
          WHEN grand_cat.name IS NOT NULL THEN grand_cat.name || ' / ' || parent_cat.name || ' / ' || cat.name
          WHEN parent_cat.name IS NOT NULL THEN parent_cat.name || ' / ' || cat.name
          ELSE cat.name
        END as category_path,
        (SELECT COUNT(*) FROM documents WHERE product_id = p.id ${documentVisibilitySql}) as document_count,
        (SELECT COUNT(*) FROM documents WHERE product_id = p.id AND document_type = 'certificate' ${documentVisibilitySql}) as certificate_count
      FROM products p
      LEFT JOIN companies c ON p.company_id = c.id
      LEFT JOIN categories cat ON p.category_primary_id = cat.id
      LEFT JOIN categories parent_cat ON cat.parent_id = parent_cat.id
      LEFT JOIN categories grand_cat ON parent_cat.parent_id = grand_cat.id
      ${whereClause}
      ORDER BY p.${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;

    const products = db.prepare(dataSql).all(...params, Number(pageSize), offset);
    products.forEach((product) => {
      product.compliance_categories = getProductComplianceCategories(product.id);
    });

    res.json({
      success: true,
      data: req.admin ? products : products.map(sanitizePublicProduct),
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
}

// GET /api/v2/products/:id/related - 获取同公司相关产品
router.get('/:id/related', (req, res) => {
  try {
    const product = db.prepare(`
      SELECT p.id, p.company_id, p.category_primary_id
      FROM products p
      JOIN companies c ON c.id = p.company_id
      WHERE p.id = ? AND p.status = 'active'
        AND c.verification_status = 'verified'
        AND COALESCE(c.public_visible, 1) = 1
    `).get(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: '产品不存在' });
    }

    const related = db.prepare(`
      SELECT
        p.id,
        p.name,
        p.name_en,
        p.model,
        p.image_path,
        cat.name as category_name,
        cat.parent_id as category_parent_id,
        parent_cat.parent_id as category_grand_id,
        parent_cat.name as category_parent_name,
        grand_cat.name as category_grand_name,
        CASE
          WHEN grand_cat.name IS NOT NULL THEN grand_cat.name || ' / ' || parent_cat.name || ' / ' || cat.name
          WHEN parent_cat.name IS NOT NULL THEN parent_cat.name || ' / ' || cat.name
          ELSE cat.name
        END as category_path,
        (SELECT COUNT(*) FROM documents d WHERE d.product_id = p.id AND d.status = 'active' AND d.review_status = 'approved') as document_count
      FROM products p
      LEFT JOIN categories cat ON p.category_primary_id = cat.id
      LEFT JOIN categories parent_cat ON cat.parent_id = parent_cat.id
      LEFT JOIN categories grand_cat ON parent_cat.parent_id = grand_cat.id
      WHERE p.company_id = ?
        AND p.id != ?
        AND p.status = 'active'
      ORDER BY
        CASE WHEN p.category_primary_id = ? THEN 0 ELSE 1 END,
        p.updated_at DESC,
        p.created_at DESC
      LIMIT 6
    `).all(product.company_id, product.id, product.category_primary_id || -1);

    res.json({ success: true, data: related });
  } catch (error) {
    console.error('[错误] GET /api/v2/products/:id/related:', error);
    res.status(500).json({
      success: false,
      message: '查询相关产品失败: ' + error.message,
    });
  }
});

// GET /api/v2/products/:id - 获取产品详情
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const product = db.prepare(`
      SELECT
        p.*,
        c.name as company_name,
        c.name_en as company_name_en,
        cat.name as category_name,
        cat.parent_id as category_parent_id,
        parent_cat.parent_id as category_grand_id,
        parent_cat.name as category_parent_name,
        grand_cat.name as category_grand_name,
        CASE
          WHEN grand_cat.name IS NOT NULL THEN grand_cat.name || ' / ' || parent_cat.name || ' / ' || cat.name
          WHEN parent_cat.name IS NOT NULL THEN parent_cat.name || ' / ' || cat.name
          ELSE cat.name
        END as category_path,
        u.display_name as created_by_name
      FROM products p
      LEFT JOIN companies c ON p.company_id = c.id
      LEFT JOIN categories cat ON p.category_primary_id = cat.id
      LEFT JOIN categories parent_cat ON cat.parent_id = parent_cat.id
      LEFT JOIN categories grand_cat ON parent_cat.parent_id = grand_cat.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '产品不存在',
      });
    }

    const privateAccess = canViewPrivateCompany(req.admin, product.company_id);
    if (!privateAccess) {
      const publicCompany = db.prepare(`
        SELECT verification_status, public_visible FROM companies WHERE id = ?
      `).get(product.company_id);
      if (product.status !== 'active' || publicCompany?.verification_status !== 'verified' || Number(publicCompany?.public_visible ?? 1) !== 1) {
        return res.status(404).json({ success: false, message: '产品不存在' });
      }
    }

    // 获取产品的标签
    const tags = db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN product_tags pt ON t.id = pt.tag_id
      WHERE pt.product_id = ?
    `).all(product.id);

    product.tags = tags;
    product.compliance_categories = getProductComplianceCategories(product.id);
    product.complianceCategoryIds = product.compliance_categories.map((cat) => cat.id);

    res.json({ success: true, data: privateAccess ? product : sanitizePublicProduct(product) });
  } catch (error) {
    console.error('[错误] GET /api/v2/products/:id:', error);
    res.status(500).json({
      success: false,
      message: '查询产品详情失败: ' + error.message,
    });
  }
});

// GET /api/v2/products/:id/documents - 获取产品的所有文档
router.get('/:id/documents', optionalAuth, (req, res) => {
  try {
    const product = db.prepare(`
      SELECT p.company_id, p.status, c.verification_status, c.public_visible
      FROM products p
      JOIN companies c ON c.id = p.company_id
      WHERE p.id = ?
    `).get(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: '产品不存在' });

    const privateAccess = canViewPrivateCompany(req.admin, product.company_id);
    if (!privateAccess && (product.status !== 'active' || product.verification_status !== 'verified' || Number(product.public_visible ?? 1) !== 1)) {
      return res.status(404).json({ success: false, message: '产品不存在' });
    }

    const documents = db.prepare(`
      SELECT
        d.*,
        cl.thumbnail_path as legacy_thumbnail_path,
        CASE
          WHEN d.document_type = 'certificate' THEN cm.cert_no
          ELSE NULL
        END as cert_no
      FROM documents d
      LEFT JOIN certificate_metadata cm ON d.id = cm.document_id AND d.document_type = 'certificate'
      LEFT JOIN certificates_legacy cl ON d.id = cl.id
      WHERE d.product_id = ?
        ${privateAccess ? '' : "AND d.status = 'active' AND d.review_status = 'approved'"}
      ORDER BY d.created_at DESC
    `).all(req.params.id);

    documents.forEach((doc) => {
      if (!doc.thumbnail_path && doc.legacy_thumbnail_path) doc.thumbnail_path = doc.legacy_thumbnail_path;
      delete doc.legacy_thumbnail_path;
    });

    res.json({
      success: true,
      data: privateAccess ? documents : documents.map(sanitizePublicDocument),
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
  const companyId = req.body.companyId;
  const nameEn = req.body.nameEn;
  const descriptionEn = req.body.descriptionEn;
  const categoryPrimaryId = req.body.categoryPrimaryId;
  const complianceCategoryIds = req.body.complianceCategoryIds || req.body.compliance_category_ids;
  const usageScenario = req.body.usageScenario;
  const packageContents = req.body.packageContents;
  const originCountry = req.body.originCountry;
  const {
    name, model, description, status = 'active',
    dimensions, weight, material, color, warranty
  } = req.body;

  // 必填字段校验
  if (!companyId || !name) {
    return res.status(400).json({
      success: false,
      message: '企业ID和产品名称为必填项',
    });
  }

  // 权限检查：用户必须是该企业的 owner/admin
  if (req.admin.role !== 'platform_admin' && req.admin.role !== 'admin') {
    const membership = db.prepare(`
      SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND status = 'active'
    `).get(req.admin.id, companyId);

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
        category_primary_id, dimensions, weight, material, usage_scenario,
        color, package_contents, warranty, origin_country,
        status, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      companyId,
      name,
      nameEn || null,
      model || null,
      description || null,
      descriptionEn || null,
      categoryPrimaryId || null,
      dimensions || null,
      weight || null,
      material || null,
      usageScenario || null,
      color || null,
      packageContents || null,
      warranty || null,
      originCountry || null,
      status,
      req.admin.id
    );
    replaceProductComplianceCategories(result.lastInsertRowid, complianceCategoryIds);

    // 记录审计日志
    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'create', 'product', result.lastInsertRowid,
      JSON.stringify({ name, model, complianceCategoryIds: normalizeIdList(complianceCategoryIds) }), req.ip
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
    const complianceProvided = req.body.complianceCategoryIds !== undefined || req.body.compliance_category_ids !== undefined;
    const oldComplianceIds = complianceProvided ? getProductComplianceCategories(product.id).map((cat) => cat.id) : [];
    const body = {
      ...req.body,
      name_en: req.body.nameEn,
      description_en: req.body.descriptionEn,
      category_primary_id: req.body.categoryPrimaryId,
      usage_scenario: req.body.usageScenario,
      package_contents: req.body.packageContents,
      origin_country: req.body.originCountry,
    };
    const fields = [
      'name', 'name_en', 'model', 'description', 'description_en',
      'category_primary_id', 'dimensions', 'weight', 'material',
      'usage_scenario', 'color', 'package_contents', 'warranty',
      'origin_country', 'status',
    ];
    const setParts = [];
    const values = [];
    const changes = {};

    for (const field of fields) {
      if (body[field] !== undefined) {
        setParts.push(`${field} = ?`);
        values.push(body[field]);
        changes[field] = { old: product[field], new: body[field] };
      }
    }

    if (setParts.length === 0 && !complianceProvided) {
      return res.status(400).json({
        success: false,
        message: '没有提供需要更新的字段',
      });
    }

    if (setParts.length > 0) {
      setParts.push('updated_at = CURRENT_TIMESTAMP');
      db.prepare(`UPDATE products SET ${setParts.join(', ')} WHERE id = ?`)
        .run(...values, product.id);
    }

    if (complianceProvided) {
      replaceProductComplianceCategories(product.id, req.body.complianceCategoryIds || req.body.compliance_category_ids);
      changes.complianceCategoryIds = { old: oldComplianceIds, new: normalizeIdList(req.body.complianceCategoryIds || req.body.compliance_category_ids) };
    }

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
router.post('/:id/image', authMiddleware, requireProductEditor, imageUpload.single('image'), (req, res) => {
  const product = req.product;
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

  // 权限校验：平台管理员可删除；企业成员只能删除自己可管理企业的产品。
  if (!['admin', 'platform_admin'].includes(req.admin.role)) {
    const membership = db.prepare(`
      SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND status = 'active'
    `).get(req.admin.id, product.company_id);

    if (!membership || !['owner', 'admin', 'applicant'].includes(membership.role)) {
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
