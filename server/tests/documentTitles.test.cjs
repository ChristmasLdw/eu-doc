const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildDocumentDownloadFilename,
  buildDocumentDisplayTitle,
  downloadFileExtension,
  internalTitleFromFilename,
  normalizePublicTitle,
  validatePublicTitle,
} = require('../utils/documentTitles.cjs');

test('the same model remains distinct across companies', () => {
  const base = {
    product_model: 'F66',
    document_type: 'declaration_of_conformity',
  };

  assert.equal(
    buildDocumentDisplayTitle({ ...base, company_name: 'A 品牌' }, 'zh'),
    'A 品牌 · F66 · DoC 声明'
  );
  assert.equal(
    buildDocumentDisplayTitle({ ...base, company_name: 'B 品牌' }, 'zh'),
    'B 品牌 · F66 · DoC 声明'
  );
});

test('generated document type labels follow the response language', () => {
  const document = {
    company_name: '示例企业',
    company_name_en: 'Example Company',
    product_name: '示例产品',
    product_name_en: 'Example Product',
    document_type: 'manual',
  };

  assert.equal(buildDocumentDisplayTitle(document, 'zh'), '示例企业 · 示例产品 · 使用说明书');
  assert.equal(buildDocumentDisplayTitle(document, 'en'), 'Example Company · Example Product · User Manual');
  assert.equal(buildDocumentDisplayTitle(document, 'de'), 'Example Company · Example Product · Bedienungsanleitung');
});

test('custom titles are cleaned without exposing file extensions', () => {
  assert.equal(normalizePublicTitle('  F66   Declaration.pdf  '), 'F66 Declaration');
  assert.equal(normalizePublicTitle('manual.PnG'), 'manual');
  assert.equal(internalTitleFromFilename('/tmp/F66-660_DE.png'), 'F66-660_DE');
});

test('company prefixes are fixed and are not duplicated', () => {
  const document = {
    company_name: 'A 品牌',
    product_model: 'F66',
    document_type: 'certificate',
  };

  assert.equal(
    buildDocumentDisplayTitle({ ...document, public_title: 'F66 EU Certificate' }, 'zh'),
    'A 品牌 · F66 EU Certificate'
  );
  assert.equal(
    buildDocumentDisplayTitle({ ...document, public_title: 'A 品牌 · F66 EU Certificate' }, 'zh'),
    'A 品牌 · F66 EU Certificate'
  );
});

test('optional custom titles must contain 2 to 80 characters', () => {
  assert.equal(validatePublicTitle(''), null);
  assert.equal(validatePublicTitle(' 合规声明.pdf '), '合规声明');
  assert.throws(() => validatePublicTitle('A'), { code: 'INVALID_PUBLIC_TITLE' });
  assert.throws(() => validatePublicTitle('A'.repeat(81)), { code: 'INVALID_PUBLIC_TITLE' });
  assert.equal(validatePublicTitle('证'.repeat(80)), '证'.repeat(80));
});

test('download filenames use public document facts instead of original names', () => {
  assert.equal(buildDocumentDownloadFilename({
    id: 100,
    product_id: 53,
    product_model: 'F66-660',
    document_type: 'declaration_of_conformity',
    language: 'de',
    original_filename: 'internal_upload_name.png',
  }), 'F66-660_DoC_DE_EU-D-000100.png');

  assert.equal(buildDocumentDownloadFilename({
    id: 9,
    product_model: 'F66 / 660',
    document_type: 'manual',
    language: 'en',
    version: 'V1/2',
    file_path: '/documents/private-storage-name.PDF',
  }), 'F66-660_Manual_EN_V1-2.pdf');
});

test('download extensions fall back to MIME type and a safe binary extension', () => {
  assert.equal(downloadFileExtension({ mime_type: 'application/pdf' }), 'pdf');
  assert.equal(downloadFileExtension({ mime_type: 'application/octet-stream' }), 'bin');
});
