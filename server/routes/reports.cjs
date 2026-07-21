/**
 * EU-DOC 后端服务 - 证书错误报告路由
 * 版本: 2.0.0
 *
 * 功能:
 * - 用户报告证书信息错误
 * - 管理员查看和处理错误报告
 * - 支持多种报告类型：信息错误、过期信息、重复条目
 */

const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');

const router = Router();

/**
 * POST /api/reports
 * 提交证书错误报告（公开接口）
 */
router.post('/', (req, res) => {
  try {
    const { certId, reportType, description, reporterEmail, reporterName } = req.body;

    if (!certId || !reportType) {
      return res.status(400).json({
        success: false,
        message: '缺少必需参数：certId 和 reportType',
      });
    }

    const validTypes = ['wrong_info', 'outdated_info', 'duplicate_entry', 'other'];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: '无效的报告类型',
      });
    }

    // 检查证书是否存在（v2.0: 从documents表查询）
    const cert = db.prepare("SELECT id FROM documents WHERE id = ? AND document_type = 'certificate'").get(certId);
    if (!cert) {
      return res.status(404).json({
        success: false,
        message: '证书不存在',
      });
    }

    const stmt = db.prepare(`
      INSERT INTO certificate_reports (
        cert_id, report_type, description, reporter_email, reporter_name, status
      ) VALUES (?, ?, ?, ?, ?, 'pending')
    `);

    const result = stmt.run(certId, reportType, description || null, reporterEmail || null, reporterName || null);

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
    const { status, certId, search = '', reportType = '', page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('r.status = ?');
      params.push(status);
    }

    if (certId) {
      conditions.push('r.cert_id = ?');
      params.push(certId);
    }

    if (reportType) {
      conditions.push('r.report_type = ?');
      params.push(reportType);
    }

    if (search.trim()) {
      const keyword = `%${search.trim()}%`;
      conditions.push('(cm.cert_no LIKE ? OR p.name LIKE ? OR comp.name LIKE ? OR r.description LIKE ? OR r.reporter_email LIKE ?)');
      params.push(keyword, keyword, keyword, keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { total } = db.prepare(`
      SELECT COUNT(*) as total
      FROM certificate_reports r
      LEFT JOIN documents d ON r.cert_id = d.id
      LEFT JOIN certificate_metadata cm ON d.id = cm.document_id
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN companies comp ON d.company_id = comp.id
      ${whereClause}
    `).get(...params);

    // v2.0: 从documents+certificate_metadata+products查询
    const reports = db.prepare(`
      SELECT
        r.*,
        cm.cert_no,
        p.name as product_name,
        d.company_id,
        comp.name as company_name
      FROM certificate_reports r
      LEFT JOIN documents d ON r.cert_id = d.id
      LEFT JOIN certificate_metadata cm ON d.id = cm.document_id
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN companies comp ON d.company_id = comp.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
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
        cm.cert_no,
        p.name as product_name,
        p.model,
        cm.issuer,
        cm.issue_date,
        cm.expiry_date,
        d.company_id,
        comp.name as company_name
      FROM certificate_reports r
      LEFT JOIN documents d ON r.cert_id = d.id
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
      data: report,
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
