const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');

const router = Router();

router.get('/', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    let whereClause = '';
    const params = [];

    if (status && status !== 'all') {
      if (status === 'pending') {
        whereClause = "WHERE c.verification_status = ? AND COALESCE(c.status, '') != 'draft'";
      } else {
        whereClause = 'WHERE c.verification_status = ?';
      }
      params.push(status);
    }

    const companies = db.prepare(`
      SELECT c.id as company_id, c.name as company_name, c.business_license_no, c.contact_person,
             c.contact_email, c.verification_status, c.status, c.created_at, c.updated_at
      FROM companies c
      ${whereClause}
      ORDER BY c.updated_at DESC
    `).all(...params);

    res.json({ success: true, data: companies });
  } catch (err) {
    console.error('获取认证列表失败:', err);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

module.exports = router;
