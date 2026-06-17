/**
 * EU-DOC 后端服务 - 证书错误报告路由
 * 版本: 1.0.0
 *
 * 功能:
 * - 用户报告证书信息错误
 * - 管理员查看和处理错误报告
 * - 支持多种报告类型：信息错误、过期信息、重复条目
 *
 * 路由:
 * - POST   /           - 提交错误报告（公开）
 * - GET    /           - 获取报告列表（需管理员权限）
 * - GET    /:id        - 获取单个报告详情（需管理员权限）
 * - PUT    /:id/status - 更新报告状态（需管理员权限）
 * - GET    /check-duplicates/:certId - 检查重复证书（公开）
 */

const { Router } = require('express');
const { db } = require('../db.cjs');
const { requireAdmin } = require('../middleware/auth.cjs');

const router = Router();

/**
 * POST /api/reports
 * 提交证书错误报告（公开接口）
 *
 * Body:
 * - certId: 证书ID
 * - reportType: 报告类型（wrong_info/outdated_info/duplicate_entry/other）
 * - description: 详细描述
 * - reporterEmail: 报告人邮箱（可选）
 * - reporterName: 报告人姓名（可选）
 */
router.post('/', (req, res) => {
  try {
    const { certId, reportType, description, reporterEmail, reporterName } = req.body;

    // 参数验证
    if (!certId || !reportType) {
      return res.status(400).json({
        success: false,
        message: '缺少必需参数：certId 和 reportType',
      });
    }

    // 验证报告类型
    const validTypes = ['wrong_info', 'outdated_info', 'duplicate_entry', 'other'];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: '无效的报告类型',
      });
    }

    // 检查证书是否存在
    const cert = db.prepare('SELECT id FROM certificates WHERE id = ?').get(certId);
    if (!cert) {
      return res.status(404).json({
        success: false,
        message: '证书不存在',
      });
    }

    // 插入报告
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
 *
 * Query:
 * - status: 按状态筛选（pending/processing/resolved/rejected）
 * - certId: 按证书ID筛选
 * - page: 页码
 * - pageSize: 每页条数
 */
router.get('/', requireAdmin, (req, res) => {
  try {
    const { status, certId, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    // 构建查询条件
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total
      FROM certificate_reports r
      ${whereClause}
    `);
    const { total } = countStmt.get(...params);

    // 获取列表（关联证书信息）
    const listStmt = db.prepare(`
      SELECT
        r.*,
        c.cert_no,
        c.product_name,
        c.company_id,
        comp.name as company_name
      FROM certificate_reports r
      LEFT JOIN certificates c ON r.cert_id = c.id
      LEFT JOIN companies comp ON c.company_id = comp.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const reports = listStmt.all(...params, pageSize, offset);

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
router.get('/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;

    const stmt = db.prepare(`
      SELECT
        r.*,
        c.cert_no,
        c.product_name,
        c.category,
        c.model,
        c.issuer,
        c.issue_date,
        c.expiry_date,
        c.company_id,
        comp.name as company_name
      FROM certificate_reports r
      LEFT JOIN certificates c ON r.cert_id = c.id
      LEFT JOIN companies comp ON c.company_id = comp.id
      WHERE r.id = ?
    `);

    const report = stmt.get(id);

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
 *
 * Body:
 * - status: 新状态（processing/resolved/rejected）
 * - adminResponse: 管理员回复
 */
router.put('/:id/status', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;

    // 验证状态
    const validStatuses = ['pending', 'processing', 'resolved', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值',
      });
    }

    // 检查报告是否存在
    const report = db.prepare('SELECT id FROM certificate_reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: '报告不存在',
      });
    }

    // 更新状态
    const stmt = db.prepare(`
      UPDATE certificate_reports
      SET status = ?, admin_response = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(status, adminResponse || null, id);

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
 *
 * 检查逻辑：
 * 1. 相同证书编号
 * 2. 相同产品名称+型号+企业
 * 3. 相同企业+发证机构+标准
 */
router.get('/check-duplicates/:certId', (req, res) => {
  try {
    const { certId } = req.params;

    // 获取当前证书信息
    const cert = db.prepare(`
      SELECT id, cert_no, product_name, model, company_id, issuer, standard
      FROM certificates
      WHERE id = ?
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
        SELECT id, cert_no, product_name, company_id
        FROM certificates
        WHERE cert_no = ? AND id != ?
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
        SELECT id, cert_no, product_name, model
        FROM certificates
        WHERE product_name = ? AND model = ? AND company_id = ? AND id != ?
      `).all(cert.product_name, cert.model, cert.company_id, certId);

      if (sameProduct.length > 0) {
        duplicates.push({
          type: 'same_product',
          message: '发现相同产品和型号',
          certificates: sameProduct,
        });
      }
    }

    // 3. 检查相似度高的证书（同企业+同标准）
    if (cert.company_id && cert.standard) {
      const similar = db.prepare(`
        SELECT id, cert_no, product_name, model, issuer, standard
        FROM certificates
        WHERE company_id = ? AND standard = ? AND id != ?
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
