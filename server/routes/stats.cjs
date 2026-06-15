/**
 * EU-DOC 后端服务 - 数据统计路由
 * 版本: 1.0.1
 *
 * 路由:
 * - GET /overview - 总览数据（公开）
 * - GET /recent   - 最近操作日志（需认证）
 * - GET /trend    - 证书趋势数据（需认证）
 */

const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');

const router = Router();

/**
 * GET /api/stats/overview
 * 总览数据（公开接口）
 *
 * 返回:
 * - total: 证书总数
 * - active/expired/revoked: 各状态证书数
 * - companies: 企业数
 * - issuers: 发证机构数
 * - categories: 类别统计
 */
router.get('/overview', (req, res) => {
  // 证书总数和各状态数量（一条 SQL 搞定，比多次查询高效）
  const statusStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
      SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) as revoked,
      SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM certificates
  `).get();

  // 企业总数
  const { total: companyCount } = db.prepare('SELECT COUNT(*) as total FROM companies').get();

  // 发证机构数（DISTINCT 去重）
  const { total: issuerCount } = db.prepare('SELECT COUNT(DISTINCT issuer) as total FROM certificates WHERE issuer IS NOT NULL').get();

  // 类别统计
  const categories = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM certificates
    WHERE category IS NOT NULL
    GROUP BY category
    ORDER BY count DESC
  `).all();

  // 发证机构统计
  const issuers = db.prepare(`
    SELECT issuer, COUNT(*) as count
    FROM certificates
    WHERE issuer IS NOT NULL
    GROUP BY issuer
    ORDER BY count DESC
  `).all();

  // 认证标准统计
  const standards = db.prepare(`
    SELECT standard, COUNT(*) as count
    FROM certificates
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
 *
 * 查询参数:
 * - limit: 返回条数（默认 20）
 */
router.get('/recent', authMiddleware, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const logs = db.prepare(`
    SELECT al.*, a.username as admin_username
    FROM audit_logs al
    LEFT JOIN admins a ON al.admin_id = a.id
    ORDER BY al.created_at DESC
    LIMIT ?
  `).all(limit);

  res.json({ success: true, data: logs });
});

/**
 * GET /api/stats/trend
 * 证书趋势数据（需认证）
 *
 * 返回按月份统计的证书创建数量，用于图表展示
 */
router.get('/trend', authMiddleware, (req, res) => {
  // 按月份统计证书数量（最近12个月）
  const trend = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as count
    FROM certificates
    WHERE created_at >= datetime('now', '-12 months')
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month ASC
  `).all();

  res.json({ success: true, data: trend });
});

/**
 * GET /api/stats/user
 * 用户个人统计数据（需认证）
 *
 * 返回当前登录用户的证书统计：
 * - total: 用户上传的证书总数
 * - active/expired/revoked: 各状态证书数
 * - pending: 待审核证书数
 * - approved: 已通过证书数
 * - rejected: 已拒绝证书数
 * - recentUploads: 最近上传的证书列表
 */
router.get('/user', authMiddleware, (req, res) => {
  const userId = req.user.id;

  // 用户证书统计（通过 audit_logs 追踪用户上传的证书）
  // 查找该用户创建的所有证书ID
  const userCertIds = db.prepare(`
    SELECT DISTINCT target_id
    FROM audit_logs
    WHERE admin_id = ? AND action = 'create' AND target_type = 'certificate'
  `).all(userId).map(row => row.target_id);

  if (userCertIds.length === 0) {
    // 用户还没有上传过证书
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

  // 构建 IN 查询的占位符
  const placeholders = userCertIds.map(() => '?').join(',');

  // 统计用户证书的各种状态
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
      SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) as revoked,
      SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM certificates
    WHERE id IN (${placeholders})
  `).get(...userCertIds);

  // 获取最近上传的证书（最多10条）
  const recentUploads = db.prepare(`
    SELECT c.*, co.name as company_name
    FROM certificates c
    LEFT JOIN companies co ON c.company_id = co.id
    WHERE c.id IN (${placeholders})
    ORDER BY c.created_at DESC
    LIMIT 10
  `).all(...userCertIds);

  res.json({
    success: true,
    data: {
      ...stats,
      recentUploads,
    },
  });
});

module.exports = router;
