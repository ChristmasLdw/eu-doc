const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eu-doc-security-'));
process.env.EU_DOC_DB_PATH = path.join(tempDir, 'test.db');
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'security-test-secret';

const { db } = require('../db.cjs');
const { generateToken } = require('../middleware/auth.cjs');

db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    display_name TEXT,
    phone TEXT,
    real_name TEXT,
    position TEXT,
    department TEXT,
    user_code TEXT,
    phone_verified INTEGER DEFAULT 0,
    platform_role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    email_verified INTEGER DEFAULT 1,
    session_version INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE companies (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    status TEXT DEFAULT 'active',
    verification_status TEXT DEFAULT 'verified',
    public_visible INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE company_members (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'active'
  );
  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    model TEXT,
    image_path TEXT,
    category_primary_id INTEGER,
    status TEXT DEFAULT 'active',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE documents (
    id INTEGER PRIMARY KEY,
    company_id INTEGER NOT NULL,
    product_id INTEGER,
    document_type TEXT NOT NULL,
    title TEXT,
    language TEXT,
    file_path TEXT,
    file_size INTEGER,
    mime_type TEXT,
    status TEXT DEFAULT 'active',
    review_status TEXT DEFAULT 'pending',
    review_note TEXT,
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    uploaded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE certificate_metadata (
    id INTEGER PRIMARY KEY,
    document_id INTEGER NOT NULL,
    cert_no TEXT UNIQUE,
    standard TEXT,
    issuer TEXT,
    issue_date TEXT,
    expiry_date TEXT,
    remark TEXT
  );
  CREATE TABLE certificates_legacy (id INTEGER PRIMARY KEY, thumbnail_path TEXT);
  CREATE TABLE company_verification_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    document_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by INTEGER NOT NULL,
    review_status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE certificate_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cert_id INTEGER NOT NULL,
    report_type TEXT NOT NULL,
    description TEXT,
    reporter_email TEXT,
    reporter_name TEXT,
    status TEXT DEFAULT 'pending',
    admin_response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    slug TEXT,
    parent_id INTEGER,
    status TEXT DEFAULT 'active',
    sort_order INTEGER DEFAULT 0
  );
  CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
  CREATE TABLE product_tags (product_id INTEGER, tag_id INTEGER, created_at DATETIME);
  CREATE TABLE document_tags (document_id INTEGER, tag_id INTEGER, created_at DATETIME);
  CREATE TABLE email_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    email TEXT,
    token TEXT,
    type TEXT,
    used INTEGER DEFAULT 0,
    expires_at DATETIME
  );
  CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    action TEXT,
    target_type TEXT,
    target_id INTEGER,
    detail TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const insertUser = db.prepare(`
  INSERT INTO users (id, email, password_hash, display_name, platform_role, status, session_version)
  VALUES (?, ?, ?, ?, ?, 'active', 0)
`);
insertUser.run(1, 'owner@example.com', 'unused', 'Owner', 'user');
insertUser.run(2, 'outsider@example.com', 'unused', 'Outsider', 'user');
insertUser.run(3, 'admin@example.com', 'unused', 'Admin', 'platform_admin');
insertUser.run(4, 'uploader@example.com', 'unused', 'Uploader', 'user');

db.prepare('INSERT INTO companies (id, name) VALUES (1, ?)').run('Company One');
db.prepare("INSERT INTO company_members (id, user_id, company_id, role) VALUES (1, 1, 1, 'owner')").run();
db.prepare("INSERT INTO company_members (id, user_id, company_id, role) VALUES (2, 4, 1, 'uploader')").run();
db.prepare("INSERT INTO products (id, company_id, name, created_by) VALUES (1, 1, 'Product One', 1)").run();
db.prepare("INSERT INTO documents (id, company_id, product_id, document_type, title, status, review_status, uploaded_by, file_path, mime_type) VALUES (1, 1, 1, 'manual', 'Manual', 'active', 'approved', 4, '/documents/manual.pdf', 'application/pdf')").run();
db.prepare("INSERT INTO documents (id, company_id, product_id, document_type, title, status, review_status, uploaded_by, file_path, mime_type) VALUES (2, 1, 1, 'certificate', 'Certificate', 'active', 'approved', 4, '/documents/certificate.pdf', 'application/pdf')").run();
db.prepare("INSERT INTO documents (id, company_id, product_id, document_type, title, status, review_status, uploaded_by, file_path, mime_type) VALUES (3, 1, 1, 'manual', 'Pending Manual', 'active', 'pending', 4, '/documents/pending.pdf', 'application/pdf')").run();
db.prepare("INSERT INTO certificate_metadata (id, document_id, cert_no) VALUES (1, 2, 'CERT-1')").run();
db.prepare("INSERT INTO tags (id, name) VALUES (1, 'Featured')").run();

