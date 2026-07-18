/**
 * EU-DOC 后端服务 - SQLite 数据库初始化模块
 * 版本: 2.0.0
 *
 * 变更记录 (2.0.0):
 * - 检测数据库版本，v2.0 不再执行旧的初始化逻辑
 * - v2.0 使用新的表结构：documents + certificate_metadata + products
 *
 * 变更记录 (1.0.2):
 * - admins 表新增 role 字段（admin/user），支持普通用户注册
 * - admins 表新增 company_name 字段，用户可关联企业
 * - 新增数据迁移逻辑：为现有数据添加默认 role='admin'
 *
 * 职责:
 * - 创建 SQLite 数据库连接（better-sqlite3 同步 API）
 * - 初始化所有数据表（v1.x: admins, companies, certificates; v2.0: users, documents, products）
 * - 从前端 mockData.js 导入现有证书数据（仅 v1.x）
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
const DB_PATH = process.env.EU_DOC_DB_PATH || path.join(__dirname, 'data', 'eu-doc.db');

// 确保 data 目录存在
const dataDir = path.dirname(DB_PATH);
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

    -- 证书错误报告表
    CREATE TABLE IF NOT EXISTS certificate_reports (
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
 * 按顺序执行：检测版本 -> 建表 -> 创建默认管理员 -> 导入 mock 数据（仅 v1.x）
 */
function initDatabase() {
  console.log('  [数据库] 初始化 SQLite...');

  // 检测数据库版本
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const tableNames = tables.map(t => t.name);

  // 如果存在 documents 和 certificate_metadata 表，说明是 v2.0
  const isV2 = tableNames.includes('documents') && tableNames.includes('certificate_metadata');

  if (isV2) {
    console.log('  [数据库] 检测到 v2.0 数据结构，检查是否需要升级');

    // 检查并创建新表
    const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);

    // 企业成员表
    if (!existingTables.includes('company_members')) {
      db.exec(`
        CREATE TABLE company_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          company_id INTEGER NOT NULL,
          role TEXT NOT NULL DEFAULT 'viewer',
          status TEXT DEFAULT 'active',
          invited_by INTEGER,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (company_id) REFERENCES companies(id)
        );
        CREATE INDEX idx_company_members_user ON company_members(user_id);
        CREATE INDEX idx_company_members_company ON company_members(company_id);
      `);
      console.log('  [数据库] 创建 company_members 表');
    }

    // 上传确认记录表
    if (!existingTables.includes('upload_confirmations')) {
      db.exec(`
        CREATE TABLE upload_confirmations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          company_id INTEGER NOT NULL,
          confirmed_authentic INTEGER DEFAULT 0,
          confirmed_authorized INTEGER DEFAULT 0,
          accepted_disclaimer INTEGER DEFAULT 0,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE INDEX idx_upload_confirmations_doc ON upload_confirmations(document_id);
      `);
      console.log('  [数据库] 创建 upload_confirmations 表');
    }

    // 邮件验证令牌表
    if (!existingTables.includes('email_verifications')) {
      db.exec(`
        CREATE TABLE email_verifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          email TEXT NOT NULL,
          token TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'verify',
          expires_at DATETIME NOT NULL,
          used INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE INDEX idx_email_verifications_token ON email_verifications(token);
      `);
      console.log('  [数据库] 创建 email_verifications 表');
    }

    // 文档缩略图字段：产品详情页优先展示缩略图，避免直接加载 PDF 导致部分浏览器自动下载。
    const documentColumns = db.prepare('PRAGMA table_info(documents)').all().map(col => col.name);
    if (!documentColumns.includes('thumbnail_path')) {
      db.prepare('ALTER TABLE documents ADD COLUMN thumbnail_path TEXT').run();
      console.log('  [数据库] documents 表已添加 thumbnail_path 字段');
    }

    // v2.0: 只检查是否需要创建默认用户
    const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
    if (userCount.cnt === 0) {
      const hash = bcrypt.hashSync('admin123', 10);
      db.prepare('INSERT INTO users (email, password_hash, display_name, platform_role, status, email_verified) VALUES (?, ?, ?, ?, ?, ?)')
        .run('admin@local', hash, 'admin', 'platform_admin', 'active', 1);
      console.log('\x1b[33m%s\x1b[0m', '  [安全提示] 默认管理员已创建: admin@local / admin123');
      console.log('\x1b[33m%s\x1b[0m', '  [安全提示] 请首次登录后立即修改密码！\n');
    }

    // 确保 admins_legacy 的用户也迁移到 users 表
    const adminsLegacy = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='admins_legacy'").get();
    if (adminsLegacy) {
      const legacyUsers = db.prepare('SELECT * FROM admins_legacy').all();
      const insertUser = db.prepare(`
        INSERT OR IGNORE INTO users (email, password_hash, display_name, platform_role, status, email_verified)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const u of legacyUsers) {
        const role = u.role === 'admin' ? 'platform_admin' : 'user';
        insertUser.run(`${u.username}@legacy.local`, u.password_hash, u.username, role, 'active', 1);
      }
    }

    // 确保 admins 兼容视图始终使用 v2.0 用户表字段；如果旧库里 admins 是真实表则保留。
    const adminsObject = db.prepare("SELECT type FROM sqlite_master WHERE name = 'admins'").get();
    if (!adminsObject || adminsObject.type === 'view') {
      db.exec(`
        DROP VIEW IF EXISTS admins;
        CREATE VIEW admins AS
          SELECT id, email as username, password_hash,
            CASE WHEN platform_role = 'platform_admin' THEN 'admin' ELSE 'user' END as role,
            display_name as company_name, created_at
          FROM users
      `);
    }

    console.log('  [数据库] v2.0 升级完成\n');
    return;
  }

  // v1.x 初始化逻辑
  console.log('  [数据库] 检测到 v1.x 数据结构，执行旧版本初始化');
  initTables();
  migrateAdminsTable();
  initDefaultAdmin();
  importMockData();
  console.log('  [数据库] 初始化完成\n');
}

module.exports = { db, initDatabase };
