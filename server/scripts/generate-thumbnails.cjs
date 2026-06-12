/**
 * 批量为现有证书生成缩略图脚本
 */

const path = require("path");
const { db } = require("../db.cjs");
const { generateThumbnail } = require("../utils/pdfThumbnail.cjs");
const fs = require("fs");

async function main() {
  console.log("开始批量生成缩略图...\n");

  const certs = db.prepare(`
    SELECT id, cert_no, file_path, thumbnail_path 
    FROM certificates 
    WHERE file_path IS NOT NULL 
    AND file_path != ''
  `).all();

  console.log(`找到 ${certs.length} 条有 PDF 的证书\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const cert of certs) {
    if (cert.thumbnail_path) {
      console.log(`⊙ 证书 ${cert.cert_no} 已有缩略图，跳过`);
      skipped++;
      continue;
    }

    let pdfPath;
    if (cert.file_path.startsWith("/certificates/")) {
      pdfPath = path.join(__dirname, "..", "uploads", cert.file_path.replace("/", ""));
    } else if (cert.file_path.startsWith("/uploads/")) {
      pdfPath = path.join(__dirname, "..", cert.file_path.replace("/uploads/", "uploads/"));
    } else {
      pdfPath = path.join(__dirname, "..", "uploads", cert.file_path);
    }

    if (!fs.existsSync(pdfPath)) {
      console.log(`✗ 证书 ${cert.cert_no} 的 PDF 文件不存在: ${pdfPath}`);
      failed++;
      continue;
    }

    try {
      const thumbnailPath = await generateThumbnail(pdfPath, cert.cert_no);
      db.prepare("UPDATE certificates SET thumbnail_path = ? WHERE id = ?").run(thumbnailPath, cert.id);
      console.log(`✓ 证书 ${cert.cert_no} 缩略图生成成功: ${thumbnailPath}`);
      success++;
    } catch (error) {
      console.log(`✗ 证书 ${cert.cert_no} 生成失败: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n========== 完成 ==========`);
  console.log(`成功: ${success}`);
  console.log(`失败: ${failed}`);
  console.log(`跳过: ${skipped}`);
  console.log(`总计: ${certs.length}`);
}

main().catch(console.error);