const tokenFor = (id) => generateToken(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
const ownerToken = tokenFor(1);
const outsiderToken = tokenFor(2);
const adminToken = tokenFor(3);
const uploaderToken = tokenFor(4);

const app = express();
app.use(express.json());
app.use('/api/auth', require('../routes/auth.cjs'));
app.use('/api/companies', require('../routes/companies.cjs'));
app.use('/api/v2/documents', require('../routes/documents.cjs'));
app.use('/api/v2/products', require('../routes/products.cjs'));
app.use('/api/v2/tags', require('../routes/tags.cjs'));
app.use('/api/v2/imports', require('../routes/imports.cjs'));
app.use('/api/v2/company-verifications', require('../routes/company-verifications.cjs'));
app.use('/api/v2/platform-settings', require('../routes/platform-settings.cjs'));
app.use('/api/reports', require('../routes/reports.cjs'));
app.use('/api/certificates', require('../routes/certificates.cjs'));

let server;
let baseUrl;

async function request(route, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  return { status: response.status, body: payload };
}

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('production forgot-password response never exposes reset token', async () => {
  const result = await request('/api/auth/forgot-password', {
    method: 'POST',
    body: { email: 'owner@example.com' },
  });
  assert.equal(result.status, 200);
  assert.equal(Object.hasOwn(result.body, 'resetToken'), false);
});

test('reset-password invalidates JWT issued before the password reset', async () => {
  db.prepare(`
    INSERT INTO email_verifications (user_id, email, token, type, expires_at)
    VALUES (1, 'owner@example.com', 'reset-owner', 'reset', datetime('now', '+1 hour'))
  `).run();

  const reset = await request('/api/auth/reset-password', {
    method: 'POST',
    body: { token: 'reset-owner', newPassword: 'new-password' },
  });
  assert.equal(reset.status, 200);

  const oldSession = await request('/api/auth/me', { token: ownerToken });
  assert.equal(oldSession.status, 401);
  assert.equal(db.prepare('SELECT session_version FROM users WHERE id = 1').get().session_version, 1);
});

test('company writes reject outsiders and allow platform admins', async () => {
  const denied = await request('/api/companies/1', {
    method: 'PUT',
    token: outsiderToken,
    body: { name: 'Hijacked Company' },
  });
  assert.equal(denied.status, 403);

  const allowed = await request('/api/companies/1', {
    method: 'PUT',
    token: adminToken,
    body: { name: 'Company One Updated' },
  });
  assert.equal(allowed.status, 200);
});

test('company verification history resolves operators from current users', async () => {
  db.prepare(`
    INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail)
    VALUES (3, 'approve_verification', 'company', 1, '{}')
  `).run();

  const result = await request('/api/companies/1/verification-history', { token: adminToken });
  assert.equal(result.status, 200);
  assert.equal(result.body.data[0].operatorName, 'Admin');
});

test('document writes reject outsiders and allow uploader members', async () => {
  const denied = await request('/api/v2/documents/1', {
    method: 'PUT',
    token: outsiderToken,
    body: { title: 'Hijacked Manual' },
  });
  assert.equal(denied.status, 403);

  const allowed = await request('/api/v2/documents/1', {
    method: 'PUT',
    token: uploaderToken,
    body: { title: 'Updated Manual' },
  });
  assert.equal(allowed.status, 200);
});

test('product image route checks company permission before accepting a file', async () => {
  const denied = await request('/api/v2/products/1/image', {
    method: 'POST',
    token: outsiderToken,
  });
  assert.equal(denied.status, 403);

  const allowedToReachUploadValidation = await request('/api/v2/products/1/image', {
    method: 'POST',
    token: adminToken,
  });
  assert.equal(allowedToReachUploadValidation.status, 400);
});

test('certificate writes reject outsiders and allow uploader members', async () => {
  const denied = await request('/api/certificates/2', {
    method: 'PUT',
    token: outsiderToken,
    body: { standard: 'EN-HACK' },
  });
  assert.equal(denied.status, 403);

  const allowed = await request('/api/certificates/2', {
    method: 'PUT',
    token: uploaderToken,
    body: { standard: 'EN-TEST' },
  });
  assert.equal(allowed.status, 200);
});

test('product tag relations require a company manager', async () => {
  const denied = await request('/api/v2/tags/1/products', {
    method: 'POST',
    token: outsiderToken,
    body: { productId: 1 },
  });
  assert.equal(denied.status, 403);

  const uploaderDenied = await request('/api/v2/tags/1/products', {
    method: 'POST',
    token: uploaderToken,
    body: { productId: 1 },
  });
  assert.equal(uploaderDenied.status, 403);

  const allowed = await request('/api/v2/tags/1/products', {
    method: 'POST',
    token: adminToken,
    body: { productId: 1 },
  });
  assert.equal(allowed.status, 200);
});

test('certificate import cannot target another company', async () => {
  const result = await request('/api/certificates/import', {
    method: 'POST',
    token: outsiderToken,
    body: {
      certificates: [{ cert_no: 'CERT-HACK', product_name: 'Product One', companyId: 1 }],
    },
  });
  assert.equal(result.status, 403);
});

test('public product APIs hide actor fields and pending documents', async () => {
  const publicFilePath = path.join(__dirname, '..', 'uploads', 'documents', 'manual.pdf');
  fs.mkdirSync(path.dirname(publicFilePath), { recursive: true });
  fs.writeFileSync(publicFilePath, 'public manual');

  const list = await request('/api/v2/products?companyId=1&pageSize=20');
  assert.equal(list.status, 200);
  assert.equal(Object.hasOwn(list.body.data[0], 'created_by'), false);
  assert.equal(list.body.data[0].document_count, 2);

  const detail = await request('/api/v2/products/1');
  assert.equal(detail.status, 200);
  assert.equal(Object.hasOwn(detail.body.data, 'created_by'), false);
  assert.equal(Object.hasOwn(detail.body.data, 'created_by_name'), false);

  const documents = await request('/api/v2/products/1/documents');
  assert.equal(documents.status, 200);
  assert.deepEqual(documents.body.data.map((item) => item.id).sort(), [1, 2]);
  documents.body.data.forEach((item) => {
    assert.equal(Object.hasOwn(item, 'file_path'), false);
    assert.equal(Object.hasOwn(item, 'uploaded_by'), false);
    assert.match(item.file_url, new RegExp(`/api/v2/documents/${item.id}/file$`));
  });

  const pending = await request('/api/v2/documents/3');
  assert.equal(pending.status, 404);

  const publicFile = await fetch(`${baseUrl}/api/v2/documents/1/file`);
  assert.equal(publicFile.status, 200);
  assert.equal(await publicFile.text(), 'public manual');

  const pendingFile = await fetch(`${baseUrl}/api/v2/documents/3/file`);
  assert.equal(pendingFile.status, 404);
  fs.rmSync(publicFilePath, { force: true });
});

test('public document list exposes image documents through a thumbnail URL', async () => {
  db.prepare(`
    INSERT INTO documents (
      id, company_id, product_id, document_type, title, status, review_status,
      uploaded_by, file_path, mime_type
    ) VALUES (40, 1, 1, 'declaration_of_conformity', 'Public DoC', 'active', 'approved', 4, '/documents/doc.png', NULL)
  `).run();

  const result = await request('/api/v2/documents?documentType=declaration_of_conformity&pageSize=10');
  assert.equal(result.status, 200);
  assert.equal(result.body.data.length, 1);
  assert.equal(result.body.data[0].thumbnail_url, '/eu-doc/api/v2/documents/40/file');
  assert.equal(Object.hasOwn(result.body.data[0], 'file_path'), false);

  db.prepare('DELETE FROM documents WHERE id = 40').run();
});

test('batch upload records an audit entry', async () => {
  const form = new FormData();
  form.append('companyId', '1');
  form.append('files', new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), 'F90-TEST_manual_en.pdf');
  const response = await fetch(`${baseUrl}/api/v2/imports/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${uploaderToken}` },
    body: form,
  });
  const payload = await response.json();
  assert.equal(response.status, 201);
  assert.equal(payload.data.length, 1);

  const audit = db.prepare("SELECT * FROM audit_logs WHERE action = 'batch_upload' ORDER BY id DESC LIMIT 1").get();
  assert.equal(audit.admin_id, 4);
  assert.equal(audit.target_type, 'company');
  assert.equal(audit.target_id, 1);
  assert.equal(JSON.parse(audit.detail).count, 1);

  const imported = db.prepare('SELECT file_path FROM import_items WHERE id = ?').get(payload.data[0].id);
  if (imported?.file_path) {
    const fullPath = path.join(__dirname, '..', imported.file_path.replace(/^\/uploads\//, 'uploads/'));
    fs.rmSync(fullPath, { force: true });
  }
});

