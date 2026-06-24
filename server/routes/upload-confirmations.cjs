/**
 * EU-DOC v2.0 - 上传确认记录管理 API
 */

const { Router } = require('express');
const { db } = require('../db.cjs');
const { authMiddleware, requireAdmin } = require('../middleware/auth.cjs');

const router = Router();

/**
 * GET /api/v2/upload-confirmations
 * 获取上传确认记录列表（仅管理员）
 */
router.get('/', authMiddleware, requireAdmin, (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      search,
      documentId,
      userId,
      companyId,
    } = req.query;

    // 构建 WHERE 条件
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(d.title LIKE ? OR u.email LIKE ? OR u.display_name LIKE ? OR c.name LIKE ?)');
      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword, keyword);
    }

    if (documentId) {
      conditions.push('uc.document_id = ?');
      params.push(Number(documentId));
    }

    if (userId) {
      conditions.push('uc.user_id = ?');
      params.push(Number(userId));
    }

    if (companyId) {
      conditions.push('uc.company_id = ?');
      params.push(Number(companyId));
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // 查询总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM upload_confirmations uc
      LEFT JOIN documents d ON uc.document_id = d.id
      LEFT JOIN users u ON uc.user_id = u.id
      LEFT JOIN companies c ON uc.company_id = c.id
      ${whereClause}
    `;
    const { total } = db.prepare(countSql).get(...params);

    // 查询数据
    const offset = (Number(page) - 1) * Number(pageSize);
    const dataSql = `
      SELECT
        uc.*,
        d.title as document_title,
        d.document_type,
        u.email as user_email,
        u.display_name as user_display_name,
        c.name as company_name
      FROM upload_confirmations uc
      LEFT JOIN documents d ON uc.document_id = d.id
      LEFT JOIN users u ON uc.user_id = u.id
      LEFT JOIN companies c ON uc.company_id = c.id
      ${whereClause}
      ORDER BY uc.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const confirmations = db.prepare(dataSql).all(...params, Number(pageSize), offset);

    res.json({
      success: true,
      data: confirmations,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    });
  } catch (error) {
    console.error('[错误] GET /api/v2/upload-confirmations:', error);
    res.status(500).json({
      success: false,
      message: '查询上传确认记录失败: ' + error.message,
    });
  }
});

/**
 * GET /api/v2/upload-confirmations/:id
 * 获取单条上传确认记录详情（仅管理员）
 */
router.get('/:id', authMiddleware, requireAdmin, (req, res) => {
  try {
    const confirmation = db.prepare(`
      SELECT
        uc.*,
        d.title as document_title,
        d.document_type,
        d.file_path,
        u.email as user_email,
        u.display_name as user_display_name,
        c.name as company_name
      FROM upload_confirmations uc
      LEFT JOIN documents d ON uc.document_id = d.id
      LEFT JOIN users u ON uc.user_id = u.id
      LEFT JOIN companies c ON uc.company_id = c.id
      WHERE uc.id = ?
    `).get(req.params.id);

    if (!confirmation) {
      return res.status(404).json({
        success: false,
        message: '上传确认记录不存在',
      });
    }

    res.json({ success: true, data: confirmation });
  } catch (error) {
    console.error('[错误] GET /api/v2/upload-confirmations/:id:', error);
    res.status(500).json({
      success: false,
      message: '查询上传确认记录失败: ' + error.message,
    });
  }
});

module.exports = router;
