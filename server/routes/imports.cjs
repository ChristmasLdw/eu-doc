const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const { assertUnverifiedCompanyUploadAllowed, removeUploadedFiles, UNVERIFIED_COMPANY_MAX_FILE_SIZE, documentFileFilter } = require('../utils/uploadLimits.cjs');
const { suggestProductClassification } = require('../utils/classificationRules.cjs');

const router = Router();

function ensureImportTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS import_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      guessed_type TEXT DEFAULT 'other',
      guessed_language TEXT DEFAULT 'en',
      guessed_model TEXT,
      guessed_models TEXT,
      suggested_product_name TEXT,
      guessed_cert_no TEXT,
      guessed_standard TEXT,
      guessed_issuer TEXT,
      guessed_valid_until TEXT,
      extracted_text_status TEXT DEFAULT 'filename_only',
      status TEXT DEFAULT 'pending',
      product_id INTEGER,
      document_id INTEGER,
      uploaded_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_import_items_company ON import_items(company_id);
    CREATE INDEX IF NOT EXISTS idx_import_items_status ON import_items(status);
    CREATE TABLE IF NOT EXISTS product_compliance_categories (
      product_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (product_id, category_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
  `);
  const columns = db.prepare('PRAGMA table_info(import_items)').all().map(col => col.name);
  if (!columns.includes('guessed_models')) db.prepare('ALTER TABLE import_items ADD COLUMN guessed_models TEXT').run();
  if (!columns.includes('suggested_product_name')) db.prepare('ALTER TABLE import_items ADD COLUMN suggested_product_name TEXT').run();
  if (!columns.includes('guessed_standard')) db.prepare('ALTER TABLE import_items ADD COLUMN guessed_standard TEXT').run();
  if (!columns.includes('guessed_issuer')) db.prepare('ALTER TABLE import_items ADD COLUMN guessed_issuer TEXT').run();
  if (!columns.includes('guessed_valid_until')) db.prepare('ALTER TABLE import_items ADD COLUMN guessed_valid_until TEXT').run();
  if (!columns.includes('extracted_text_status')) db.prepare("ALTER TABLE import_items ADD COLUMN extracted_text_status TEXT DEFAULT 'filename_only'").run();
}

function importReviewStatus(req) {
  return ['admin', 'platform_admin'].includes(req.admin?.role) ? 'approved' : 'pending';
}

function canManageCompany(user, companyId) {
  if (user.role === 'platform_admin' || user.role === 'admin') return true;
  const membership = db.prepare(`
    SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND status = 'active'
  `).get(user.id, companyId);
  return membership && ['owner', 'admin', 'uploader', 'applicant'].includes(membership.role);
}

function recordImportAudit({ adminId, action, targetType, targetId, detail, ipAddress }) {
  db.prepare(`
    INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(adminId, action, targetType, targetId, JSON.stringify(detail), ipAddress);
}

function normalizeModelList(value) {
  return String(value || '')
    .split(/[,，、;；\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isModelListProductName(name, modelText) {
  const nameModels = normalizeModelList(name);
  const normalizedName = nameModels.join('|').toUpperCase();
  const normalizedModels = normalizeModelList(modelText).join('|').toUpperCase();
  const modelLikeCount = nameModels.filter((item) => /\d/.test(item) && /^[A-Z0-9._/+-]+$/i.test(item)).length;
  return nameModels.length >= 2 && (normalizedName === normalizedModels || modelLikeCount === nameModels.length);
}


function cleanExtractedText(text) {
  return String(text || '')
    .replace(/\\[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000);
}

function extractPdfText(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const raw = buffer.toString('latin1');
    const chunks = [];
    for (const match of raw.matchAll(/\(([^()]{2,300})\)\s*Tj/g)) chunks.push(match[1]);
    for (const match of raw.matchAll(/\(([^()]{2,300})\)/g)) chunks.push(match[1]);
    const text = cleanExtractedText(chunks.join(' '));
    return text.length > 20 ? text : '';
  } catch (error) {
    return '';
  }
}

function pickByRules(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return (match[1] || match[0]).trim().replace(/[,:;，。]+$/, '');
  }
  return null;
}

function enhanceGuessWithText(guess, text) {
  if (!text) return { ...guess, extracted_text_status: 'filename_only' };
  const normalized = text.replace(/\s+/g, ' ');
  const standards = [...new Set((normalized.match(/(?:CE\s*)?EN\s*\d{3,5}(?::\d{4})?/gi) || []).map((item) => item.replace(/\s+/g, ' ').toUpperCase()))];
  const models = [...new Set([...(guess.guessed_models ? guess.guessed_models.split(/[,，]/) : []), ...((normalized.match(/F\d{2}[A-Z0-9-]*/gi) || []))].map((item) => item.trim().toUpperCase()).filter(Boolean))];
  const certNo = guess.guessed_cert_no || pickByRules(normalized, [/(?:certificate|cert\.?|no\.?|number)\s*(?:no\.?|number)?\s*[:#-]?\s*([A-Z0-9_\/-]{6,})/i, /\b(\d{2}[_-]\d{3}[_-]\d{2}[_-]\d{3,})\b/]);
  const issuer = pickByRules(normalized, [/(SGS|TUV|TÜV|Intertek|Bureau Veritas|SATRA|UL|CSA|DEKRA)/i, /(?:issued by|notified body|certification body)\s*[:\-]?\s*([A-Za-z0-9 .,&-]{3,80})/i]);
  const validUntil = pickByRules(normalized, [/(?:valid until|expiry date|expiration date|expires)\s*[:\-]?\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i]);
  let guessedType = guess.guessed_type;
  const lower = normalized.toLowerCase();
  if (guessedType === 'other') {
    if (lower.includes('declaration of conformity')) guessedType = 'declaration_of_conformity';
    else if (lower.includes('certificate')) guessedType = 'certificate';
    else if (lower.includes('instruction') || lower.includes('user manual')) guessedType = 'manual';
  }
  return {
    ...guess,
    guessed_type: guessedType,
    guessed_cert_no: certNo,
    guessed_models: models.join(', ') || guess.guessed_models,
    guessed_model: models.join(', ') || guess.guessed_model,
    guessed_standard: standards.join(', ') || null,
    guessed_issuer: issuer,
    guessed_valid_until: validUntil,
    extracted_text_status: 'pdf_text_layer',
  };
}

function guessFileInfo(name) {
  const lower = name.toLowerCase();
  let guessed_type = 'other';
  if (lower.includes('doc') || lower.includes('declaration') || lower.includes('conformity')) guessed_type = 'declaration_of_conformity';
  else if (lower.includes('manual') || lower.includes('instruction') || lower.includes('user')) guessed_type = 'manual';
  else if (lower.includes('cert') || lower.includes('certificate') || /\d{2}_\d{3}_\d{2}_\d+/.test(lower)) guessed_type = 'certificate';

  let guessed_language = 'en';
  if (/(^|[_\-. ])zh|中文|chinese/.test(lower)) guessed_language = 'zh';
  else if (/(^|[_\-. ])de|german|deutsch/.test(lower)) guessed_language = 'de';
  else if (/(^|[_\-. ])fr|french/.test(lower)) guessed_language = 'fr';

  const certMatch = name.match(/\d{2}[_-]\d{3}[_-]\d{2}[_-]\d{3,}/);
  const hasLanguageSuffix = /[_\-. ](en|de|fr|zh|es|it|nl|pl|pt|cs|sv|da|fi)(\.[a-z0-9]+)?$/i.test(name);
  const modelMatches = [...new Set((name.match(/F\d{2}[A-Z0-9-]*/gi) || []).map((model) => model.toUpperCase()))];
  if (guessed_type === 'other' && modelMatches.length && hasLanguageSuffix) guessed_type = 'declaration_of_conformity';

  const mainModel = modelMatches[0] || null;
  const seriesMatch = mainModel?.match(/^(F\d{2})/i);
  const seriesCode = seriesMatch ? seriesMatch[1].toUpperCase() : '';
  const isHelmet = lower.includes('helmet') || lower.includes('helm');
  const suggestedProductName = seriesCode
    ? `${isHelmet ? 'Equestrian Helmet ' : 'Product '}${seriesCode} Series`
    : null;
  return {
    guessed_type,
    guessed_language,
    guessed_cert_no: certMatch ? certMatch[0].replace(/-/g, '_') : null,
    guessed_model: modelMatches.join(', ') || null,
    guessed_models: modelMatches.join(', ') || null,
    suggested_product_name: suggestedProductName,
    guessed_standard: null,
    guessed_issuer: null,
    guessed_valid_until: null,
    extracted_text_status: 'filename_only',
  };
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/imports');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: UNVERIFIED_COMPANY_MAX_FILE_SIZE, files: 80 }, fileFilter: documentFileFilter });

function fallbackCertNo(item) {
  return item?.guessed_cert_no || path.basename(item?.original_name || 'certificate', path.extname(item?.original_name || '')) || `CERT-${Date.now()}`;
}

function buildDuplicateInfo(row) {
  const earlierPending = db.prepare(`
    SELECT id, original_name FROM import_items
    WHERE company_id = ? AND id < ? AND status = 'pending' AND (original_name = ? OR (file_size IS NOT NULL AND file_size = ?))
    ORDER BY id ASC
    LIMIT 1
  `).get(row.company_id, row.id, row.original_name, row.file_size || -1);
  if (earlierPending) return {
    is_duplicate: 1,
    duplicate_reason: '待整理池中已有更早上传的相似文件',
    duplicate_import_id: earlierPending.id,
    duplicate_import_name: earlierPending.original_name,
  };

  const sameDocument = db.prepare(`
    SELECT d.id, d.title, d.document_type, d.language, p.name as product_name
    FROM documents d
    LEFT JOIN products p ON d.product_id = p.id
    WHERE d.company_id = ? AND d.status != 'deleted'
      AND (d.title = ? OR (d.file_size IS NOT NULL AND d.file_size = ?)
        OR (d.product_id = ? AND d.document_type = ? AND d.language = ?))
    LIMIT 1
  `).get(row.company_id, row.original_name, row.file_size || -1, row.product_id || -1, row.guessed_type || 'other', row.guessed_language || 'en');
  if (sameDocument) return {
    is_duplicate: 1,
    duplicate_reason: '已归档文件中存在相似文件',
    duplicate_document_id: sameDocument.id,
    duplicate_document_title: sameDocument.title,
    duplicate_document_product: sameDocument.product_name,
    duplicate_document_type: sameDocument.document_type,
    duplicate_document_language: sameDocument.language,
  };
  return { is_duplicate: 0, duplicate_reason: null };
}

function buildClassificationSuggestion(row = {}) {
  return suggestProductClassification({
    fileName: row.original_name,
    productName: row.suggested_product_name || row.suggestedProductName,
    model: row.guessed_models || row.guessedModels || row.guessed_model || row.guessedModel,
    documentType: row.guessed_type || row.guessedType,
    standard: row.guessed_standard || row.guessedStandard,
    issuer: row.guessed_issuer || row.guessedIssuer,
  });
}

function unlinkUploadedFile(filePath) {
  if (!filePath) return;
  const normalized = filePath.replace(/^\/uploads\//, 'uploads/');
  const fullPath = path.join(__dirname, '..', normalized);
  try { if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath); } catch (error) {}
}

router.get('/', authMiddleware, (req, res) => {
  ensureImportTables();
  const companyId = Number(req.query.companyId);
  if (!companyId) return res.status(400).json({ success: false, message: '缺少公司ID' });
  if (!canManageCompany(req.admin, companyId)) return res.status(403).json({ success: false, message: '无权查看该公司的导入资料' });
  const rows = db.prepare(`
    SELECT ii.*, p.name as product_name, d.title as document_title
    FROM import_items ii
    LEFT JOIN products p ON ii.product_id = p.id
    LEFT JOIN documents d ON ii.document_id = d.id
    WHERE ii.company_id = ?
    ORDER BY CASE ii.status WHEN 'pending' THEN 0 WHEN 'organized' THEN 1 ELSE 2 END, ii.created_at DESC
  `).all(companyId);
  res.json({ success: true, data: rows.map((row) => ({ ...row, ...buildDuplicateInfo(row), suggested_classification: buildClassificationSuggestion(row) })) });
});

router.post('/upload', authMiddleware, upload.array('files', 80), (req, res) => {
  ensureImportTables();
  const companyId = Number(req.body.companyId);
  if (!companyId) return res.status(400).json({ success: false, message: '缺少公司ID' });
  if (!canManageCompany(req.admin, companyId)) return res.status(403).json({ success: false, message: '无权向该公司导入资料' });
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ success: false, message: '请选择要上传的文件' });

  try {
    assertUnverifiedCompanyUploadAllowed(companyId, files, files.length);
  } catch (error) {
    removeUploadedFiles(files);
    return res.status(400).json({ success: false, message: error.message });
  }

  const insert = db.prepare(`
    INSERT INTO import_items (company_id, original_name, file_path, file_size, mime_type, guessed_type, guessed_language, guessed_model, guessed_models, suggested_product_name, guessed_cert_no, guessed_standard, guessed_issuer, guessed_valid_until, extracted_text_status, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const items = files.map((file) => {
    const text = file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf' ? extractPdfText(file.path) : '';
    const guess = enhanceGuessWithText(guessFileInfo(file.originalname), text);
    const filePath = `/uploads/imports/${file.filename}`;
    const result = insert.run(companyId, file.originalname, filePath, file.size, file.mimetype, guess.guessed_type, guess.guessed_language, guess.guessed_model, guess.guessed_models, guess.suggested_product_name, guess.guessed_cert_no, guess.guessed_standard, guess.guessed_issuer, guess.guessed_valid_until, guess.extracted_text_status, req.admin.id);
    const row = { id: result.lastInsertRowid, original_name: file.originalname, file_path: filePath, ...guess };
    return { ...row, suggested_classification: buildClassificationSuggestion(row) };
  });
  recordImportAudit({
    adminId: req.admin.id,
    action: 'batch_upload',
    targetType: 'company',
    targetId: companyId,
    detail: {
      source: 'batch_import',
      count: items.length,
      importItemIds: items.map((item) => item.id),
      fileNames: items.map((item) => item.original_name),
    },
    ipAddress: req.ip,
  });
  res.status(201).json({ success: true, data: items, message: `已导入 ${items.length} 个文件，等待整理` });
});



router.delete('/:id', authMiddleware, (req, res) => {
  ensureImportTables();
  const item = db.prepare('SELECT * FROM import_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: '待整理文件不存在' });
  if (!canManageCompany(req.admin, item.company_id)) return res.status(403).json({ success: false, message: '无权删除该文件' });
  if (item.status !== 'pending') return res.status(400).json({ success: false, message: '已归档文件请先撤回或在文件管理中删除' });
  db.prepare('DELETE FROM import_items WHERE id = ?').run(item.id);
  unlinkUploadedFile(item.file_path);
  res.json({ success: true, message: '已从待整理池删除' });
});

router.post('/:id/reopen', authMiddleware, (req, res) => {
  ensureImportTables();
  const item = db.prepare('SELECT * FROM import_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: '导入记录不存在' });
  if (!canManageCompany(req.admin, item.company_id)) return res.status(403).json({ success: false, message: '无权撤回该文件' });
  if (!item.document_id) return res.status(400).json({ success: false, message: '该文件尚未归档' });
  db.prepare('UPDATE documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('deleted', item.document_id);
  db.prepare(`UPDATE import_items SET status = 'pending', product_id = NULL, document_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(item.id);
  res.json({ success: true, message: '已撤回到待整理池，可重新整理' });
});


router.post('/organize-group', authMiddleware, (req, res) => {
  ensureImportTables();
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
  if (!ids.length) return res.status(400).json({ success: false, message: '请选择要整理的文件' });

  const placeholders = ids.map(() => '?').join(',');
  const items = db.prepare(`SELECT * FROM import_items WHERE id IN (${placeholders}) AND status = 'pending'`).all(...ids);
  if (items.length !== ids.length) return res.status(400).json({ success: false, message: '部分文件不存在或已整理' });

  const companyId = items[0].company_id;
  if (!items.every((item) => item.company_id === companyId)) return res.status(400).json({ success: false, message: '不能跨公司整理文件' });
  if (!canManageCompany(req.admin, companyId)) return res.status(403).json({ success: false, message: '无权整理该公司的文件' });

  const product_id = req.body.productId;
  const new_product_name = req.body.newProductName;
  const new_product_model = req.body.newProductModel;
  const document_type = req.body.documentType;
  const cert_no = req.body.certNo;
  const languages_by_id = req.body.languagesById;
  const document_types_by_id = req.body.documentTypesById;
  const { standard, issuer } = req.body;
  const category_primary_id = req.body.categoryPrimaryId || null;
  const compliance_category_ids = Array.isArray(req.body.complianceCategoryIds) ? req.body.complianceCategoryIds.map(Number).filter(Boolean) : [];
  let productId = product_id ? Number(product_id) : null;
  const createdProduct = !productId;

  if (createdProduct && isModelListProductName(new_product_name, new_product_model) && req.body.confirmModelListName !== true) {
    return res.status(400).json({
      success: false,
      code: 'MODEL_LIST_PRODUCT_NAME_CONFIRMATION_REQUIRED',
      message: '产品/系列名称看起来与适用型号相同，请确认名称后再继续',
    });
  }

  const tx = db.transaction(() => {
    if (!productId) {
      if (!new_product_name) throw new Error('请填写产品/系列名称');
      const productResult = db.prepare(`
        INSERT INTO products (company_id, name, model, category_primary_id, status, created_by, created_at)
        VALUES (?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
      `).run(companyId, new_product_name, new_product_model || items[0].guessed_models || items[0].guessed_model || null, category_primary_id, req.admin.id);
      productId = productResult.lastInsertRowid;
    }

    if (compliance_category_ids.length) {
      const insertCompliance = db.prepare('INSERT OR IGNORE INTO product_compliance_categories (product_id, category_id) VALUES (?, ?)');
      compliance_category_ids.forEach((categoryId) => insertCompliance.run(productId, categoryId));
    }

    const docType = document_type || items[0].guessed_type || 'other';
    const created = [];
    const insertDocument = db.prepare(`
      INSERT INTO documents (company_id, product_id, document_type, title, language, file_path, file_size, mime_type, status, review_status, uploaded_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, CURRENT_TIMESTAMP)
    `);
    const insertMeta = db.prepare(`INSERT INTO certificate_metadata (document_id, cert_no, standard, issuer) VALUES (?, ?, ?, ?)`);
    const markDone = db.prepare(`UPDATE import_items SET status = 'organized', product_id = ?, document_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);

    for (const item of items) {
      const languageOverride = languages_by_id && languages_by_id[String(item.id)];
      const itemDocType = (document_types_by_id && document_types_by_id[String(item.id)]) || docType;
      const docResult = insertDocument.run(companyId, productId, itemDocType, item.original_name, languageOverride || item.guessed_language || 'en', item.file_path, item.file_size, item.mime_type, importReviewStatus(req), req.admin.id);
      const documentId = docResult.lastInsertRowid;
      if (itemDocType === 'certificate') {
        insertMeta.run(documentId, cert_no || fallbackCertNo(item), standard || item.guessed_standard || null, issuer || item.guessed_issuer || null);
      }
      markDone.run(productId, documentId, item.id);
      created.push({ itemId: item.id, documentId });
    }
    const product = db.prepare('SELECT name, model FROM products WHERE id = ?').get(productId);
    recordImportAudit({
      adminId: req.admin.id,
      action: 'organize_import',
      targetType: 'product',
      targetId: productId,
      detail: {
        source: 'batch_import',
        productCreated: createdProduct,
        productName: product?.name || new_product_name || '',
        productModel: product?.model || new_product_model || '',
        count: created.length,
        importItemIds: created.map((item) => item.itemId),
        documentIds: created.map((item) => item.documentId),
        fileNames: items.map((item) => item.original_name),
      },
      ipAddress: req.ip,
    });
    return { productId, documents: created };
  });

  try {
    const result = tx();
    res.json({ success: true, data: result, message: `已创建/关联 1 个产品和 ${result.documents.length} 个文件` });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/organize', authMiddleware, (req, res) => {
  ensureImportTables();
  const item = db.prepare('SELECT * FROM import_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: '导入文件不存在' });
  if (!canManageCompany(req.admin, item.company_id)) return res.status(403).json({ success: false, message: '无权整理该文件' });

  const product_id = req.body.productId;
  const new_product_name = req.body.newProductName;
  const new_product_model = req.body.newProductModel;
  const document_type = req.body.documentType;
  const cert_no = req.body.certNo;
  const { title, language, standard, issuer } = req.body;
  const category_primary_id = req.body.categoryPrimaryId || null;
  const compliance_category_ids = Array.isArray(req.body.complianceCategoryIds) ? req.body.complianceCategoryIds.map(Number).filter(Boolean) : [];
  let productId = product_id ? Number(product_id) : null;
  const createdProduct = !productId;

  if (createdProduct && isModelListProductName(new_product_name, new_product_model) && req.body.confirmModelListName !== true) {
    return res.status(400).json({
      success: false,
      code: 'MODEL_LIST_PRODUCT_NAME_CONFIRMATION_REQUIRED',
      message: '产品/系列名称看起来与适用型号相同，请确认名称后再继续',
    });
  }

  const tx = db.transaction(() => {
    if (!productId) {
      if (!new_product_name) throw new Error('请选择已有产品或填写新产品名称');
      const productResult = db.prepare(`
        INSERT INTO products (company_id, name, model, category_primary_id, status, created_by, created_at)
        VALUES (?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
      `).run(item.company_id, new_product_name, new_product_model || item.guessed_models || item.guessed_model || null, category_primary_id, req.admin.id);
      productId = productResult.lastInsertRowid;
    }

    if (compliance_category_ids.length) {
      const insertCompliance = db.prepare('INSERT OR IGNORE INTO product_compliance_categories (product_id, category_id) VALUES (?, ?)');
      compliance_category_ids.forEach((categoryId) => insertCompliance.run(productId, categoryId));
    }

    const docType = document_type || item.guessed_type || 'other';
    const docTitle = title || item.original_name;
    const docLang = language || item.guessed_language || 'en';
    const docResult = db.prepare(`
      INSERT INTO documents (company_id, product_id, document_type, title, language, file_path, file_size, mime_type, status, review_status, uploaded_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, CURRENT_TIMESTAMP)
    `).run(item.company_id, productId, docType, docTitle, docLang, item.file_path, item.file_size, item.mime_type, importReviewStatus(req), req.admin.id);
    const documentId = docResult.lastInsertRowid;

    if (docType === 'certificate') {
      db.prepare(`
        INSERT INTO certificate_metadata (document_id, cert_no, standard, issuer)
        VALUES (?, ?, ?, ?)
      `).run(documentId, cert_no || fallbackCertNo(item), standard || null, issuer || null);
    }

    db.prepare(`
      UPDATE import_items SET status = 'organized', product_id = ?, document_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(productId, documentId, item.id);
    const product = db.prepare('SELECT name, model FROM products WHERE id = ?').get(productId);
    recordImportAudit({
      adminId: req.admin.id,
      action: 'organize_import',
      targetType: 'product',
      targetId: productId,
      detail: {
        source: 'batch_import',
        productCreated: createdProduct,
        productName: product?.name || new_product_name || '',
        productModel: product?.model || new_product_model || '',
        count: 1,
        importItemIds: [item.id],
        documentIds: [documentId],
        fileNames: [item.original_name],
      },
      ipAddress: req.ip,
    });
    return { productId, documentId };
  });

  try {
    const result = tx();
    res.json({ success: true, data: result, message: '文件已整理并关联到产品' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
