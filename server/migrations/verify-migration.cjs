/**
 * EU-DOC 数据库迁移验证脚本 v2.0.0
 *
 * 检查数据迁移是否完整、正确
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'eu-doc.db');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ 数据库文件不存在:', DB_PATH);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

console.log('='.repeat(60));
console.log('  EU-DOC 数据库迁移验证 v2.0.0');
console.log('='.repeat(60));
console.log('');

let passedChecks = 0;
let failedChecks = 0;
let warnings = 0;

function check(name, condition, errorMsg) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passedChecks++;
    return true;
  } else {
    console.log(`  ✗ ${name}`);
    if (errorMsg) console.log(`    ${errorMsg}`);
    failedChecks++;
    return false;
  }
}

function warn(message) {
  console.log(`  ⚠️  ${message}`);
  warnings++;
}

// ============================================================================
// 检查 1: 新表是否存在
// ============================================================================

console.log('📋 检查 1: 新表结构...');

const requiredTables = [
  'users',
  'company_members',
  'company_verification_documents',
  'categories',
  'tags',
  'products',
  'product_tags',
  'documents',
  'document_tags',
  'certificate_metadata',
  'upload_confirmations'
];

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
const tableNames = tables.map(t => t.name);

for (const table of requiredTables) {
  check(`表 ${table} 存在`, tableNames.includes(table));
}

console.log('');

// ============================================================================
// 检查 2: 旧表是否重命名
// ============================================================================

console.log('📋 检查 2: 旧表备份...');

check('certificates_legacy 存在', tableNames.includes('certificates_legacy'));
check('admins_legacy 存在', tableNames.includes('admins_legacy'));
check('certificates 表已移除', !tableNames.includes('certificates'));
check('admins 表已移除', !tableNames.includes('admins'));

console.log('');

// ============================================================================
// 检查 3: 数据数量对比
// ============================================================================

console.log('📋 检查 3: 数据完整性...');

// 用户数量
const oldAdminCount = db.prepare('SELECT COUNT(*) as cnt FROM admins_legacy').get().cnt;
const newUserCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
check(
  `用户数据完整 (${oldAdminCount} → ${newUserCount})`,
  oldAdminCount === newUserCount,
  `旧: ${oldAdminCount}, 新: ${newUserCount}`
);

// 证书数量（排除无效证书）
const oldCertCount = db.prepare('SELECT COUNT(*) as cnt FROM certificates_legacy').get().cnt;
const oldValidCertCount = db.prepare(
  'SELECT COUNT(*) as cnt FROM certificates_legacy WHERE company_id IS NOT NULL'
).get().cnt;
const newDocCertCount = db.prepare(
  "SELECT COUNT(*) as cnt FROM documents WHERE document_type='certificate'"
).get().cnt;

if (oldCertCount === newDocCertCount) {
  check(`证书文档数据完整 (${oldCertCount} → ${newDocCertCount})`, true);
} else if (oldValidCertCount === newDocCertCount) {
  check(`证书文档数据完整 (${oldValidCertCount} 有效证书 → ${newDocCertCount})`, true);
  warn(`跳过了 ${oldCertCount - oldValidCertCount} 个无效证书（无 company_id）`);
} else {
  check(
    `证书文档数据完整 (${oldCertCount} → ${newDocCertCount})`,
    false,
    `旧证书: ${oldCertCount} (有效: ${oldValidCertCount}), 新文档: ${newDocCertCount}`
  );
}

// 证书元数据数量
const metadataCount = db.prepare('SELECT COUNT(*) as cnt FROM certificate_metadata').get().cnt;
const certsWithCertNo = db.prepare(
  'SELECT COUNT(*) as cnt FROM certificates_legacy WHERE cert_no IS NOT NULL AND company_id IS NOT NULL'
).get().cnt;

if (metadataCount === certsWithCertNo) {
  check(`证书元数据完整 (${certsWithCertNo} → ${metadataCount})`, true);
} else {
  check(
    `证书元数据完整 (${certsWithCertNo} → ${metadataCount})`,
    false,
    `应有元数据: ${certsWithCertNo}, 实际: ${metadataCount}`
  );
}

// 产品数量
const productCount = db.prepare('SELECT COUNT(*) as cnt FROM products').get().cnt;
const uniqueProducts = db.prepare(`
  SELECT COUNT(DISTINCT company_id || '|' || product_name || '|' || COALESCE(model, '')) as cnt
  FROM certificates_legacy
  WHERE company_id IS NOT NULL AND product_name IS NOT NULL
`).get().cnt;

if (productCount === uniqueProducts) {
  check(`产品数据提取正确 (${uniqueProducts} 个唯一产品)`, true);
} else {
  warn(`产品数量不匹配: 预期 ${uniqueProducts}, 实际 ${productCount}`);
}

console.log('');

// ============================================================================
// 检查 4: 外键完整性
// ============================================================================

console.log('📋 检查 4: 外键完整性...');

// 检查孤立的文档（product_id 不存在）
const orphanDocs = db.prepare(`
  SELECT COUNT(*) as cnt FROM documents
  WHERE product_id IS NOT NULL
    AND product_id NOT IN (SELECT id FROM products)
`).get().cnt;
check('无孤立文档（product_id）', orphanDocs === 0, `发现 ${orphanDocs} 个孤立文档`);

// 检查孤立的证书元数据
const orphanMetadata = db.prepare(`
  SELECT COUNT(*) as cnt FROM certificate_metadata
  WHERE document_id NOT IN (SELECT id FROM documents)
`).get().cnt;
check('无孤立证书元数据', orphanMetadata === 0, `发现 ${orphanMetadata} 个孤立元数据`);

// 检查孤立的产品（company_id 不存在）
const orphanProducts = db.prepare(`
  SELECT COUNT(*) as cnt FROM products
  WHERE company_id NOT IN (SELECT id FROM companies)
`).get().cnt;
check('无孤立产品', orphanProducts === 0, `发现 ${orphanProducts} 个孤立产品`);

console.log('');

// ============================================================================
// 检查 5: 数据质量
// ============================================================================

console.log('📋 检查 5: 数据质量...');

// 检查用户邮箱格式
const usersWithEmail = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE email LIKE '%@%'").get().cnt;
const totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
check(
  '用户邮箱格式正确',
  usersWithEmail === totalUsers,
  `${usersWithEmail}/${totalUsers} 个用户有有效邮箱`
);

// 检查证书编号唯一性
const duplicateCertNos = db.prepare(`
  SELECT cert_no, COUNT(*) as cnt
  FROM certificate_metadata
  GROUP BY cert_no
  HAVING cnt > 1
`).all();
check('证书编号唯一', duplicateCertNos.length === 0, `发现 ${duplicateCertNos.length} 个重复证书编号`);

// 检查文档是否都有公司
const docsWithoutCompany = db.prepare('SELECT COUNT(*) as cnt FROM documents WHERE company_id IS NULL').get().cnt;
check('所有文档都关联企业', docsWithoutCompany === 0, `${docsWithoutCompany} 个文档没有企业`);

// 检查分类是否创建
const categoryCount = db.prepare('SELECT COUNT(*) as cnt FROM categories').get().cnt;
check('初始分类已创建', categoryCount > 0, `分类数: ${categoryCount}`);

// 检查标签是否创建
const tagCount = db.prepare('SELECT COUNT(*) as cnt FROM tags').get().cnt;
check('初始标签已创建', tagCount > 0, `标签数: ${tagCount}`);

console.log('');

// ============================================================================
// 检查 6: 索引是否创建
// ============================================================================

console.log('📋 检查 6: 索引...');

const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").all();
const indexCount = indexes.length;
check('索引已创建', indexCount >= 10, `创建了 ${indexCount} 个索引`);

console.log('');

// ============================================================================
// 检查 7: 数据样本抽查
// ============================================================================

console.log('📋 检查 7: 数据样本抽查...');

// 随机抽查 5 个证书
const sampleCerts = db.prepare(`
  SELECT
    d.id,
    d.title,
    cm.cert_no,
    p.name as product_name,
    c.name as company_name
  FROM documents d
  LEFT JOIN certificate_metadata cm ON d.id = cm.document_id
  LEFT JOIN products p ON d.product_id = p.id
  LEFT JOIN companies c ON d.company_id = c.id
  WHERE d.document_type = 'certificate'
  LIMIT 5
`).all();

console.log('  样本证书:');
for (const cert of sampleCerts) {
  console.log(`    - [${cert.cert_no || 'N/A'}] ${cert.title}`);
  console.log(`      企业: ${cert.company_name || 'N/A'}, 产品: ${cert.product_name || 'N/A'}`);
}

console.log('');

// ============================================================================
// 统计报告
// ============================================================================

console.log('='.repeat(60));
console.log('  📊 统计报告');
console.log('='.repeat(60));
console.log('');

const stats = {
  users: db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt,
  companies: db.prepare('SELECT COUNT(*) as cnt FROM companies').get().cnt,
  products: db.prepare('SELECT COUNT(*) as cnt FROM products').get().cnt,
  documents: db.prepare('SELECT COUNT(*) as cnt FROM documents').get().cnt,
  certificates: db.prepare("SELECT COUNT(*) as cnt FROM documents WHERE document_type='certificate'").get().cnt,
  metadata: db.prepare('SELECT COUNT(*) as cnt FROM certificate_metadata').get().cnt,
  categories: db.prepare('SELECT COUNT(*) as cnt FROM categories').get().cnt,
  tags: db.prepare('SELECT COUNT(*) as cnt FROM tags').get().cnt,
};

console.log(`  用户:          ${stats.users}`);
console.log(`  企业:          ${stats.companies}`);
console.log(`  产品:          ${stats.products}`);
console.log(`  文档总数:      ${stats.documents}`);
console.log(`  - 证书:        ${stats.certificates}`);
console.log(`  证书元数据:    ${stats.metadata}`);
console.log(`  分类:          ${stats.categories}`);
console.log(`  标签:          ${stats.tags}`);

console.log('');

// ============================================================================
// 最终结果
// ============================================================================

console.log('='.repeat(60));
console.log('  验证结果');
console.log('='.repeat(60));
console.log('');
console.log(`  ✓ 通过: ${passedChecks}`);
console.log(`  ✗ 失败: ${failedChecks}`);
console.log(`  ⚠️  警告: ${warnings}`);
console.log('');

if (failedChecks === 0 && warnings === 0) {
  console.log('  ✅ 所有检查通过，迁移成功！');
  console.log('');
  console.log('  下一步:');
  console.log('    1. 修改后端 API 代码，实现兼容层');
  console.log('    2. 测试前端页面是否正常显示');
  console.log('    3. 开始 Phase 2 开发');
  console.log('');
  process.exit(0);
} else if (failedChecks === 0 && warnings > 0) {
  console.log('  ⚠️  有警告，但不影响核心功能');
  console.log('');
  console.log('  建议检查警告项，确认是否需要调整');
  console.log('');
  process.exit(0);
} else {
  console.log('  ❌ 迁移验证失败！');
  console.log('');
  console.log('  请检查失败项，必要时执行回滚:');
  console.log('    node v2.0.0-rollback.cjs');
  console.log('  或手动恢复备份:');
  console.log('    cp server/data/eu-doc.db.backup-before-v2.0.0 server/data/eu-doc.db');
  console.log('');
  process.exit(1);
}

db.close();
