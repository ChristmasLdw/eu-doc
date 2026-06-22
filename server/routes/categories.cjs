/**
 * EU-DOC v2.0 - 分类管理 API
 *
 * 路由:
 * - GET    /api/v2/categories           - 获取分类列表（支持树形结构）
 * - GET    /api/v2/categories/:id       - 获取分类详情
 * - POST   /api/v2/categories           - 创建分类（需管理员）
 * - PUT    /api/v2/categories/:id       - 更新分类（需管理员）
 * - DELETE /api/v2/categories/:id       - 删除分类（需管理员）
 */

const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');

const router = Router();

/**
 * 构建分类树形结构
 * @param {Array} categories - 扁平分类数组
 * @param {Number|null} parentId - 父分类ID
 * @returns {Array} 树形结构数组
 */
function buildCategoryTree(categories, parentId = null) {
  const children = categories.filter(cat => cat.parent_id === parentId);

  return children.map(cat => ({
    ...cat,
    children: buildCategoryTree(categories, cat.id)
  }));
}

// GET /api/v2/categories - 获取分类列表
router.get('/', (req, res) => {
  try {
    const { tree = 'false', includeCount = 'true' } = req.query;

    // 查询所有分类
    let sql = `
      SELECT
        c.id,
        c.name,
        c.name_en,
        c.parent_id,
        c.level,
        c.sort_order,
        c.description,
        c.status,
        c.created_at,
        c.updated_at
    `;

    // 是否包含产品数量统计
    if (includeCount === 'true') {
      sql += `,
        (SELECT COUNT(*) FROM products WHERE category_primary_id = c.id AND status = 'active') as product_count
      `;
    }

    sql += `
      FROM categories c
      WHERE c.status = 'active'
      ORDER BY c.level ASC, c.sort_order ASC, c.id ASC
    `;

    const categories = db.prepare(sql).all();

    // 是否返回树形结构
    if (tree === 'true') {
      const categoryTree = buildCategoryTree(categories);
      return res.json({
        success: true,
        data: categoryTree,
        total: categories.length,
      });
    }

    // 返回扁平列表
    res.json({
      success: true,
      data: categories,
      total: categories.length,
    });
  } catch (error) {
    console.error('[错误] GET /api/v2/categories:', error);
    res.status(500).json({
      success: false,
      message: '查询分类列表失败: ' + error.message,
    });
  }
});

// GET /api/v2/categories/:id - 获取分类详情
router.get('/:id', (req, res) => {
  try {
    const category = db.prepare(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM products WHERE category_primary_id = c.id AND status = 'active') as product_count,
        (SELECT COUNT(*) FROM categories WHERE parent_id = c.id AND status = 'active') as child_count,
        parent.name as parent_name
      FROM categories c
      LEFT JOIN categories parent ON c.parent_id = parent.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在',
      });
    }

    // 获取子分类
    const children = db.prepare(`
      SELECT
        id,
        name,
        name_en,
        level,
        sort_order,
        (SELECT COUNT(*) FROM products WHERE category_primary_id = id AND status = 'active') as product_count
      FROM categories
      WHERE parent_id = ? AND status = 'active'
      ORDER BY sort_order ASC, id ASC
    `).all(category.id);

    category.children = children;

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('[错误] GET /api/v2/categories/:id:', error);
    res.status(500).json({
      success: false,
      message: '查询分类详情失败: ' + error.message,
    });
  }
});

