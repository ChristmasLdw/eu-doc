const fs = require('fs');
const path = require('path');
const { db } = require('../db.cjs');

const UNVERIFIED_COMPANY_MAX_FILES = 20;
const UNVERIFIED_COMPANY_MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_DOCUMENT_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx']);
const ALLOWED_DOCUMENT_FILE_DESCRIPTION = 'PDF、JPG、PNG、WebP、Word（doc/docx）';

function isAllowedDocumentFile(file) {
  const ext = path.extname(file?.originalname || '').toLowerCase();
  return ALLOWED_DOCUMENT_FILE_TYPES.has(file?.mimetype) && ALLOWED_DOCUMENT_EXTENSIONS.has(ext);
}

function assertAllowedDocumentFiles(files = []) {
  const invalid = files.filter(Boolean).find((file) => !isAllowedDocumentFile(file));
  if (invalid) {
    throw new Error(`不支持 ${invalid.originalname || '该文件'} 的格式，请上传 ${ALLOWED_DOCUMENT_FILE_DESCRIPTION}`);
  }
}

function documentFileFilter(_req, file, cb) {
  if (isAllowedDocumentFile(file)) return cb(null, true);
  cb(new Error(`不支持该文件格式，请上传 ${ALLOWED_DOCUMENT_FILE_DESCRIPTION}`));
}

function getCompanyVerificationStatus(companyId) {
  const company = db.prepare('SELECT verification_status FROM companies WHERE id = ?').get(companyId);
  return company?.verification_status || 'pending';
}

function isCompanyVerified(companyId) {
  return getCompanyVerificationStatus(companyId) === 'verified';
}

function getCompanyUploadedFileCount(companyId) {
  const documents = db.prepare("SELECT COUNT(*) as count FROM documents WHERE company_id = ? AND status != 'deleted'").get(companyId).count || 0;
  let imports = 0;
  const hasImportItems = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'import_items'").get();
  if (hasImportItems) {
    imports = db.prepare("SELECT COUNT(*) as count FROM import_items WHERE company_id = ? AND status = 'pending'").get(companyId).count || 0;
  }
  return documents + imports;
}

function removeUploadedFiles(files = []) {
  for (const file of files.filter(Boolean)) {
    try {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (error) {}
  }
}

function assertUnverifiedCompanyUploadAllowed(companyId, files = [], additionalCount = files.length) {
  assertAllowedDocumentFiles(files);
  if (isCompanyVerified(companyId)) return;

  const oversized = files.find((file) => file.size > UNVERIFIED_COMPANY_MAX_FILE_SIZE);
  if (oversized) {
    throw new Error('未认证公司单个文件不能超过 10MB，请认证企业后再上传更大的文件');
  }

  const currentCount = getCompanyUploadedFileCount(companyId);
  if (currentCount + additionalCount > UNVERIFIED_COMPANY_MAX_FILES) {
    throw new Error(`未认证公司最多只能上传 ${UNVERIFIED_COMPANY_MAX_FILES} 个文件；当前已有 ${currentCount} 个，本次还可上传 ${Math.max(0, UNVERIFIED_COMPANY_MAX_FILES - currentCount)} 个`);
  }
}

module.exports = {
  UNVERIFIED_COMPANY_MAX_FILES,
  UNVERIFIED_COMPANY_MAX_FILE_SIZE,
  ALLOWED_DOCUMENT_FILE_DESCRIPTION,
  assertUnverifiedCompanyUploadAllowed,
  assertAllowedDocumentFiles,
  documentFileFilter,
  getCompanyUploadedFileCount,
  isCompanyVerified,
  removeUploadedFiles,
};
