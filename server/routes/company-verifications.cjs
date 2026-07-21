const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');

const router = Router();

router.get('/', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    let whereClause = '';
    const params = [];
    if (status && status !== 'all') {
      whereClause = status === 'pending'
        ? "WHERE c.verification_status = ? AND COALESCE(c.status, '') != 'draft'"
        : 'WHERE c.verification_status = ?';
      params.push(status);
    }
    const companies = db.prepare(`
      SELECT c.id as company_id, c.name as company_name, c.business_license_no, c.contact_person,
             c.contact_email, c.verification_status, c.status, c.created_at, c.updated_at,
             COUNT(vd.id) AS verification_document_count
      FROM companies c
      LEFT JOIN company_verification_documents vd ON vd.company_id = c.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `).all(...params);
    res.json({ success: true, data: companies });
  } catch (err) {
    console.error('获取认证列表失败:', err);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.get('/:companyId/documents', authMiddleware, requireAdmin, (req, res) => {
  const company = db.prepare('SELECT id, name FROM companies WHERE id = ?').get(req.params.companyId);
  if (!company) return res.status(404).json({ success: false, message: '企业不存在' });
  const documents = db.prepare(`
    SELECT vd.id, vd.company_id, vd.document_type, vd.file_path, vd.file_size, vd.review_status,
           vd.created_at, u.display_name AS uploaded_by_name
    FROM company_verification_documents vd
    LEFT JOIN users u ON u.id = vd.uploaded_by
    WHERE vd.company_id = ? ORDER BY vd.created_at DESC
  `).all(company.id);
  res.json({ success: true, data: { company, documents } });
});

router.get('/documents/:id/file', authMiddleware, requireAdmin, (req, res) => {
  const document = db.prepare('SELECT id, file_path FROM company_verification_documents WHERE id = ?').get(req.params.id);
  if (!document) return res.status(404).json({ success: false, message: '认证材料不存在' });
  const filename = path.basename(document.file_path || '');
  const fullPath = path.join(__dirname, '../public/logos', filename);
  if (!filename || !fs.existsSync(fullPath)) return res.status(404).json({ success: false, message: '认证材料文件不存在' });
  return res.sendFile(fullPath);
});

module.exports = router;
