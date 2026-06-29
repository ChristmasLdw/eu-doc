const { Router } = require('express');
const { db } = require('../db.cjs');

const router = Router();

function scoreValue(value, q, base = 0) {
  const text = String(value || '').toLowerCase();
  if (!text) return 0;
  if (text === q) return base + 100;
  if (text.startsWith(q)) return base + 80;
  if (text.includes(` ${q}`) || text.includes(`-${q}`)) return base + 55;
  if (text.includes(q)) return base + 30;
  return 0;
}

function addSuggestion(list, seen, type, value, meta, q, base) {
  if (!value) return;
  const key = `${type}:${String(value).toLowerCase()}`;
  if (seen.has(key)) return;
  const score = scoreValue(value, q, base);
  if (!score) return;
  seen.add(key);
  list.push({ type, value, meta, score });
}

router.get('/suggestions', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 30);
  if (!q) return res.json({ success: true, data: [] });

  try {
    const suggestions = [];
    const seen = new Set();
    const like = `%${q}%`;

    const companies = db.prepare(`
      SELECT c.id, c.name, c.name_en,
        (SELECT COUNT(*) FROM products p WHERE p.company_id = c.id AND COALESCE(p.status, 'active') = 'active') as product_count,
        (SELECT COUNT(*) FROM documents d WHERE d.company_id = c.id AND COALESCE(d.status, 'active') != 'deleted') as document_count
      FROM companies c
      WHERE COALESCE(c.verification_status, 'pending') = 'verified'
        AND COALESCE(c.public_visible, 1) = 1
        AND (LOWER(c.name) LIKE ? OR LOWER(COALESCE(c.name_en, '')) LIKE ?)
      LIMIT 12
    `).all(like, like);

    companies.forEach((company) => {
      const meta = { id: company.id, productCount: company.product_count || 0, documentCount: company.document_count || 0 };
      addSuggestion(suggestions, seen, 'company', company.name, meta, q, 30);
      addSuggestion(suggestions, seen, 'company', company.name_en, meta, q, 30);
    });

    const products = db.prepare(`
      SELECT p.id, p.name, p.model, c.name as company_name
      FROM products p
      JOIN companies c ON c.id = p.company_id
      WHERE COALESCE(p.status, 'active') = 'active'
        AND COALESCE(c.verification_status, 'pending') = 'verified'
        AND COALESCE(c.public_visible, 1) = 1
        AND (LOWER(p.name) LIKE ? OR LOWER(COALESCE(p.model, '')) LIKE ?)
      LIMIT 24
    `).all(like, like);

    products.forEach((product) => {
      const meta = { id: product.id, companyName: product.company_name };
      addSuggestion(suggestions, seen, 'product', product.name, meta, q, 20);
      addSuggestion(suggestions, seen, 'model', product.model, meta, q, 15);
    });

    const documents = db.prepare(`
      SELECT d.id, d.title, d.document_type, d.language, p.name as product_name, c.name as company_name
      FROM documents d
      JOIN companies c ON c.id = d.company_id
      LEFT JOIN products p ON p.id = d.product_id
      WHERE COALESCE(d.status, 'active') != 'deleted'
        AND COALESCE(d.review_status, 'approved') = 'approved'
        AND COALESCE(c.verification_status, 'pending') = 'verified'
        AND COALESCE(c.public_visible, 1) = 1
        AND LOWER(COALESCE(d.title, '')) LIKE ?
      LIMIT 18
    `).all(like);

    documents.forEach((doc) => {
      const type = doc.document_type === 'certificate' ? 'certNo' : doc.document_type === 'declaration_of_conformity' ? 'doc' : doc.document_type === 'manual' ? 'manual' : 'file';
      addSuggestion(suggestions, seen, type, doc.title, { id: doc.id, productName: doc.product_name, companyName: doc.company_name, language: doc.language }, q, 8);
    });

    suggestions.sort((a, b) => b.score - a.score || String(a.value).localeCompare(String(b.value), 'zh-CN', { numeric: true }));
    res.json({ success: true, data: suggestions.slice(0, limit).map(({ score, ...item }) => item) });
  } catch (error) {
    console.error('搜索建议失败:', error);
    res.status(500).json({ success: false, message: '搜索建议失败' });
  }
});

module.exports = router;
