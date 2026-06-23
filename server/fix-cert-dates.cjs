/**
 * 修正证书日期
 *
 * 问题：数据库中的日期与证书文件中的实际日期不一致
 * 证书 20_100_52_6160 文件中显示：
 *   Valid From: 2026-01-28
 *   Valid Until: 2031-01-27
 *
 * 数据库中错误显示：
 *   issue_date: 2025-05-05
 *   expiry_date: 2028-05-04
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'eu-doc.db');
const db = new Database(DB_PATH);

console.log('🔧 开始修正证书日期...\n');

// 1. 查看当前数据
const current = db.prepare(`
  SELECT cert_no, issue_date, expiry_date
  FROM certificate_metadata
  WHERE cert_no = '20_100_52_6160'
`).get();

console.log('修正前:');
console.log(`  证书编号: ${current.cert_no}`);
console.log(`  发证日期: ${current.issue_date}`);
console.log(`  到期日期: ${current.expiry_date}`);

// 2. 更新为正确的日期
const updateDate = db.prepare(`
  UPDATE certificate_metadata
  SET issue_date = ?,
      expiry_date = ?
  WHERE cert_no = ?
`);

updateDate.run('2026-01-28', '2031-01-27', '20_100_52_6160');

// 3. 验证结果
const updated = db.prepare(`
  SELECT cert_no, issue_date, expiry_date
  FROM certificate_metadata
  WHERE cert_no = '20_100_52_6160'
`).get();

console.log('\n修正后:');
console.log(`  证书编号: ${updated.cert_no}`);
console.log(`  发证日期: ${updated.issue_date}`);
console.log(`  到期日期: ${updated.expiry_date}`);

// 4. 同时修正 mockData.js
console.log('\n📝 请手动修改 mockData.js:');
console.log('  在 src/data/mockData.js 中找到 certNo: \'20_100_52_6160\'');
console.log('  将 issueDate 改为: \'2026-01-28\'');
console.log('  将 expiryDate 改为: \'2031-01-27\'');

db.close();
console.log('\n✨ 数据库修正完成！');
