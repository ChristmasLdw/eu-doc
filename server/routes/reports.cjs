/**
 * EU-DOC 后端服务 - 公开资料问题报告路由
 *
 * 功能:
 * - 用户报告公开资料问题
 * - 管理员查看和处理问题报告
 * - 兼容旧版 certId 与 certificate_reports 数据
 */

const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');
const { buildDocumentDisplayTitle } = require('../utils/documentTitles.cjs');

const router = Router();
const REPORT_TYPES = new Set([
  'wrong_info',
  'outdated_info',
  'duplicate_entry',
  'product_mismatch',
  'file_unavailable',
  'other',
]);

function optionalText(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function reportDocumentTitle(report) {
  if (!report.document_id) return null;
  return buildDocumentDisplayTitle(report, 'zh');
}

/**
 * POST /api/reports
 * 提交公开资料问题报告（公开接口）
 */
router.post('/', (req, res) => {
  try {
    const { documentId, certId, reportType } = req.body || {};
    const targetId = Number(documentId ?? certId);
    const description = optionalText(req.body?.description);
    const reporterEmail = optionalText(req.body?.reporterEmail).toLowerCase();
    const reporterName = optionalText(req.body?.reporterName);

    if (!Number.isInteger(targetId) || targetId <= 0 || !reportType) {
      return res.status(400).json({
        success: false,
        message: '缺少必需参数：documentId 和 reportType',
      });
    }

    if (!REPORT_TYPES.has(reportType)) {
      return res.status(400).json({
        success: false,
        message: '无效的报告类型',
      });
    }

    if (description.length > 2000 || reporterName.length > 80 || reporterEmail.length > 254) {
      return res.status(400).json({ success: false, message: '提交内容超过长度限制' });
    }
    if (reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail)) {
      return res.status(400).json({ success: false, message: '邮箱格式不正确' });
    }

    const document = db.prepare(`
      SELECT d.id
      FROM documents d
      JOIN companies c ON c.id = d.company_id
      WHERE d.id = ?
        AND d.status = 'active'
        AND d.review_status = 'approved'
        AND c.verification_status = 'verified'
        AND COALESCE(c.public_visible, 1) = 1
    `).get(targetId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: '资料不存在或暂未公开',
      });
    }

    const stmt = db.prepare(`
      INSERT INTO certificate_reports (
        cert_id, document_id, report_type, description, reporter_email, reporter_name, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `);

    const result = stmt.run(targetId, targetId, reportType, description || null, reporterEmail || null, reporterName || null);

    res.json({
      success: true,
      message: '感谢您的反馈，我们会尽快处理',
      data: { id: result.lastInsertRowid },
    });
  } catch (error) {
    console.error('提交报告失败:', error);
    res.status(500).json({
      success: false,
      message: '提交失败，请稍后重试',
    });
  }
});

/**
 * GET /api/reports
 * 获取报告列表（管理员）
 */
router.get('/', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { status, certId, documentId, search = '', reportType = '' } = req.query;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('r.status = ?');
      params.push(status);
    }

    const requestedTargetId = documentId || certId;
    if (requestedTargetId) {
      const targetId = Number(requestedTargetId);
      if (!Number.isInteger(targetId) || targetId <= 0) {
        return res.status(400).json({ success: false, message: '资料 ID 无效' });
      }
      conditions.push('COALESCE(r.document_id, r.cert_id) = ?');
      params.push(targetId);
    }

    if (reportType) {
      conditions.push('r.report_type = ?');
      params.push(reportType);
    }

    if (search.trim()) {
      const keyword = `%${search.trim()}%`;
      conditions.push('(cm.cert_no LIKE ? OR d.public_title LIKE ? OR p.name LIKE ? OR p.model LIKE ? OR comp.name LIKE ? OR r.description LIKE ? OR r.reporter_email LIKE ?)');
      params.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { total } = db.prepare(`
      SELECT COUNT(*) as total
      FROM certificate_reports r
      LEFT JOIN documents d ON COALESCE(r.document_id, r.cert_id) = d.id
      LEFT JOIN certificate_metadata cm ON d.id = cm.document_id
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN companies comp ON d.company_id = comp.id
      ${whereClause}
    `).get(...params);

    const reports = db.prepare(`
      SELECT
        r.*,
        COALESCE(r.document_id, r.cert_id) AS document_id,
        d.public_title,
        d.document_type,
        cm.cert_no,
        p.name as product_name,
        p.model as product_model,
        d.company_id,
        comp.name as company_name
      FROM certificate_reports r
      LEFT JOIN documents d ON COALESCE(r.document_id, r.cert_id) = d.id
      LEFT JOIN certificate_metadata cm ON d.id = cm.document_id
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN companies comp ON d.company_id = comp.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset).map((report) => ({
      ...report,
      document_title: reportDocumentTitle(report),
    }));

    res.json({
      success: true,
      data: reports,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('获取报告列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取报告列表失败',
    });
  }
});

/**
 * GET /api/reports/:id
 * 获取单个报告详情（管理员）
 */
router.get('/:id', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;

    const report = db.prepare(`
      SELECT
        r.*,
        COALESCE(r.document_id, r.cert_id) AS document_id,
        d.public_title,
        d.document_type,
        cm.cert_no,
        p.name as product_name,
        p.model as product_model,
        cm.issuer,
        cm.issue_date,
        cm.expiry_date,
        d.company_id,
        comp.name as company_name
      FROM certificate_reports r
      LEFT JOIN documents d ON COALESCE(r.document_id, r.cert_id) = d.id
      LEFT JOIN certificate_metadata cm ON d.id = cm.document_id
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN companies comp ON d.company_id = comp.id
      WHERE r.id = ?
    `).get(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: '报告不存在',
      });
    }

    res.json({
      success: true,
      data: { ...report, document_title: reportDocumentTitle(report) },
    });
  } catch (error) {
    console.error('获取报告详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取报告详情失败',
    });
  }
});

/**
 * PUT /api/reports/:id/status
 * 更新报告状态（管理员）
 */
router.put('/:id/status', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;

    const validStatuses = ['pending', 'processing', 'resolved', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值',
      });
    }

    const report = db.prepare('SELECT id, status, admin_response FROM certificate_reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: '报告不存在',
      });
    }

    db.prepare(`
      UPDATE certificate_reports
      SET status = ?, admin_response = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, adminResponse || null, id);

    db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.admin.id, 'update_report_status', 'report', id, JSON.stringify({ oldStatus: report.status, status, adminResponse: adminResponse || null }), req.ip);

    res.json({
      success: true,
      message: '状态更新成功',
    });
  } catch (error) {
    console.error('更新报告状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新失败',
    });
  }
});

