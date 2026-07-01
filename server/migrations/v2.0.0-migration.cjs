/**
 * EU-DOC 数据库迁移脚本 v2.0.0
 *
 * 迁移目标: 从 企业 -> 证书 升级为 企业 -> 产品 -> 文档
 *
 * 执行前必须备份:
 *   cp server/data/eu-doc.db server/data/eu-doc.db.backup-before-v2.0.0
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'eu-doc.db');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ 数据库文件不存在:', DB_PATH);
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('foreign_keys = OFF'); // 迁移期间暂时关闭外键约束

console.log('='.repeat(60));
console.log('  EU-DOC 数据库迁移 v2.0.0');
console.log('='.repeat(60));
console.log('');

// ============================================================================
// Phase 1: 创建新表
// ============================================================================

console.log('📦 Phase 1: 创建新表结构...');

function createNewTables() {
  db.exec(`
    -- 1. 用户表（替代 admins）
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      email_verified INTEGER DEFAULT 0,
      phone_verified INTEGER DEFAULT 0,
      platform_role TEXT NOT NULL DEFAULT 'user',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. 企业成员关系表
    CREATE TABLE IF NOT EXISTS company_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      status TEXT DEFAULT 'active',
      invited_by INTEGER,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (invited_by) REFERENCES users(id),
      UNIQUE(user_id, company_id)
    );

    -- 3. 企业认证资料表
    CREATE TABLE IF NOT EXISTS company_verification_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      document_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      uploaded_by INTEGER NOT NULL,
      review_status TEXT DEFAULT 'pending',
      review_note TEXT,
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );

    -- 4. 分类表（三级）
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      level INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      name_en TEXT,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      taxonomy_type TEXT DEFAULT 'consumer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    );

    -- 5. 标签表
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT,
      slug TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. 产品表
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      name_en TEXT,
      model TEXT,
      description TEXT,
      description_en TEXT,
      category_primary_id INTEGER,
      category_secondary_id INTEGER,
      dimensions TEXT,
      weight TEXT,
      material TEXT,
      usage_scenario TEXT,
      color TEXT,
      package_contents TEXT,
      warranty TEXT,
      origin_country TEXT,
      image_path TEXT,
      status TEXT DEFAULT 'active',
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (category_primary_id) REFERENCES categories(id),
      FOREIGN KEY (category_secondary_id) REFERENCES categories(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- 7. 产品标签关联表
    CREATE TABLE IF NOT EXISTS product_tags (
      product_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (product_id, tag_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    -- 7b. 产品合规分类关联表
    CREATE TABLE IF NOT EXISTS product_compliance_categories (
      product_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (product_id, category_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    -- 8. 统一文档表
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      product_id INTEGER,
      document_type TEXT NOT NULL,
      title TEXT NOT NULL,
      title_en TEXT,
      language TEXT DEFAULT 'en',
      file_path TEXT,
      file_size INTEGER,
      mime_type TEXT,
      version TEXT,
      status TEXT DEFAULT 'active',
      review_status TEXT DEFAULT 'pending',
      review_note TEXT,
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      uploaded_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );

    -- 9. 文档标签关联表
    CREATE TABLE IF NOT EXISTS document_tags (
      document_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (document_id, tag_id),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    -- 10. 证书元数据表
    CREATE TABLE IF NOT EXISTS certificate_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL UNIQUE,
      cert_no TEXT UNIQUE NOT NULL,
      standard TEXT,
      issuer TEXT,
      issue_date TEXT,
      expiry_date TEXT,
      certificate_status TEXT DEFAULT 'active',
      remark TEXT,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    -- 11. 上传确认记录表
    CREATE TABLE IF NOT EXISTS upload_confirmations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      confirmed_authentic INTEGER DEFAULT 0,
      confirmed_authorized INTEGER DEFAULT 0,
      confirmed_no_infringement INTEGER DEFAULT 0,
      accepted_disclaimer INTEGER DEFAULT 0,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );
  `);

  console.log('  ✓ 所有新表创建成功');
}

// ============================================================================
// Phase 2: 扩展现有表
// ============================================================================

console.log('\n📦 Phase 2: 扩展现有表结构...');

function extendExistingTables() {
  // 检查 companies 表现有列
  const companyColumns = db.prepare('PRAGMA table_info(companies)').all();
  const companyColumnNames = companyColumns.map(col => col.name);

  const columnsToAdd = [
    { name: 'country', type: 'TEXT' },
    { name: 'business_license_no', type: 'TEXT' },
    { name: 'address_en', type: 'TEXT' },
    { name: 'website', type: 'TEXT' },
    { name: 'logo_path', type: 'TEXT' },
    { name: 'verification_status', type: 'TEXT DEFAULT \'verified\'' },
    { name: 'verified_at', type: 'DATETIME' },
    { name: 'verified_by', type: 'INTEGER' },
    { name: 'verification_note', type: 'TEXT' },
    { name: 'status', type: 'TEXT DEFAULT \'active\'' }
  ];

  for (const col of columnsToAdd) {
    if (!companyColumnNames.includes(col.name)) {
      db.prepare(`ALTER TABLE companies ADD COLUMN ${col.name} ${col.type}`).run();
      console.log(`  ✓ companies 表添加列: ${col.name}`);
    }
  }

  // 将现有企业标记为已认证（历史数据）
  db.prepare(`
    UPDATE companies
    SET verification_status = 'verified',
        verified_at = CURRENT_TIMESTAMP,
        status = 'active'
    WHERE verification_status IS NULL OR verification_status = 'verified'
  `).run();

  // 检查 certificate_reports 表
  const reportColumns = db.prepare('PRAGMA table_info(certificate_reports)').all();
  const reportColumnNames = reportColumns.map(col => col.name);

  if (!reportColumnNames.includes('document_id')) {
    db.prepare('ALTER TABLE certificate_reports ADD COLUMN document_id INTEGER').run();
    console.log('  ✓ certificate_reports 表添加列: document_id');
  }

  if (!reportColumnNames.includes('handled_by')) {
    db.prepare('ALTER TABLE certificate_reports ADD COLUMN handled_by INTEGER').run();
    console.log('  ✓ certificate_reports 表添加列: handled_by');
  }

  if (!reportColumnNames.includes('handled_at')) {
    db.prepare('ALTER TABLE certificate_reports ADD COLUMN handled_at DATETIME').run();
    console.log('  ✓ certificate_reports 表添加列: handled_at');
  }

  console.log('  ✓ 现有表扩展完成');
}

// ============================================================================
// Phase 3: 迁移数据 - admins → users
// ============================================================================

console.log('\n📦 Phase 3: 迁移用户数据 (admins → users)...');

function migrateUsers() {
  const admins = db.prepare('SELECT * FROM admins').all();

  if (admins.length === 0) {
    console.log('  ⚠️  没有用户数据需要迁移');
    return;
  }

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, display_name, platform_role, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?)
  `);

  let migratedCount = 0;
  for (const admin of admins) {
    try {
      // 如果 username 包含 @，认为是邮箱；否则转为 username@legacy.local
      const email = admin.username.includes('@')
        ? admin.username
        : `${admin.username}@legacy.local`;

      insertUser.run(
        admin.id,
        email,
        admin.password_hash,
        admin.username,
        admin.role || 'user',
        admin.created_at
      );
      migratedCount++;
    } catch (err) {
      console.log(`  ⚠️  用户 ${admin.username} 迁移失败: ${err.message}`);
    }
  }

  console.log(`  ✓ 已迁移 ${migratedCount} 个用户`);
}

// ============================================================================
// Phase 4: 迁移数据 - certificates → products + documents + certificate_metadata
// ============================================================================

console.log('\n📦 Phase 4: 迁移证书数据...');

function migrateProducts() {
  // 4.1 提取唯一产品
  console.log('  → 提取唯一产品...');

  const uniqueProducts = db.prepare(`
    SELECT DISTINCT
      company_id,
      product_name,
      category,
      model,
      MIN(created_at) as first_seen
    FROM certificates
    WHERE company_id IS NOT NULL AND product_name IS NOT NULL
    GROUP BY company_id, product_name, model
  `).all();

  if (uniqueProducts.length === 0) {
    console.log('  ⚠️  没有产品数据需要迁移');
    return;
  }

  const insertProduct = db.prepare(`
    INSERT INTO products (company_id, name, model, status, created_by, created_at)
    VALUES (?, ?, ?, 'active', 1, ?)
  `);

  let productCount = 0;
  for (const prod of uniqueProducts) {
    try {
      insertProduct.run(
        prod.company_id,
        prod.product_name,
        prod.model,
        prod.first_seen
      );
      productCount++;
    } catch (err) {
      console.log(`  ⚠️  产品 ${prod.product_name} 插入失败: ${err.message}`);
    }
  }

  console.log(`  ✓ 已创建 ${productCount} 个产品`);
}

function migrateCertificates() {
  // 4.2 迁移证书到 documents
  console.log('  → 迁移证书到 documents...');

  const certificates = db.prepare('SELECT * FROM certificates ORDER BY id').all();

  if (certificates.length === 0) {
    console.log('  ⚠️  没有证书数据需要迁移');
    return;
  }

  const insertDocument = db.prepare(`
    INSERT INTO documents (
      id, company_id, product_id, document_type, title, language,
      file_path, status, review_status, uploaded_by, created_at, updated_at
    ) VALUES (?, ?, ?, 'certificate', ?, 'en', ?, ?, ?, 1, ?, ?)
  `);

  const insertMetadata = db.prepare(`
    INSERT INTO certificate_metadata (
      document_id, cert_no, standard, issuer, issue_date, expiry_date, certificate_status, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const findProduct = db.prepare(`
    SELECT id FROM products
    WHERE company_id = ?
      AND name = ?
      AND (model = ? OR (model IS NULL AND ? IS NULL))
    LIMIT 1
  `);

  let docCount = 0;
  let metaCount = 0;
  let skippedCount = 0;

  for (const cert of certificates) {
    try {
      // 跳过没有 company_id 的证书
      if (!cert.company_id) {
        console.log(`  ⚠️  证书 #${cert.id} 没有 company_id，已跳过`);
        skippedCount++;
        continue;
      }

      // 查找对应产品
      let productId = null;
      if (cert.product_name) {
        const product = findProduct.get(cert.company_id, cert.product_name, cert.model, cert.model);
        productId = product ? product.id : null;
      }

      // 生成标题
      const title = cert.product_name
        ? `${cert.product_name}${cert.cert_no ? ' - ' + cert.cert_no : ''}`
        : cert.cert_no || `Certificate #${cert.id}`;

      // 插入文档记录（file_path 允许为 NULL）
      insertDocument.run(
        cert.id,
        cert.company_id,
        productId,
        title,
        cert.file_path || null,
        cert.status || 'active',
        cert.review_status || 'approved',
        cert.created_at,
        cert.updated_at
      );
      docCount++;

      // 插入证书元数据
      if (cert.cert_no) {
        insertMetadata.run(
          cert.id,  // document_id 与 certificate id 保持一致
          cert.cert_no,
          cert.standard,
          cert.issuer,
          cert.issue_date,
          cert.expiry_date,
          cert.status || 'active',
          cert.remark
        );
        metaCount++;
      }
    } catch (err) {
      console.log(`  ⚠️  证书 #${cert.id} 迁移失败: ${err.message}`);
    }
  }

  console.log(`  ✓ 已迁移 ${docCount} 个文档记录`);
  console.log(`  ✓ 已创建 ${metaCount} 个证书元数据`);
  if (skippedCount > 0) {
    console.log(`  ⚠️  跳过 ${skippedCount} 个无效证书`);
  }
}

// ============================================================================
// Phase 5: 创建初始分类和标签
// ============================================================================

console.log('\n📦 Phase 5: 创建初始分类和标签...');

function createInitialCategories() {
  const categories = [
    // 一级分类
    { id: 1, parent_id: null, level: 1, name: '安全防护设备', name_en: 'Safety Equipment', slug: 'safety-equipment' },
    { id: 2, parent_id: null, level: 1, name: '运动装备', name_en: 'Sports Equipment', slug: 'sports-equipment' },
    { id: 3, parent_id: null, level: 1, name: '电子产品', name_en: 'Electronics', slug: 'electronics' },

    // 二级分类
    { id: 11, parent_id: 1, level: 2, name: '头部防护', name_en: 'Head Protection', slug: 'head-protection' },
    { id: 12, parent_id: 1, level: 2, name: '身体防护', name_en: 'Body Protection', slug: 'body-protection' },

    // 三级分类
    { id: 111, parent_id: 11, level: 3, name: '马术头盔', name_en: 'Equestrian Helmets', slug: 'equestrian-helmets' },
    { id: 112, parent_id: 11, level: 3, name: '自行车头盔', name_en: 'Bicycle Helmets', slug: 'bicycle-helmets' },
  ];

  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (id, parent_id, level, name, name_en, slug, sort_order, status, taxonomy_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'consumer')
  `);

  let count = 0;
  for (const cat of categories) {
    try {
      insertCategory.run(
        cat.id,
        cat.parent_id,
        cat.level,
        cat.name,
        cat.name_en,
        cat.slug,
        cat.id
      );
      count++;
    } catch (err) {
      // 忽略重复插入
    }
  }

  const complianceCategories = [
    { id: 201, name: 'PPE / 个人防护法规', name_en: 'PPE / Personal Protective Equipment', slug: 'compliance-ppe' },
    { id: 202, name: 'EMC 电磁兼容', name_en: 'EMC', slug: 'compliance-emc' },
    { id: 203, name: 'LVD 低电压', name_en: 'LVD', slug: 'compliance-lvd' },
    { id: 204, name: 'RED 无线设备', name_en: 'RED', slug: 'compliance-red' },
    { id: 205, name: 'RoHS / REACH', name_en: 'RoHS / REACH', slug: 'compliance-rohs-reach' },
    { id: 206, name: 'Toy Safety 玩具安全', name_en: 'Toy Safety', slug: 'compliance-toy-safety' },
    { id: 207, name: 'Machinery 机械设备', name_en: 'Machinery', slug: 'compliance-machinery' },
    { id: 208, name: 'Medical Device 医疗器械', name_en: 'Medical Device', slug: 'compliance-medical-device' },
  ];
  const insertComplianceCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (id, parent_id, level, name, name_en, slug, sort_order, status, taxonomy_type)
    VALUES (?, NULL, 1, ?, ?, ?, ?, 'active', 'compliance')
  `);
  complianceCategories.forEach((cat) => {
    insertComplianceCategory.run(cat.id, cat.name, cat.name_en, cat.slug, cat.id);
  });

  console.log(`  ✓ 已创建 ${count} 个初始分类`);
}

function createInitialTags() {
  const tags = [
    // 标准类标签
    { name: 'CE', name_en: 'CE', slug: 'ce', type: 'standard' },
    { name: 'RoHS', name_en: 'RoHS', slug: 'rohs', type: 'standard' },
    { name: 'REACH', name_en: 'REACH', slug: 'reach', type: 'standard' },
    { name: 'EN 1384', name_en: 'EN 1384', slug: 'en-1384', type: 'standard' },
    { name: 'EN 1078', name_en: 'EN 1078', slug: 'en-1078', type: 'standard' },

    // 特性类标签
    { name: '防水', name_en: 'Waterproof', slug: 'waterproof', type: 'feature' },
    { name: '轻量', name_en: 'Lightweight', slug: 'lightweight', type: 'feature' },
    { name: '透气', name_en: 'Breathable', slug: 'breathable', type: 'feature' },
  ];

  const insertTag = db.prepare(`
    INSERT OR IGNORE INTO tags (name, name_en, slug, type, status)
    VALUES (?, ?, ?, ?, 'active')
  `);

  let count = 0;
  for (const tag of tags) {
    try {
      insertTag.run(tag.name, tag.name_en, tag.slug, tag.type);
      count++;
    } catch (err) {
      // 忽略重复插入
    }
  }

  console.log(`  ✓ 已创建 ${count} 个初始标签`);
}

// ============================================================================
// Phase 6: 创建索引
// ============================================================================

console.log('\n📦 Phase 6: 创建索引...');

function createIndexes() {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_documents_product ON documents(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type)',
    'CREATE INDEX IF NOT EXISTS idx_documents_review_status ON documents(review_status)',
    'CREATE INDEX IF NOT EXISTS idx_certificate_metadata_cert_no ON certificate_metadata(cert_no)',
    'CREATE INDEX IF NOT EXISTS idx_certificate_metadata_document ON certificate_metadata(document_id)',
    'CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_products_category_primary ON products(category_primary_id)',
    'CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_company_members_company ON company_members(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)',
    'CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)',
    'CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug)',
    'CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type)',
  ];

  for (const indexSQL of indexes) {
    try {
      db.exec(indexSQL);
    } catch (err) {
      console.log(`  ⚠️  索引创建失败: ${err.message}`);
    }
  }

  console.log(`  ✓ 已创建 ${indexes.length} 个索引`);
}

// ============================================================================
// Phase 7: 重命名旧表为 _legacy
// ============================================================================

console.log('\n📦 Phase 7: 备份旧表...');

function renameOldTables() {
  // 检查表是否存在
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const tableNames = tables.map(t => t.name);

  if (tableNames.includes('certificates') && !tableNames.includes('certificates_legacy')) {
    db.exec('ALTER TABLE certificates RENAME TO certificates_legacy');
    console.log('  ✓ certificates → certificates_legacy');
  }

  if (tableNames.includes('admins') && !tableNames.includes('admins_legacy')) {
    db.exec('ALTER TABLE admins RENAME TO admins_legacy');
    console.log('  ✓ admins → admins_legacy');
  }
}

// ============================================================================
// 执行迁移
// ============================================================================

try {
  db.exec('BEGIN TRANSACTION');

  createNewTables();
  extendExistingTables();
  migrateUsers();
  migrateProducts();
  migrateCertificates();
  createInitialCategories();
  createInitialTags();
  createIndexes();
  renameOldTables();

  db.exec('COMMIT');

  console.log('');
  console.log('='.repeat(60));
  console.log('  ✅ 迁移成功完成！');
  console.log('='.repeat(60));
  console.log('');
  console.log('下一步:');
  console.log('  1. 运行验证脚本: node verify-migration.cjs');
  console.log('  2. 检查数据完整性');
  console.log('  3. 修改后端 API 代码');
  console.log('');

} catch (err) {
  db.exec('ROLLBACK');
  console.error('');
  console.error('❌ 迁移失败:', err.message);
  console.error('');
  console.error('数据库已回滚，未做任何更改。');
  console.error('');
  console.error('如需恢复备份:');
  console.error('  cp server/data/eu-doc.db.backup-before-v2.0.0 server/data/eu-doc.db');
  console.error('');
  process.exit(1);
} finally {
  db.pragma('foreign_keys = ON'); // 重新启用外键约束
  db.close();
}
