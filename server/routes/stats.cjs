/**
 * EU-DOC 后端服务 - 数据统计路由
 * 版本: 2.0.0
 *
 * 路由:
 * - GET /overview - 总览数据（公开）
 * - GET /recent   - 最近操作日志（需认证）
 * - GET /trend    - 证书趋势数据（需认证）
 */

const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');

const router = Router();

/**
 * GET /api/stats/overview
 * 总览数据（公开接口）
 */
router.get('/overview', (req, res) => {
  // 证书总数和各状态数量
  const statusStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN d.status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN d.status = 'expired' THEN 1 ELSE 0 END) as expired,
      SUM(CASE WHEN d.status = 'revoked' THEN 1 ELSE 0 END) as revoked,
      SUM(CASE WHEN d.review_status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM documents d
    WHERE d.document_type = 'certificate'
  `).get();

  // 企业总数
  const { total: companyCount } = db.prepare('SELECT COUNT(*) as total FROM companies').get();

  // 发证机构数
  const { total: issuerCount } = db.prepare('SELECT COUNT(DISTINCT issuer) as total FROM certificate_metadata WHERE issuer IS NOT NULL').get();

  // 类别统计
  const categories = db.prepare(`
    SELECT p.name as category, COUNT(*) as count
    FROM documents d
    LEFT JOIN products p ON d.product_id = p.id
    WHERE d.document_type = 'certificate' AND p.name IS NOT NULL
    GROUP BY p.name
    ORDER BY count DESC
  `).all();

  // 发证机构统计
  const issuers = db.prepare(`
    SELECT issuer, COUNT(*) as count
    FROM certificate_metadata
    WHERE issuer IS NOT NULL
    GROUP BY issuer
    ORDER BY count DESC
  `).all();

  // 认证标准统计
  const standards = db.prepare(`
    SELECT standard, COUNT(*) as count
    FROM certificate_metadata
    WHERE standard IS NOT NULL
    GROUP BY standard
    ORDER BY count DESC
  `).all();

  res.json({
    success: true,
    data: {
      ...statusStats,
      companies: companyCount,
      issuers: issuerCount,
      categories,
      issuersList: issuers,
      standards,
    },
  });
});

/**
 * GET /api/stats/recent
 * 最近操作日志（需认证）
 */
router.get('/recent', authMiddleware, requireAdmin, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const companyId = Number(req.query.companyId) || null;

  const logs = db.prepare(`
    SELECT * FROM (
      SELECT
        al.id,
        al.action,
        al.target_type,
        al.target_id,
        al.detail,
        al.created_at,
        COALESCE(u.display_name, u.email, '未知用户') AS actor_name,
        u.email AS actor_email,
        CASE
          WHEN al.target_type = 'company' THEN al.target_id
          WHEN al.target_type = 'product' THEN (SELECT company_id FROM products WHERE id = al.target_id)
          WHEN al.target_type IN ('document', 'certificate') THEN (SELECT company_id FROM documents WHERE id = al.target_id)
          ELSE NULL
        END AS company_id,
        CASE
          WHEN al.target_type = 'company' THEN (SELECT name FROM companies WHERE id = al.target_id)
          WHEN al.target_type = 'product' THEN (SELECT c.name FROM products p JOIN companies c ON c.id = p.company_id WHERE p.id = al.target_id)
          WHEN al.target_type IN ('document', 'certificate') THEN (SELECT c.name FROM documents d JOIN companies c ON c.id = d.company_id WHERE d.id = al.target_id)
          ELSE NULL
        END AS company_name,
        CASE
          WHEN al.target_type = 'company' THEN (SELECT name FROM companies WHERE id = al.target_id)
          WHEN al.target_type = 'product' THEN (SELECT name FROM products WHERE id = al.target_id)
          WHEN al.target_type IN ('document', 'certificate') THEN (SELECT title FROM documents WHERE id = al.target_id)
          ELSE NULL
        END AS target_name
      FROM audit_logs al
      LEFT JOIN users u ON al.admin_id = u.id
    ) scoped_logs
    WHERE (? IS NULL OR company_id = ?)
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(companyId, companyId, limit);

  res.json({ success: true, data: logs });
});

/**
 * GET /api/stats/trend
 * 证书趋势数据（需认证）
 */
router.get('/trend', authMiddleware, (req, res) => {
  const trend = db.prepare(`
    SELECT
      strftime('%Y-%m', d.created_at) as month,
      COUNT(*) as count
    FROM documents d
    WHERE d.document_type = 'certificate'
      AND d.created_at >= datetime('now', '-12 months')
    GROUP BY strftime('%Y-%m', d.created_at)
    ORDER BY month ASC
  `).all();

  res.json({ success: true, data: trend });
});

/**
 * GET /api/stats/user
 * 用户个人统计数据（需认证）
 */
router.get('/user', authMiddleware, (req, res) => {
  const userId = req.admin.id;

  // 查找该用户创建的所有文档ID
  const userDocIds = db.prepare(`
    SELECT DISTINCT target_id
    FROM audit_logs
    WHERE admin_id = ? AND action = 'create' AND target_type = 'certificate'
  `).all(userId).map(row => row.target_id);

  if (userDocIds.length === 0) {
    return res.json({
      success: true,
      data: {
        total: 0,
        active: 0,
        expired: 0,
        revoked: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        recentUploads: [],
      },
    });
  }

  const placeholders = userDocIds.map(() => '?').join(',');

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
      SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) as revoked,
      SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM documents
    WHERE id IN (${placeholders}) AND document_type = 'certificate'
  `).get(...userDocIds);

  const recentUploads = db.prepare(`
    SELECT d.*, co.name as company_name
    FROM documents d
    LEFT JOIN companies co ON d.company_id = co.id
    WHERE d.id IN (${placeholders}) AND d.document_type = 'certificate'
    ORDER BY d.created_at DESC
    LIMIT 10
  `).all(...userDocIds);

  res.json({
    success: true,
    data: {
      ...stats,
      recentUploads,
    },
  });
});

module.exports = router;
