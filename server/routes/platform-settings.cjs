const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');

const router = Router();
const DEFAULTS = {
  announcement: '',
  contactEmail: '327114305@qq.com',
  helpUrl: '',
  onboardingContact: '327114305@qq.com / 18069839326',
  maintenanceMessage: '',
  termsUrl: '/terms',
  privacyUrl: '/privacy',
  disclaimerUrl: '/disclaimer',
  enterpriseAgreementUrl: '/enterprise-agreement',
  contactUrl: '/contact',
};

function ensureTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

router.get('/', authMiddleware, requireAdmin, (_req, res) => {
  ensureTable();
  const settings = { ...DEFAULTS };
  db.prepare('SELECT key, value FROM platform_settings').all().forEach((row) => {
    if (Object.prototype.hasOwnProperty.call(settings, row.key)) settings[row.key] = row.value || '';
  });
  res.json({ success: true, data: settings });
});

router.put('/', authMiddleware, requireAdmin, (req, res) => {
  ensureTable();
  const entries = Object.entries(req.body || {}).filter(([key]) => Object.prototype.hasOwnProperty.call(DEFAULTS, key));
  if (!entries.length) return res.status(400).json({ success: false, message: '没有需要保存的设置' });
  const upsert = db.prepare(`
    INSERT INTO platform_settings (key, value, updated_by, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP
  `);
  const save = db.transaction(() => entries.forEach(([key, value]) => upsert.run(key, String(value || '').trim(), req.admin.id)));
  save();
  db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, detail, ip_address) VALUES (?, ?, ?, ?, ?)')
    .run(req.admin.id, 'update_platform_settings', 'platform_settings', JSON.stringify(Object.fromEntries(entries)), req.ip);
  res.json({ success: true, message: '平台设置已保存' });
});

module.exports = router;
