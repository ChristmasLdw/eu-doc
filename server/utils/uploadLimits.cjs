const fs = require('fs');
const path = require('path');
const { db } = require('../db.cjs');

const UNVERIFIED_COMPANY_MAX_FILES = 20;
const UNVERIFIED_COMPANY_MAX_FILE_SIZE = 20 * 1024 * 1024;

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
  if (isCompanyVerified(companyId)) return;

  const oversized = files.find((file) => file.size > UNVERIFIED_COMPANY_MAX_FILE_SIZE);
  if (oversized) {
    throw new Error('未认证公司单个文件不能超过 20MB，请认证企业后再上传更大的文件');
  }

  const currentCount = getCompanyUploadedFileCount(companyId);
  if (currentCount + additionalCount > UNVERIFIED_COMPANY_MAX_FILES) {
    throw new Error(`未认证公司最多只能上传 ${UNVERIFIED_COMPANY_MAX_FILES} 个文件；当前已有 ${currentCount} 个，本次还可上传 ${Math.max(0, UNVERIFIED_COMPANY_MAX_FILES - currentCount)} 个`);
  }
}

module.exports = {
  UNVERIFIED_COMPANY_MAX_FILES,
  UNVERIFIED_COMPANY_MAX_FILE_SIZE,
  assertUnverifiedCompanyUploadAllowed,
  getCompanyUploadedFileCount,
  isCompanyVerified,
  removeUploadedFiles,
};