// POST /api/v2/categories - 创建分类
router.post('/', authMiddleware, requireAdmin, (req, res) => {
  const {
    name, name_en, parent_id, level = 1, sort_order = 0,
    description, status = 'active'
  } = req.body;

  // 必填字段校验
  if (!name) {
    return res.status(400).json({
      success: false,
      message: '分类名称为必填项',
    });
  }

  // 如果有父分类，验证父分类是否存在
  if (parent_id) {
    const parentCategory = db.prepare('SELECT id, level FROM categories WHERE id = ?').get(parent_id);
    if (!parentCategory) {
      return res.status(400).json({
        success: false,
        message: '父分类不存在',
      });
    }
  }

  try {
    const result = db.prepare(`
      INSERT INTO categories (
        name, name_en, parent_id, level, sort_order, description, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      name,
      name_en || null,
      parent_id || null,
      level,
      sort_order,
      description || null,
      status
    );

    // 记录审计日志
    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'create', 'category', result.lastInsertRowid,
      JSON.stringify({ name, parent_id }), req.ip
    );

    res.status(201).json({
      success: true,
      message: '分类创建成功',
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('创建分类失败:', error);
    res.status(500).json({
      success: false,
      message: '创建分类失败: ' + error.message,
    });
  }
});

// PUT /api/v2/categories/:id - 更新分类
router.put('/:id', authMiddleware, requireAdmin, (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: '分类不存在',
    });
  }

  // 如果修改父分类，不能设置为自己或自己的子分类
  if (req.body.parent_id) {
    if (req.body.parent_id === category.id) {
      return res.status(400).json({
        success: false,
        message: '不能将分类设置为自己的子分类',
      });
    }

    // 检查是否会形成循环引用
    let checkId = req.body.parent_id;
    let depth = 0;
    while (checkId && depth < 10) {
      const parent = db.prepare('SELECT parent_id FROM categories WHERE id = ?').get(checkId);
      if (!parent) break;
      if (parent.parent_id === category.id) {
        return res.status(400).json({
          success: false,
          message: '不能形成循环引用',
        });
      }
      checkId = parent.parent_id;
      depth++;
    }
  }

  try {
    const fields = ['name', 'name_en', 'parent_id', 'level', 'sort_order', 'description', 'status'];
    const setParts = [];
    const values = [];
    const changes = {};

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        setParts.push(`${field} = ?`);
        values.push(req.body[field]);
        changes[field] = { old: category[field], new: req.body[field] };
      }
    }

    if (setParts.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供需要更新的字段',
      });
    }

    setParts.push('updated_at = CURRENT_TIMESTAMP');

    db.prepare(`UPDATE categories SET ${setParts.join(', ')} WHERE id = ?`)
      .run(...values, category.id);

    // 记录审计日志
    db.prepare(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.admin.id, 'update', 'category', category.id,
      JSON.stringify(changes), req.ip
    );

    res.json({ success: true, message: '分类更新成功' });
  } catch (error) {
    console.error('更新分类失败:', error);
    res.status(500).json({
      success: false,
      message: '更新分类失败: ' + error.message,
    });
  }
});

// DELETE /api/v2/categories/:id - 删除分类
router.delete('/:id', authMiddleware, requireAdmin, (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: '分类不存在',
    });
  }

  // 检查是否有子分类
  const { count: childCount } = db.prepare(
    'SELECT COUNT(*) as count FROM categories WHERE parent_id = ? AND status = "active"'
  ).get(category.id);

  if (childCount > 0) {
    return res.status(400).json({
      success: false,
      message: `该分类下有 ${childCount} 个子分类，请先删除子分类`,
    });
  }

  // 检查是否有关联产品
  const { count: productCount } = db.prepare(
    'SELECT COUNT(*) as count FROM products WHERE category_primary_id = ? AND status = "active"'
  ).get(category.id);

  if (productCount > 0) {
    return res.status(400).json({
      success: false,
      message: `该分类下有 ${productCount} 个产品，请先移动或删除这些产品`,
    });
  }

  // 软删除
  db.prepare('UPDATE categories SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('deleted', category.id);

  // 记录审计日志
  db.prepare(
    'INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    req.admin.id, 'delete', 'category', category.id,
    JSON.stringify({ name: category.name }), req.ip
  );

  res.json({ success: true, message: '分类已删除' });
});

module.exports = router;
