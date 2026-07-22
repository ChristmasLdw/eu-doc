const Database = require('better-sqlite3');
const db = new Database('./server/database.db', { readonly: true });

const docs = db.prepare('SELECT id, title, document_type FROM documents ORDER BY id').all();

console.log('总文档数:', docs.length);
console.log('\n按类型统计:');
const typeCount = {};
docs.forEach(doc => {
  typeCount[doc.document_type] = (typeCount[doc.document_type] || 0) + 1;
});
console.log(typeCount);

console.log('\n标题中包含关键词的文档:');
const keywords = {
  'DoC': [],
  'Declaration': [],
  'Manual': [],
  'Certificate': []
};

docs.forEach(doc => {
  if (/\bDoC\b/i.test(doc.title)) keywords['DoC'].push(doc.id);
  if (/Declaration of Conformity/i.test(doc.title)) keywords['Declaration'].push(doc.id);
  if (/Manual|说明书/i.test(doc.title)) keywords['Manual'].push(doc.id);
  if (/Certificate|证书/i.test(doc.title) && !/DoC|Declaration/i.test(doc.title)) keywords['Certificate'].push(doc.id);
});

Object.entries(keywords).forEach(([key, ids]) => {
  console.log(`${key}: ${ids.length} 个`);
});

console.log('\n前20条文档标题示例:');
docs.slice(0, 20).forEach(doc => {
  console.log(`${doc.id}: [${doc.document_type}] ${doc.title}`);
});

db.close();
