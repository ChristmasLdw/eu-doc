/**
 * EU-DOC 后端服务 - SQLite 数据库初始化模块
 * 版本: 1.0.2
 *
 * 变更记录 (1.0.2):
 * - admins 表新增 role 字段（admin/user），支持普通用户注册
 * - admins 表新增 company_name 字段，用户可关联企业
 * - 新增数据迁移逻辑：为现有数据添加默认 role='admin'
 *
 * 职责:
 * - 创建 SQLite 数据库连接（better-sqlite3 同步 API）
 * - 初始化所有数据表（admins, companies, certificates, audit_logs）
 * - 从前端 mockData.js 导入现有 46 条证书数据
 * - 创建默认管理员账号（admin / admin123）
 *
 * 为什么选择 better-sqlite3 而不是 sqlite3?
 * - better-sqlite3 使用同步 API，代码更简洁，不需要 callback/Promise
 * - 对于中小型应用（几千条记录），同步 API 的性能完全足够
 * - 避免了异步代码带来的复杂性（try/catch 比 callback 更直观）
 */

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// 数据库文件路径: server/data/eu-doc.db
const DB_PATH = path.join(__dirname, 'data', 'eu-doc.db');

// 确保 data 目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建数据库连接
// better-sqlite3 的 Database 构造函数：如果文件不存在会自动创建
const db = new Database(DB_PATH);

// 启用 WAL 模式（Write-Ahead Logging）
// WAL 模式允许读写并发，比默认的 journal 模式性能更好
db.pragma('journal_mode = WAL');

// 启用外键约束（SQLite 默认不检查外键，需要手动开启）
db.pragma('foreign_keys = ON');

/**
 * 初始化数据库表结构
 * 使用 CREATE TABLE IF NOT EXISTS 确保幂等性（重复运行不会报错）
 */
