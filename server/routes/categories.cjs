/**
 * EU-DOC v2.0 - 分类管理 API
 *
 * 分类分三层：
 * - taxonomy_type = consumer: C端产品用途分类
 * - taxonomy_type = compliance: 审核/合规分类
 * - documents.document_type: 文件类型，不写入分类树
 */

const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');

const router = Router();
const TAXONOMY_TYPES = ['consumer', 'compliance'];

const CONSUMER_CATEGORY_TREE = [
  {
    name: '运动户外',
    nameEn: 'Sports & Outdoor',
    slug: 'sports-equipment',
    children: [
      { name: '马术用品', nameEn: 'Equestrian Equipment', slug: 'equestrian-equipment', children: [
        { name: '马术头盔', nameEn: 'Equestrian Helmets', slug: 'equestrian-helmets' },
        { name: '骑行护具', nameEn: 'Riding Protective Gear', slug: 'riding-protective-gear' },
      ] },
      { name: '自行车用品', nameEn: 'Cycling Equipment', slug: 'cycling-equipment', children: [
        { name: '自行车头盔', nameEn: 'Bicycle Helmets', slug: 'bicycle-helmets' },
        { name: '骑行配件', nameEn: 'Cycling Accessories', slug: 'cycling-accessories' },
      ] },
      { name: '滑雪/滑板/轮滑', nameEn: 'Skiing / Skate / Roller Sports', slug: 'skate-snow-sports' },
      { name: '露营与户外装备', nameEn: 'Camping & Outdoor Gear', slug: 'camping-outdoor-gear' },
      { name: '健身训练用品', nameEn: 'Fitness Equipment', slug: 'fitness-equipment' },
    ],
  },
  {
    name: '个人防护与安全',
    nameEn: 'Personal Safety & Protection',
    slug: 'safety-equipment',
    children: [
      { name: '头部防护', nameEn: 'Head Protection', slug: 'head-protection', children: [
        { name: '安全帽', nameEn: 'Safety Helmets', slug: 'safety-helmets' },
        { name: '防撞头盔', nameEn: 'Impact Protection Helmets', slug: 'impact-protection-helmets' },
      ] },
      { name: '身体防护', nameEn: 'Body Protection', slug: 'body-protection', children: [
        { name: '防护服', nameEn: 'Protective Clothing', slug: 'protective-clothing' },
        { name: '护具', nameEn: 'Protective Guards', slug: 'protective-guards' },
      ] },
      { name: '眼面防护', nameEn: 'Eye & Face Protection', slug: 'eye-face-protection' },
      { name: '手部/足部防护', nameEn: 'Hand & Foot Protection', slug: 'hand-foot-protection' },
    ],
  },
  {
    name: '电子电器',
    nameEn: 'Electronics & Electrical',
    slug: 'electronics',
    children: [
      { name: '智能家居', nameEn: 'Smart Home', slug: 'smart-home', children: [
        { name: '智能插座/开关', nameEn: 'Smart Plugs & Switches', slug: 'smart-plugs-switches' },
        { name: '智能灯具', nameEn: 'Smart Lighting', slug: 'smart-lighting' },
      ] },
      { name: '电源与充电', nameEn: 'Power & Charging', slug: 'power-charging', children: [
        { name: '充电器', nameEn: 'Chargers', slug: 'chargers' },
        { name: '电源适配器', nameEn: 'Power Adapters', slug: 'power-adapters' },
        { name: '移动电源', nameEn: 'Power Banks', slug: 'power-banks' },
      ] },
      { name: '低压配电', nameEn: 'Low Voltage Power Distribution', slug: 'low-voltage-distribution', children: [
        { name: '小型断路器 MCB', nameEn: 'Miniature Circuit Breakers', slug: 'mcb' },
        { name: '漏电保护 RCCB / RCBO', nameEn: 'RCCB / RCBO', slug: 'rccb-rcbo' },
        { name: '塑壳断路器 MCCB', nameEn: 'Moulded Case Circuit Breakers', slug: 'mccb' },
        { name: '隔离开关 / 负荷开关', nameEn: 'Disconnectors / Load Switches', slug: 'disconnectors-load-switches' },
        { name: '熔断器', nameEn: 'Fuses', slug: 'fuses' },
        { name: '浪涌保护器 SPD', nameEn: 'Surge Protective Devices', slug: 'spd' },
      ] },
      { name: '工业控制', nameEn: 'Industrial Control', slug: 'industrial-control-electrical', children: [
        { name: '接触器', nameEn: 'Contactors', slug: 'contactors' },
        { name: '热继电器 / 保护器', nameEn: 'Thermal Relays / Protectors', slug: 'thermal-relays-protectors' },
        { name: '按钮 / 指示灯', nameEn: 'Push Buttons / Indicators', slug: 'push-buttons-indicators' },
        { name: '中间继电器 / 时间继电器', nameEn: 'Relays / Timer Relays', slug: 'relays-timer-relays' },
        { name: '变频器 / 软启动器', nameEn: 'Inverters / Soft Starters', slug: 'inverters-soft-starters' },
      ] },
      { name: '配电箱与成套设备', nameEn: 'Distribution Boxes & Assemblies', slug: 'distribution-boxes-assemblies', children: [
        { name: '配电箱 / 终端箱', nameEn: 'Distribution Boxes / Terminal Boxes', slug: 'distribution-terminal-boxes' },
        { name: '配电柜 / 控制柜', nameEn: 'Distribution Cabinets / Control Cabinets', slug: 'distribution-control-cabinets' },
        { name: '计量箱', nameEn: 'Meter Boxes', slug: 'meter-boxes' },
      ] },
      { name: '仪器仪表', nameEn: 'Instruments & Meters', slug: 'instruments-meters', children: [
        { name: '电能表', nameEn: 'Electricity Meters', slug: 'electricity-meters' },
        { name: '多功能仪表', nameEn: 'Multifunction Meters', slug: 'multifunction-meters' },
        { name: '电流表 / 电压表', nameEn: 'Ammeters / Voltmeters', slug: 'ammeters-voltmeters' },
      ] },
      { name: '新能源电气', nameEn: 'New Energy Electrical', slug: 'new-energy-electrical', children: [
        { name: '光伏直流电器', nameEn: 'PV DC Electrical Components', slug: 'pv-dc-components' },
        { name: 'EV 充电设备', nameEn: 'EV Charging Equipment', slug: 'ev-charging-equipment' },
        { name: '储能配套电器', nameEn: 'Energy Storage Electrical Components', slug: 'energy-storage-electrical' },
      ] },
      { name: '小家电', nameEn: 'Small Appliances', slug: 'small-appliances' },
      { name: '音视频设备', nameEn: 'Audio & Video Devices', slug: 'audio-video-devices' },
      { name: '信息技术设备', nameEn: 'Information Technology Equipment', slug: 'it-equipment' },
    ],
  },
  {
    name: '家居生活',
    nameEn: 'Home & Living',
    slug: 'home-living',
    children: [
      { name: '家具与收纳', nameEn: 'Furniture & Storage', slug: 'furniture-storage' },
      { name: '照明灯具', nameEn: 'Lighting', slug: 'lighting' },
      { name: '清洁护理用品', nameEn: 'Cleaning & Care', slug: 'cleaning-care' },
      { name: '宠物用品', nameEn: 'Pet Supplies', slug: 'pet-supplies' },
    ],
  },
  {
    name: '母婴儿童与玩具',
    nameEn: 'Baby, Kids & Toys',
    slug: 'baby-kids-toys',
    children: [
      { name: '儿童玩具', nameEn: 'Toys', slug: 'toys', children: [
        { name: '电动玩具', nameEn: 'Electric Toys', slug: 'electric-toys' },
        { name: '益智/模型玩具', nameEn: 'Educational & Model Toys', slug: 'educational-model-toys' },
      ] },
      { name: '婴幼儿用品', nameEn: 'Baby Products', slug: 'baby-products' },
      { name: '儿童家具', nameEn: 'Children Furniture', slug: 'children-furniture' },
      { name: '儿童出行', nameEn: 'Children Travel Gear', slug: 'children-travel-gear' },
    ],
  },
  {
    name: '交通出行',
    nameEn: 'Mobility & Transport',
    slug: 'mobility-transport',
    children: [
      { name: '自行车/电动车', nameEn: 'Bicycles & E-bikes', slug: 'bicycles-ebikes' },
      { name: '汽车配件', nameEn: 'Automotive Accessories', slug: 'automotive-accessories' },
      { name: '摩托车配件', nameEn: 'Motorcycle Accessories', slug: 'motorcycle-accessories' },
      { name: '出行安全用品', nameEn: 'Travel Safety Gear', slug: 'travel-safety-gear' },
    ],
  },
  {
    name: '工业工具与机械',
    nameEn: 'Industrial Tools & Machinery',
    slug: 'industrial-tools-machinery',
    children: [
      { name: '手动/电动工具', nameEn: 'Hand & Power Tools', slug: 'hand-power-tools' },
      { name: '机械设备', nameEn: 'Machinery', slug: 'machinery-equipment' },
      { name: '工业自动化', nameEn: 'Industrial Automation', slug: 'industrial-automation' },
      { name: '压力/升降设备', nameEn: 'Pressure & Lifting Equipment', slug: 'pressure-lifting-equipment' },
    ],
  },
  {
    name: '医疗健康',
    nameEn: 'Medical & Health',
    slug: 'medical-health',
    children: [
      { name: '医疗器械', nameEn: 'Medical Devices', slug: 'medical-devices' },
      { name: '个人健康监测', nameEn: 'Personal Health Monitoring', slug: 'personal-health-monitoring' },
      { name: '康复辅助设备', nameEn: 'Rehabilitation Aids', slug: 'rehabilitation-aids' },
      { name: '护理用品', nameEn: 'Care Products', slug: 'care-products' },
    ],
  },
  {
    name: '厨房与食品接触',
    nameEn: 'Kitchen & Food Contact',
    slug: 'kitchen-food-contact',
    children: [
      { name: '餐具/厨具', nameEn: 'Tableware & Cookware', slug: 'tableware-cookware' },
      { name: '食品包装', nameEn: 'Food Packaging', slug: 'food-packaging' },
      { name: '饮水容器', nameEn: 'Drinkware', slug: 'drinkware' },
    ],
  },
  {
    name: '建筑材料与五金',
    nameEn: 'Building Materials & Hardware',
    slug: 'building-materials-hardware',
    children: [
      { name: '建筑五金', nameEn: 'Building Hardware', slug: 'building-hardware' },
      { name: '装饰材料', nameEn: 'Decorative Materials', slug: 'decorative-materials' },
      { name: '门窗产品', nameEn: 'Doors & Windows', slug: 'doors-windows' },
      { name: '消防材料', nameEn: 'Fire Safety Materials', slug: 'fire-safety-materials' },
    ],
  },
  {
    name: '其他 / 待分类',
    nameEn: 'Other / Uncategorized',
    slug: 'other-uncategorized',
  },
];

