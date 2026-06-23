/**
 * 修正数据库中的 standard 字段
 *
 * 问题：数据库中 standard 为 'CE EN 1384' 或 'UKCA EN 1384'，缺少年份
 * 正确：应该是 'CE EN 1384:2023' 或 'UKCA EN 1384:2023'
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'eu-doc.db');
const db = new Database(DB_PATH);

console.log('🔧 开始修正 standard 字段...\n');

// 1. 查看当前数据
const current = db.prepare('SELECT id, cert_no, standard FROM certificate_metadata WHERE standard IS NOT NULL').all();
console.log('当前数据:');
current.forEach(row => {
  console.log(`  ID ${row.id}: ${row.cert_no} -> ${row.standard}`);
});

// 2. 更新 EN 1384 标准（补充年份）
const updateStandard = db.prepare(`
  UPDATE certificate_metadata
  SET standard = REPLACE(REPLACE(standard, 'CE EN 1384', 'CE EN 1384:2023'), 'UKCA EN 1384', 'UKCA EN 1384:2023')
  WHERE standard LIKE '%EN 1384%'
    AND standard NOT LIKE '%:202%'
`);

const result = updateStandard.run();
console.log(`\n✅ 已更新 ${result.changes} 条记录\n`);

// 3. 验证结果
const updated = db.prepare('SELECT id, cert_no, standard FROM certificate_metadata WHERE standard IS NOT NULL').all();
console.log('更新后数据:');
updated.forEach(row => {
  console.log(`  ID ${row.id}: ${row.cert_no} -> ${row.standard}`);
});

db.close();
console.log('\n✨ 完成！');