test('model-list product names require confirmation and organizing writes an audit entry', async () => {
  const insert = db.prepare(`
    INSERT INTO import_items (
      company_id, original_name, file_path, file_size, mime_type, guessed_type,
      guessed_language, guessed_model, guessed_models, uploaded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const item = insert.run(1, 'certificate.pdf', '/uploads/imports/certificate.pdf', 100, 'application/pdf', 'certificate', 'en', 'F20-1, F20-2', 'F20-1, F20-2', 4);
  const body = {
    ids: [Number(item.lastInsertRowid)],
    productId: '',
    newProductName: 'F20-1, F20-2',
    newProductModel: 'F20-1, F20-2',
    documentType: 'certificate',
  };

  const blocked = await request('/api/v2/imports/organize-group', {
    method: 'POST',
    token: uploaderToken,
    body,
  });
  assert.equal(blocked.status, 400);
  assert.equal(blocked.body.code, 'MODEL_LIST_PRODUCT_NAME_CONFIRMATION_REQUIRED');

  const confirmed = await request('/api/v2/imports/organize-group', {
    method: 'POST',
    token: uploaderToken,
    body: { ...body, confirmModelListName: true },
  });
  assert.equal(confirmed.status, 200);

  const audit = db.prepare("SELECT * FROM audit_logs WHERE action = 'organize_import' ORDER BY id DESC LIMIT 1").get();
  const detail = JSON.parse(audit.detail);
  assert.equal(audit.admin_id, 4);
  assert.equal(audit.target_type, 'product');
  assert.equal(detail.productCreated, true);
  assert.equal(detail.count, 1);

  const organizedDocument = db.prepare('SELECT review_status FROM documents WHERE id = ?').get(detail.documentIds[0]);
  assert.equal(organizedDocument.review_status, 'pending');
});

test('platform admins can review pending documents and company members cannot', async () => {
  const inserted = db.prepare(`
    INSERT INTO documents (company_id, product_id, document_type, title, status, review_status, uploaded_by)
    VALUES (1, 1, 'manual', 'Review Queue Manual', 'active', 'pending', 4)
  `).run();
  const documentId = Number(inserted.lastInsertRowid);

  const denied = await request(`/api/v2/documents/${documentId}/review`, {
    method: 'POST',
    token: uploaderToken,
    body: { status: 'approved' },
  });
  assert.equal(denied.status, 403);

  const approved = await request(`/api/v2/documents/${documentId}/review`, {
    method: 'POST',
    token: adminToken,
    body: { status: 'approved' },
  });
  assert.equal(approved.status, 200);

  const document = db.prepare('SELECT review_status, reviewed_by, reviewed_at FROM documents WHERE id = ?').get(documentId);
  assert.equal(document.review_status, 'approved');
  assert.equal(document.reviewed_by, 3);
  assert.ok(document.reviewed_at);

  const notifications = db.prepare('SELECT user_id, title, description FROM user_notifications WHERE title = ? ORDER BY user_id').all('资料审核已通过');
  assert.deepEqual(notifications.map((item) => item.user_id), [1, 4]);
  notifications.forEach((item) => assert.match(item.description, /Review Queue Manual/));

  const audit = db.prepare("SELECT action, target_type FROM audit_logs WHERE target_id = ? ORDER BY id DESC LIMIT 1").get(documentId);
  assert.equal(audit.action, 'review_approved');
  assert.equal(audit.target_type, 'document');
});

test('rejected document reviews notify the uploader and company owner with the reason', async () => {
  const inserted = db.prepare(`
    INSERT INTO documents (company_id, product_id, document_type, title, status, review_status, uploaded_by)
    VALUES (1, 1, 'manual', 'Incorrect Manual', 'active', 'pending', 4)
  `).run();
  const documentId = Number(inserted.lastInsertRowid);
  const rejected = await request(`/api/v2/documents/${documentId}/review`, {
    method: 'POST', token: adminToken, body: { status: 'rejected', note: 'Wrong company name' },
  });
  assert.equal(rejected.status, 200);
  const notifications = db.prepare('SELECT user_id, description FROM user_notifications WHERE title = ? AND description LIKE ? ORDER BY user_id')
    .all('资料审核未通过', '%Incorrect Manual%');
  assert.deepEqual(notifications.map((item) => item.user_id), [1, 4]);
  notifications.forEach((item) => assert.match(item.description, /Wrong company name/));
});

test('platform management APIs use real data and enforce admin access', async () => {
  const deniedUsers = await request('/api/auth/users', { token: uploaderToken });
  assert.equal(deniedUsers.status, 403);

  const users = await request('/api/auth/users?search=uploader&pageSize=20', { token: adminToken });
  assert.equal(users.status, 200);
  assert.equal(users.body.data.length, 1);
  assert.equal(users.body.data[0].id, 4);
  assert.equal(Number(users.body.data[0].company_count), 1);

  const disabled = await request('/api/auth/users/4', {
    method: 'PUT',
    token: adminToken,
    body: { status: 'disabled' },
  });
  assert.equal(disabled.status, 200);
  assert.equal(db.prepare('SELECT status FROM users WHERE id = 4').get().status, 'disabled');
  db.prepare("UPDATE users SET status = 'active' WHERE id = 4").run();

  const deniedSettings = await request('/api/v2/platform-settings', { token: outsiderToken });
  assert.equal(deniedSettings.status, 403);
  const savedSettings = await request('/api/v2/platform-settings', {
    method: 'PUT',
    token: adminToken,
    body: { announcement: 'Maintenance notice', contactEmail: 'admin@example.com' },
  });
  assert.equal(savedSettings.status, 200);
  const settings = await request('/api/v2/platform-settings', { token: adminToken });
  assert.equal(settings.body.data.announcement, 'Maintenance notice');
});

test('platform admins can inspect verification materials and process real reports', async () => {
  db.prepare(`
    INSERT INTO company_verification_documents (company_id, document_type, file_path, file_size, uploaded_by)
    VALUES (1, 'business_license', '/logos/test-license.png', 123, 1)
  `).run();
  const verification = await request('/api/v2/company-verifications/1/documents', { token: adminToken });
  assert.equal(verification.status, 200);
  assert.equal(verification.body.data.documents.length, 1);

  const reportResult = db.prepare(`
    INSERT INTO certificate_reports (cert_id, report_type, description, reporter_email)
    VALUES (2, 'wrong_info', 'Certificate number mismatch', 'reporter@example.com')
  `).run();
  const reportId = Number(reportResult.lastInsertRowid);
  const reports = await request('/api/reports?status=pending', { token: adminToken });
  assert.equal(reports.status, 200);
  assert.ok(reports.body.data.some((item) => item.id === reportId));

  const updated = await request(`/api/reports/${reportId}/status`, {
    method: 'PUT',
    token: adminToken,
    body: { status: 'resolved', adminResponse: 'Checked and corrected' },
  });
  assert.equal(updated.status, 200);
  assert.equal(db.prepare('SELECT status FROM certificate_reports WHERE id = ?').get(reportId).status, 'resolved');
});