function tableExists(tableName) {
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName));
}

function columnExists(tableName, columnName) {
  if (!tableExists(tableName)) return false;
  return db.prepare(`PRAGMA table_info(${tableName})`).all().some((col) => col.name === columnName);
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || `category-${Date.now()}`;
}

function upsertCategory({ name, nameEn, slug, description, parentId = null, level = 1, sortOrder = 0, taxonomyType = 'consumer' }) {
  const existing = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (existing) {
    db.prepare(`
      UPDATE categories
      SET name = ?, name_en = ?, parent_id = ?, level = ?, sort_order = ?, description = ?, status = 'active', taxonomy_type = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, nameEn || null, parentId, level, sortOrder, description || null, taxonomyType, existing.id);
    return existing.id;
  }

  const result = db.prepare(`
    INSERT INTO categories (parent_id, level, name, name_en, slug, description, sort_order, status, taxonomy_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `).run(parentId, level, name, nameEn || null, slug, description || null, sortOrder, taxonomyType);
  return result.lastInsertRowid;
}

function seedCategoryTree(items, parentId = null, level = 1, prefix = '') {
  items.forEach((item, index) => {
    const sortOrder = Number(`${prefix}${String(index + 1).padStart(2, '0')}`);
    const id = upsertCategory({
      name: item.name,
      nameEn: item.nameEn,
      slug: item.slug,
      description: item.description,
      parentId,
      level,
      sortOrder,
      taxonomyType: 'consumer',
    });
    if (item.children?.length) seedCategoryTree(item.children, id, level + 1, `${sortOrder}`);
  });
}

function ensureCategorySchema() {
  if (!tableExists('categories')) return;

  if (!columnExists('categories', 'taxonomy_type')) {
    db.prepare("ALTER TABLE categories ADD COLUMN taxonomy_type TEXT DEFAULT 'consumer'").run();
    db.prepare("UPDATE categories SET taxonomy_type = 'consumer' WHERE taxonomy_type IS NULL OR taxonomy_type = ''").run();
  }

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

  seedCategoryTree(CONSUMER_CATEGORY_TREE);

  const complianceSeeds = [
    { name: 'PPE / 个人防护法规', nameEn: 'PPE / Personal Protective Equipment', slug: 'compliance-ppe', description: '头部防护、身体防护等个人防护用品合规路径' },
    { name: '电磁兼容', nameEn: 'Electromagnetic Compatibility', slug: 'compliance-emc', description: '电磁兼容相关合规路径，常见于电气电子产品' },
    { name: '低压电气安全', nameEn: 'Low Voltage Electrical Safety', slug: 'compliance-lvd', description: '低压电气安全相关合规路径，常见于低压电器、电源、配电产品' },
    { name: '无线通信设备', nameEn: 'Radio Equipment', slug: 'compliance-red', description: '带无线通信功能产品的合规路径' },
    { name: '有害物质限制', nameEn: 'Restricted Substances', slug: 'compliance-rohs-reach', description: '有害物质限制与化学品合规路径' },
    { name: 'Toy Safety 玩具安全', nameEn: 'Toy Safety', slug: 'compliance-toy-safety', description: '儿童玩具安全认证和标准' },
    { name: 'Machinery 机械设备', nameEn: 'Machinery', slug: 'compliance-machinery', description: '机械设备相关指令和标准' },
    { name: 'Medical Device 医疗器械', nameEn: 'Medical Device', slug: 'compliance-medical-device', description: '医疗器械相关法规和认证路径' },
  ];

  const insertSeed = db.prepare(`
    INSERT OR IGNORE INTO categories (parent_id, level, name, name_en, slug, description, sort_order, status, taxonomy_type)
    VALUES (NULL, 1, ?, ?, ?, ?, ?, 'active', 'compliance')
  `);
  complianceSeeds.forEach((cat, index) => {
    insertSeed.run(cat.name, cat.nameEn, cat.slug, cat.description, index + 1);
  });
}

function normalizeTaxonomyType(value) {
  return TAXONOMY_TYPES.includes(value) ? value : 'consumer';
}

function buildCategoryTree(categories, parentId = null) {
  const normalizedParentId = parentId === undefined ? null : parentId;
  return categories
    .filter((cat) => cat.parent_id === normalizedParentId)
    .map((cat) => ({
      ...cat,
      children: buildCategoryTree(categories, cat.id),
    }));
}

function getProductCountExpr(alias = 'c') {
  if (!tableExists('products')) return '0';
  return `CASE
    WHEN ${alias}.taxonomy_type = 'compliance' THEN (
      SELECT COUNT(*) FROM product_compliance_categories pcc
      INNER JOIN products p ON p.id = pcc.product_id
      WHERE pcc.category_id = ${alias}.id AND COALESCE(p.status, 'active') != 'deleted'
    )
    ELSE (
      SELECT COUNT(*) FROM products p
      WHERE (p.category_primary_id = ${alias}.id OR p.category_secondary_id = ${alias}.id)
        AND COALESCE(p.status, 'active') != 'deleted'
    )
  END`;
}

ensureCategorySchema();

// GET /api/v2/categories - 获取分类列表
router.get('/', (req, res) => {
  try {
    ensureCategorySchema();
    const { tree = 'false', includeCount = 'true' } = req.query;
    const taxonomyType = normalizeTaxonomyType(req.query.taxonomyType || req.query.taxonomy_type || 'consumer');

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
        c.taxonomy_type,
        c.created_at,
        c.updated_at
    `;

    if (includeCount === 'true') {
      sql += `, ${getProductCountExpr('c')} as product_count`;
    }

    sql += `
      FROM categories c
      WHERE c.status = 'active' AND COALESCE(c.taxonomy_type, 'consumer') = ?
      ORDER BY c.level ASC, c.sort_order ASC, c.id ASC
    `;

    const categories = db.prepare(sql).all(taxonomyType);

    if (tree === 'true') {
      return res.json({ success: true, data: buildCategoryTree(categories), total: categories.length, taxonomyType });
    }

    res.json({ success: true, data: categories, total: categories.length, taxonomyType });
  } catch (error) {
    console.error('[错误] GET /api/v2/categories:', error);
    res.status(500).json({ success: false, message: '查询分类列表失败: ' + error.message });
  }
});

// GET /api/v2/categories/:id - 获取分类详情
router.get('/:id', (req, res) => {
  try {
    ensureCategorySchema();
    const category = db.prepare(`
      SELECT
        c.*,
        ${getProductCountExpr('c')} as product_count,
        (SELECT COUNT(*) FROM categories WHERE parent_id = c.id AND status = 'active') as child_count,
        parent.name as parent_name
      FROM categories c
      LEFT JOIN categories parent ON c.parent_id = parent.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!category) return res.status(404).json({ success: false, message: '分类不存在' });

    category.children = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.name_en,
        c.level,
        c.sort_order,
        c.taxonomy_type,
        ${getProductCountExpr('c')} as product_count
      FROM categories c
      WHERE c.parent_id = ? AND c.status = 'active'
      ORDER BY c.sort_order ASC, c.id ASC
    `).all(category.id);

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('[错误] GET /api/v2/categories/:id:', error);
    res.status(500).json({ success: false, message: '查询分类详情失败: ' + error.message });
  }
});

// POST /api/v2/categories - 创建分类
router.post('/', authMiddleware, requireAdmin, (req, res) => {
  ensureCategorySchema();
  const { name, nameEn, parentId, level = 1, sortOrder = 0, description, status = 'active' } = req.body;
  const taxonomyType = normalizeTaxonomyType(req.body.taxonomyType || req.body.taxonomy_type || 'consumer');
  const parent_id = parentId || null;
  const sort_order = sortOrder;
  const name_en = nameEn;

  if (!name) return res.status(400).json({ success: false, message: '分类名称为必填项' });

  if (parent_id) {
    const parentCategory = db.prepare('SELECT id, level, taxonomy_type FROM categories WHERE id = ?').get(parent_id);
    if (!parentCategory) return res.status(400).json({ success: false, message: '父分类不存在' });
    if ((parentCategory.taxonomy_type || 'consumer') !== taxonomyType) {
      return res.status(400).json({ success: false, message: '父分类与当前分类类型不一致' });
    }
  }

  try {
    const result = db.prepare(`
      INSERT INTO categories (name, name_en, parent_id, level, sort_order, description, status, taxonomy_type, slug, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(name, name_en || null, parent_id, level, sort_order, description || null, status, taxonomyType, slugify(req.body.slug || name));

    db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.admin.id, 'create', 'category', result.lastInsertRowid, JSON.stringify({ name, parentId: parent_id, taxonomyType }), req.ip);

    res.status(201).json({ success: true, message: '分类创建成功', id: result.lastInsertRowid });
  } catch (error) {
    console.error('创建分类失败:', error);
    res.status(500).json({ success: false, message: '创建分类失败: ' + error.message });
  }
});

// PUT /api/v2/categories/:id - 更新分类
router.put('/:id', authMiddleware, requireAdmin, (req, res) => {
  ensureCategorySchema();
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: '分类不存在' });

  if (req.body.parentId) {
    if (Number(req.body.parentId) === category.id) return res.status(400).json({ success: false, message: '不能将分类设置为自己' });
    let checkId = req.body.parentId;
    let depth = 0;
    while (checkId && depth < 10) {
      const parent = db.prepare('SELECT parent_id FROM categories WHERE id = ?').get(checkId);
      if (!parent) break;
      if (parent.parent_id === category.id) return res.status(400).json({ success: false, message: '不能形成循环引用' });
      checkId = parent.parent_id;
      depth++;
    }
  }

  try {
    const body = {
      name: req.body.name,
      name_en: req.body.nameEn,
      parent_id: req.body.parentId,
      level: req.body.level,
      sort_order: req.body.sortOrder,
      description: req.body.description,
      status: req.body.status,
      taxonomy_type: req.body.taxonomyType || req.body.taxonomy_type,
    };
    if (body.taxonomy_type !== undefined) body.taxonomy_type = normalizeTaxonomyType(body.taxonomy_type);

    const fields = ['name', 'name_en', 'parent_id', 'level', 'sort_order', 'description', 'status', 'taxonomy_type'];
    const setParts = [];
    const values = [];
    const changes = {};

    for (const field of fields) {
      if (body[field] !== undefined) {
        setParts.push(`${field} = ?`);
        values.push(body[field]);
        changes[field] = { old: category[field], new: body[field] };
      }
    }

    if (setParts.length === 0) return res.status(400).json({ success: false, message: '没有提供需要更新的字段' });

    setParts.push('updated_at = CURRENT_TIMESTAMP');
    db.prepare(`UPDATE categories SET ${setParts.join(', ')} WHERE id = ?`).run(...values, category.id);

    db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.admin.id, 'update', 'category', category.id, JSON.stringify(changes), req.ip);

    res.json({ success: true, message: '分类更新成功' });
  } catch (error) {
    console.error('更新分类失败:', error);
    res.status(500).json({ success: false, message: '更新分类失败: ' + error.message });
  }
});

// DELETE /api/v2/categories/:id - 删除分类
router.delete('/:id', authMiddleware, requireAdmin, (req, res) => {
  ensureCategorySchema();
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: '分类不存在' });

  const { count: childCount } = db.prepare('SELECT COUNT(*) as count FROM categories WHERE parent_id = ? AND status = "active"').get(category.id);
  if (childCount > 0) return res.status(400).json({ success: false, message: `该分类下有 ${childCount} 个子分类，请先删除子分类` });

  const productSql = (category.taxonomy_type || 'consumer') === 'compliance'
    ? 'SELECT COUNT(*) as count FROM product_compliance_categories pcc INNER JOIN products p ON p.id = pcc.product_id WHERE pcc.category_id = ? AND COALESCE(p.status, "active") != "deleted"'
    : 'SELECT COUNT(*) as count FROM products WHERE (category_primary_id = ? OR category_secondary_id = ?) AND COALESCE(status, "active") != "deleted"';
  const productCount = (category.taxonomy_type || 'consumer') === 'compliance'
    ? db.prepare(productSql).get(category.id).count
    : db.prepare(productSql).get(category.id, category.id).count;

  if (productCount > 0) return res.status(400).json({ success: false, message: `该分类下有 ${productCount} 个产品，请先移动或删除这些产品` });

  db.prepare('UPDATE categories SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('deleted', category.id);
  db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.admin.id, 'delete', 'category', category.id, JSON.stringify({ name: category.name, taxonomyType: category.taxonomy_type }), req.ip);

  res.json({ success: true, message: '分类已删除' });
});

module.exports = router;