/**
 * GET /api/reports/check-duplicates/:certId
 * 检查重复证书（公开接口）
 */
router.get('/check-duplicates/:certId', (req, res) => {
  try {
    const { certId } = req.params;

    // v2.0: 从documents+certificate_metadata+products查询
    const cert = db.prepare(`
      SELECT d.id, cm.cert_no, p.name as product_name, p.model, d.company_id, cm.issuer, cm.standard
      FROM documents d
      LEFT JOIN certificate_metadata cm ON d.id = cm.document_id
      LEFT JOIN products p ON d.product_id = p.id
      WHERE d.id = ? AND d.document_type = 'certificate'
    `).get(certId);

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: '证书不存在',
      });
    }

    const duplicates = [];

    // 1. 检查相同证书编号（排除自己）
    if (cert.cert_no) {
      const sameCertNo = db.prepare(`
        SELECT d.id, cm.cert_no, p.name as product_name, d.company_id
        FROM documents d
        LEFT JOIN certificate_metadata cm ON d.id = cm.document_id
        LEFT JOIN products p ON d.product_id = p.id
        WHERE cm.cert_no = ? AND d.id != ?
      `).all(cert.cert_no, certId);

      if (sameCertNo.length > 0) {
        duplicates.push({
          type: 'same_cert_no',
          message: '发现相同证书编号',
          certificates: sameCertNo,
        });
      }
    }

    // 2. 检查相同产品+型号+企业
    if (cert.product_name && cert.model && cert.company_id) {
      const sameProduct = db.prepare(`
        SELECT d.id, cm.cert_no, p.name as product_name, p.model
        FROM documents d
        LEFT JOIN certificate_metadata cm ON d.id = cm.document_id
        LEFT JOIN products p ON d.product_id = p.id
        WHERE p.name = ? AND p.model = ? AND d.company_id = ? AND d.id != ?
      `).all(cert.product_name, cert.model, cert.company_id, certId);

      if (sameProduct.length > 0) {
        duplicates.push({
          type: 'same_product',
          message: '发现相同产品和型号',
          certificates: sameProduct,
        });
      }
    }

    // 3. 检查同企业+同标准
    if (cert.company_id && cert.standard) {
      const similar = db.prepare(`
        SELECT d.id, cm.cert_no, p.name as product_name, p.model, cm.issuer, cm.standard
        FROM documents d
        LEFT JOIN certificate_metadata cm ON d.id = cm.document_id
        LEFT JOIN products p ON d.product_id = p.id
        WHERE d.company_id = ? AND cm.standard = ? AND d.id != ?
        LIMIT 5
      `).all(cert.company_id, cert.standard, certId);

      if (similar.length > 0) {
        duplicates.push({
          type: 'similar',
          message: '同企业同标准的其他证书',
          certificates: similar,
        });
      }
    }

    res.json({
      success: true,
      data: {
        hasDuplicates: duplicates.length > 0,
        duplicates,
      },
    });
  } catch (error) {
    console.error('检查重复证书失败:', error);
    res.status(500).json({
      success: false,
      message: '检查失败',
    });
  }
});

module.exports = router;