function initTables() {
  db.exec(`
    -- 用户账号表（管理员和普通用户共用）
    -- role: 'admin' = 管理员，'user' = 普通用户
    -- company_name: 用户所属企业名称（可选，注册时可填写）
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      company_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 认证企业表
    CREATE TABLE IF NOT EXISTS companies (
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

    -- 证书表
    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cert_no TEXT UNIQUE NOT NULL,
      company_id INTEGER,
      product_name TEXT NOT NULL,
      category TEXT,
      model TEXT,
      standard TEXT,
      issuer TEXT,
      issue_date TEXT,
      expiry_date TEXT,
      status TEXT DEFAULT 'active',
      file_path TEXT,
      thumbnail_path TEXT,
      source_url TEXT,
      review_status TEXT DEFAULT 'approved',
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    -- 操作审计日志表
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      detail TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * 数据迁移：为已有的 admins 表添加 role 和 company_name 列
 *
 * 为什么需要迁移？
 * - SQLite 的 ALTER TABLE 可以添加列，但不能添加带 NOT NULL DEFAULT 的列（某些版本限制）
 * - CREATE TABLE IF NOT EXISTS 不会修改已存在的表结构
 * - 所以需要检查列是否存在，不存在则用 ALTER TABLE 添加
 *
 * 策略：
 * 1. 用 PRAGMA table_info 检查列是否存在
 * 2. 不存在则 ALTER TABLE ADD COLUMN（SQLite 支持添加带 DEFAULT 的列）
 * 3. 将没有 role 值的旧记录设为 'admin'（因为旧数据都是管理员）
 */
function migrateAdminsTable() {
  const columns = db.prepare('PRAGMA table_info(admins)').all();
  const columnNames = columns.map(col => col.name);

  // 添加 role 列（如果不存在）
  if (!columnNames.includes('role')) {
    db.prepare("ALTER TABLE admins ADD COLUMN role TEXT NOT NULL DEFAULT 'user'").run();
    // 旧数据都是管理员，将 role 设为 'admin'
    db.prepare("UPDATE admins SET role = 'admin' WHERE role = 'user'").run();
    console.log('  [迁移] admins 表已添加 role 列，旧用户设为 admin');
  }

  // 添加 company_name 列（如果不存在）
  if (!columnNames.includes('company_name')) {
    db.prepare('ALTER TABLE admins ADD COLUMN company_name TEXT').run();
    console.log('  [迁移] admins 表已添加 company_name 列');
  }
}

/**
 * 创建默认管理员账号
 * 仅在 admins 表为空时创建，避免重复插入
 */
function initDefaultAdmin() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM admins').get();

  if (count.cnt === 0) {
    // bcrypt.hashSync: 同步地对密码进行哈希加密
    // saltRounds=10: 加密强度，数值越大越安全但越慢，10 是常用平衡值
    const hash = bcrypt.hashSync('admin123', 10);

    db.prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');

    console.log('\x1b[33m%s\x1b[0m', '  [安全提示] 默认管理员已创建: admin / admin123');
    console.log('\x1b[33m%s\x1b[0m', '  [安全提示] 请首次登录后立即修改密码！\n');
  }
}

/**
 * 从前端 mockData.js 导入现有证书数据
 * 仅在 certificates 表为空时执行，避免重复导入
 *
 * 数据映射说明:
 * - mockData 使用 camelCase（如 certNo），数据库使用 snake_case（如 cert_no）
 * - mockData 中 companyName 是字符串，数据库中 company_id 是外键引用 companies 表
 * - 由于目前所有证书都属于同一公司，会自动创建该公司的记录
 */
function importMockData() {
  const certCount = db.prepare('SELECT COUNT(*) as cnt FROM certificates').get();

  if (certCount.cnt > 0) {
    console.log('  [数据库] 证书数据已存在，跳过导入');
    return;
  }

  // 读取前端 mockData.js 文件
  // 使用正则提取 certificates 数组（因为 mockData.js 使用 ES module export 语法，
  // 不能直接 require，所以用文本解析方式提取）
  const mockDataPath = path.join(__dirname, '..', 'src', 'data', 'mockData.js');
  const mockDataContent = fs.readFileSync(mockDataPath, 'utf-8');

  // 提取 certificates 数组（从 const certificates = [ 到 ]; 之间的内容）
  const arrayMatch = mockDataContent.match(/const certificates\s*=\s*(\[[\s\S]*?\]);/);
  if (!arrayMatch) {
    console.log('  [警告] 未能从 mockData.js 中解析证书数据');
    return;
  }

  // 使用 Function 构造器安全地解析数组（比 eval 稍安全）
  const certificates = new Function('return ' + arrayMatch[1])();

  if (!Array.isArray(certificates) || certificates.length === 0) {
    console.log('  [警告] mockData.js 中没有证书数据');
    return;
  }

  // 先确保公司存在（从 mockData 中提取唯一公司名）
  const companyNames = [...new Set(certificates.map(c => c.companyName))];

  const insertCompany = db.prepare(
    'INSERT OR IGNORE INTO companies (name, name_en) VALUES (?, ?)'
  );
  const getCompany = db.prepare('SELECT id FROM companies WHERE name = ?');

  // 为每个公司创建记录，并建立 name -> id 的映射
  const companyIdMap = {};
  for (const name of companyNames) {
    insertCompany.run(name, name);
    const company = getCompany.get(name);
    companyIdMap[name] = company.id;
  }

  // 批量插入证书
  // db.transaction: 将多条 INSERT 语句包裹在一个事务中，大幅提升写入性能
  // 没有 transaction 的话，每条 INSERT 都会触发一次磁盘写入
  const insertCert = db.prepare(`
    INSERT INTO certificates (
      cert_no, company_id, product_name, category, model, standard,
      issuer, issue_date, expiry_date, status, file_path, thumbnail_path,
      source_url, review_status
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const importResult = db.transaction(() => {
    let imported = 0;
    for (const cert of certificates) {
      try {
        insertCert.run(
          cert.certNo,
          companyIdMap[cert.companyName] || null,
          cert.productName,
          cert.category || null,
          cert.model || null,
          cert.standard || null,
          cert.issuer || null,
          cert.issueDate || null,
          cert.expiryDate || null,
          cert.status || 'active',
          cert.fileUrl || null,
          cert.thumbnailUrl || null,
          cert.sourceUrl || null,
          cert.reviewStatus || 'approved'
        );
        imported++;
      } catch (err) {
        // 跳过重复的 cert_no（UNIQUE 约束冲突）
        if (!err.message.includes('UNIQUE')) {
          console.log(`  [警告] 导入证书 ${cert.certNo} 失败: ${err.message}`);
        }
      }
    }
    return imported;
  });

  const count = importResult();
  console.log(`  [数据库] 已从 mockData 导入 ${count} 条证书数据`);
}

/**
 * 数据库初始化入口
 * 按顺序执行：建表 -> 创建默认管理员 -> 导入 mock 数据
 */
function initDatabase() {
  console.log('  [数据库] 初始化 SQLite...');
  initTables();
  migrateAdminsTable();
  initDefaultAdmin();
  importMockData();
  console.log('  [数据库] 初始化完成\n');
}

module.exports = { db, initDatabase };
