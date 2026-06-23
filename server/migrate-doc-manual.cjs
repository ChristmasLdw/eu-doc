/**
 * 迁移 DoC 和说明书数据到 documents 表
 *
 * 问题：
 * - certificates_legacy 表中有 29 个 DoC 和 4 个说明书
 * - 这些数据没有迁移到 documents 表
 * - ProductDetailPage 只读取 documents 表，导致 DoC 和说明书无法显示
 *
 * 解决方案：
 * - 将 declaration_path 迁移为 document_type = 'declaration_of_conformity'
 * - 将 manual_path 迁移为 document_type = 'manual'
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'eu-doc.db');
const db = new Database(DB_PATH);

console.log('🔧 开始迁移 DoC 和说明书数据...\n');

// 1. 查看需要迁移的数据
const stats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN declaration_path IS NOT NULL THEN 1 ELSE 0 END) as has_doc,
    SUM(CASE WHEN manual_path IS NOT NULL THEN 1 ELSE 0 END) as has_manual
  FROM certificates_legacy
`).get();

console.log('统计:');
console.log(`  证书总数: ${stats.total}`);
console.log(`  有 DoC: ${stats.has_doc}`);
console.log(`  有说明书: ${stats.has_manual}`);

// 2. 查找证书对应的 product_id 和 company_id
const findProductId = db.prepare(`
  SELECT id, company_id
  FROM products
  WHERE company_id = ? AND name = ? AND model = ?
  LIMIT 1
`);

// 3. 插入 document
const insertDocument = db.prepare(`
  INSERT INTO documents (
    company_id, product_id, document_type, title, language,
    file_path, status, review_status, uploaded_by, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// 4. 获取所有有 DoC 或说明书的证书
const certs = db.prepare(`
  SELECT *
  FROM certificates_legacy
  WHERE declaration_path IS NOT NULL OR manual_path IS NOT NULL
`).all();

let docCount = 0;
let manualCount = 0;
let skipped = 0;

db.transaction(() => {
  for (const cert of certs) {
    // 查找产品 ID
    const product = findProductId.get(cert.company_id, cert.product_name, cert.model);

    if (!product) {
      console.log(`  ⚠️  跳过证书 ${cert.cert_no}：找不到对应产品`);
      skipped++;
      continue;
    }

    // 迁移 DoC
    if (cert.declaration_path) {
      try {
        insertDocument.run(
          product.company_id,
          product.id,
          'declaration_of_conformity',
          `${cert.product_name} - DoC`,
          'en',
          cert.declaration_path,
          'active',
          cert.review_status || 'pending',
          1, // uploaded_by
          cert.created_at,
          cert.updated_at
        );
        docCount++;
      } catch (err) {
        if (!err.message.includes('UNIQUE')) {
          console.log(`  ❌ DoC 迁移失败: ${cert.cert_no} - ${err.message}`);
        }
      }
    }

    // 迁移说明书
    if (cert.manual_path) {
      try {
        insertDocument.run(
          product.company_id,
          product.id,
          'manual',
          `${cert.product_name} - Manual`,
          'en',
          cert.manual_path,
          'active',
          cert.review_status || 'pending',
          1, // uploaded_by
          cert.created_at,
          cert.updated_at
        );
        manualCount++;
      } catch (err) {
        if (!err.message.includes('UNIQUE')) {
          console.log(`  ❌ Manual 迁移失败: ${cert.cert_no} - ${err.message}`);
        }
      }
    }
  }
})();

console.log('\n✅ 迁移完成:');
console.log(`  DoC: ${docCount} 条`);
console.log(`  说明书: ${manualCount} 条`);
console.log(`  跳过: ${skipped} 条`);

// 5. 验证结果
console.log('\n=== 验证 documents 表 ===');
const newStats = db.prepare(`
  SELECT document_type, COUNT(*) as count
  FROM documents
  GROUP BY document_type
`).all();
console.table(newStats);

db.close();
console.log('\n✨ 完成！');
