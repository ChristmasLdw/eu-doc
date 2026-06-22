/**
 * EU-DOC 数据库迁移回滚脚本 v2.0.0
 *
 * 将数据库恢复到 v1.x 结构
 *
 * 警告: 此脚本会删除所有新表和新数据！
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const DB_PATH = path.join(__dirname, '..', 'data', 'eu-doc.db');
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'eu-doc.db.backup-before-v2.0.0');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ 数据库文件不存在:', DB_PATH);
  process.exit(1);
}

console.log('='.repeat(60));
console.log('  EU-DOC 数据库回滚 v2.0.0 → v1.x');
console.log('='.repeat(60));
console.log('');
console.log('⚠️  警告: 此操作将删除所有 v2.0.0 的新表和数据！');
console.log('');

// 创建交互式确认
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('是否确认回滚？(yes/no): ', (answer) => {
  if (answer.toLowerCase() !== 'yes') {
    console.log('');
    console.log('❌ 回滚已取消');
    console.log('');
    rl.close();
    process.exit(0);
  }

  rl.close();
  performRollback();
});

function performRollback() {
  console.log('');
  console.log('开始回滚...');
  console.log('');

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = OFF');

  try {
    db.exec('BEGIN TRANSACTION');

    // ============================================================================
    // Step 1: 删除新表
    // ============================================================================

    console.log('📦 Step 1: 删除新表...');

    const newTables = [
      'upload_confirmations',
      'document_tags',
      'certificate_metadata',
      'documents',
      'product_tags',
      'products',
      'tags',
      'categories',
      'company_verification_documents',
      'company_members',
      'users'
    ];

    for (const table of newTables) {
      try {
        db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
        console.log(`  ✓ 已删除表: ${table}`);
      } catch (err) {
        console.log(`  ⚠️  删除表失败 ${table}: ${err.message}`);
      }
    }

    // ============================================================================
    // Step 2: 恢复旧表
    // ============================================================================

    console.log('');
    console.log('📦 Step 2: 恢复旧表...');

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);

    // 恢复 certificates
    if (tableNames.includes('certificates_legacy')) {
      db.exec('DROP TABLE IF EXISTS certificates');
      db.exec('ALTER TABLE certificates_legacy RENAME TO certificates');
      console.log('  ✓ certificates_legacy → certificates');
    } else {
      console.log('  ⚠️  找不到 certificates_legacy 表');
    }

    // 恢复 admins
    if (tableNames.includes('admins_legacy')) {
      db.exec('DROP TABLE IF EXISTS admins');
      db.exec('ALTER TABLE admins_legacy RENAME TO admins');
      console.log('  ✓ admins_legacy → admins');
    } else {
      console.log('  ⚠️  找不到 admins_legacy 表');
    }

    // ============================================================================
    // Step 3: 移除 companies 新增字段
    // ============================================================================

    console.log('');
    console.log('📦 Step 3: 恢复 companies 表结构...');

    // SQLite 不支持 DROP COLUMN，需要重建表
    const companyColumns = db.prepare('PRAGMA table_info(companies)').all();
    const hasNewColumns = companyColumns.some(col =>
      ['country', 'business_license_no', 'verification_status'].includes(col.name)
    );

    if (hasNewColumns) {
      db.exec(`
        CREATE TABLE companies_backup (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          name_en TEXT,
          contact_person TEXT,
          contact_email TEXT,
          contact_phone TEXT,
          address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO companies_backup (
          id, name, name_en, contact_person, contact_email, contact_phone, address, created_at, updated_at
        )
        SELECT
          id, name, name_en, contact_person, contact_email, contact_phone, address, created_at, updated_at
        FROM companies;

        DROP TABLE companies;
        ALTER TABLE companies_backup RENAME TO companies;
      `);
      console.log('  ✓ companies 表结构已恢复');
    } else {
      console.log('  ✓ companies 表无需恢复');
    }

    // ============================================================================
    // Step 4: 清理 certificate_reports 新增字段
    // ============================================================================

    console.log('');
    console.log('📦 Step 4: 恢复 certificate_reports 表结构...');

    const reportColumns = db.prepare('PRAGMA table_info(certificate_reports)').all();
    const reportHasNewColumns = reportColumns.some(col =>
      ['document_id', 'handled_by', 'handled_at'].includes(col.name)
    );

    if (reportHasNewColumns) {
      db.exec(`
        CREATE TABLE certificate_reports_backup (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cert_id INTEGER NOT NULL,
          report_type TEXT NOT NULL,
          description TEXT,
          reporter_email TEXT,
          reporter_name TEXT,
          status TEXT DEFAULT 'pending',
          admin_response TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cert_id) REFERENCES certificates(id)
        );

        INSERT INTO certificate_reports_backup
        SELECT
          id, cert_id, report_type, description, reporter_email, reporter_name,
          status, admin_response, created_at, updated_at
        FROM certificate_reports;

        DROP TABLE certificate_reports;
        ALTER TABLE certificate_reports_backup RENAME TO certificate_reports;
      `);
      console.log('  ✓ certificate_reports 表结构已恢复');
    } else {
      console.log('  ✓ certificate_reports 表无需恢复');
    }

    db.exec('COMMIT');

    console.log('');
    console.log('='.repeat(60));
    console.log('  ✅ 回滚成功完成！');
    console.log('='.repeat(60));
    console.log('');
    console.log('数据库已恢复到 v1.x 结构');
    console.log('');

    // 显示最终状态
    const finalTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log('当前表:');
    for (const table of finalTables) {
      console.log(`  - ${table.name}`);
    }
    console.log('');

  } catch (err) {
    db.exec('ROLLBACK');
    console.error('');
    console.error('❌ 回滚失败:', err.message);
    console.error('');
    console.error('建议手动恢复备份:');
    if (fs.existsSync(BACKUP_PATH)) {
      console.error(`  cp ${BACKUP_PATH} ${DB_PATH}`);
    } else {
      console.error('  ⚠️  找不到备份文件！');
    }
    console.error('');
    process.exit(1);
  } finally {
    db.pragma('foreign_keys = ON');
    db.close();
  }
}
