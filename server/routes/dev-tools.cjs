const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');

const router = Router();

function safeUnlink(uploadPath) {
  if (!uploadPath || typeof uploadPath !== 'string') return;
  if (!uploadPath.includes('/uploads/')) return;
  const normalized = uploadPath.replace(/^\/uploads\//, 'uploads/');
  const full = path.join(__dirname, '..', normalized);
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (error) {}
}

function hasTable(name) {
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name));
}

function deleteIfTableExists(table, userIds) {
  if (!hasTable(table) || !userIds.length) return;
  db.prepare(`DELETE FROM ${table} WHERE user_id IN (${userIds.map(() => '?').join(',')})`).run(...userIds);
}

router.delete('/flow-test-data', authMiddleware, requireAdmin, (req, res) => {
  const dryRun = String(req.query.dryRun || '0') === '1';

  const companies = db.prepare(`
    SELECT id FROM companies
    WHERE name LIKE 'EU-DOC Flow Test Company%'
       OR name LIKE 'Flow Test Company%'
       OR name_en LIKE 'EU-DOC Flow Test Company%'
  `).all();
  const companyIds = companies.map((item) => item.id);

  const users = db.prepare(`
    SELECT id FROM users
    WHERE email LIKE 'flowtest_%@example.com'
       OR display_name LIKE 'flowtest_%'
  `).all();
  const userIds = users.map((item) => item.id);

  const productIds = companyIds.length
    ? db.prepare(`SELECT id FROM products WHERE company_id IN (${companyIds.map(() => '?').join(',')})`).all(...companyIds).map((item) => item.id)
    : [];
  const documentRows = companyIds.length
    ? db.prepare(`SELECT id, file_path, thumbnail_path FROM documents WHERE company_id IN (${companyIds.map(() => '?').join(',')})`).all(...companyIds)
    : [];
  const importRows = companyIds.length && hasTable('import_items')
    ? db.prepare(`SELECT id, file_path FROM import_items WHERE company_id IN (${companyIds.map(() => '?').join(',')})`).all(...companyIds)
    : [];

  const summary = {
    companies: companyIds.length,
    users: userIds.length,
    products: productIds.length,
    documents: documentRows.length,
    imports: importRows.length,
    dryRun,
  };

  if (dryRun) return res.json({ success: true, data: summary });

  const tx = db.transaction(() => {
    for (const row of [...documentRows, ...importRows]) safeUnlink(row.file_path);
    for (const row of documentRows) safeUnlink(row.thumbnail_path);

    if (documentRows.length) {
      const docIds = documentRows.map((item) => item.id);
      const placeholders = docIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM certificate_metadata WHERE document_id IN (${placeholders})`).run(...docIds);
      db.prepare(`DELETE FROM upload_confirmations WHERE document_id IN (${placeholders})`).run(...docIds);
      db.prepare(`DELETE FROM documents WHERE id IN (${placeholders})`).run(...docIds);
    }
    if (importRows.length && hasTable('import_items')) db.prepare(`DELETE FROM import_items WHERE id IN (${importRows.map(() => '?').join(',')})`).run(...importRows.map((item) => item.id));
    if (productIds.length) db.prepare(`DELETE FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`).run(...productIds);
    if (companyIds.length) {
      const placeholders = companyIds.map(() => '?').join(',');
      if (hasTable('company_verification_documents')) {
        db.prepare(`DELETE FROM company_verification_documents WHERE company_id IN (${placeholders})`).run(...companyIds);
      }
      db.prepare(`DELETE FROM company_members WHERE company_id IN (${placeholders})`).run(...companyIds);
      db.prepare(`DELETE FROM companies WHERE id IN (${placeholders})`).run(...companyIds);
    }
    if (userIds.length) {
      const placeholders = userIds.map(() => '?').join(',');
      deleteIfTableExists('user_favorites', userIds);
      deleteIfTableExists('user_history', userIds);
      deleteIfTableExists('user_notifications', userIds);
      deleteIfTableExists('user_notification_settings', userIds);
      deleteIfTableExists('email_verifications', userIds);
      db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...userIds);
    }
  });

  tx();
  res.json({ success: true, message: '测试流程数据已清理', data: summary });
});

module.exports = router;
