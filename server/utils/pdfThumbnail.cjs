/**
 * PDF 缩略图生成工具（使用 pdftoppm + sharp）
 * 版本: 1.0.1
 */

const { exec } = require("child_process");
const { promisify } = require("util");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const execPromise = promisify(exec);

async function generateThumbnail(pdfPath, certNo) {
  try {
    const thumbnailDir = path.join(__dirname, "..", "uploads", "certificates", "thumbnails");
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    const tempDir = path.join(__dirname, "..", "uploads", "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const tempPrefix = `temp_${timestamp}`;
    const tempPngPath = path.join(tempDir, `${tempPrefix}.png`);
    
    // 使用 pdftoppm 将 PDF 第一页转为 PNG
    const cmd = `pdftoppm -png -f 1 -l 1 -scale-to 1024 "${pdfPath}" "${path.join(tempDir, tempPrefix)}"`;
    await execPromise(cmd);

    // pdftoppm 生成的文件名会带 -1 后缀
    const generatedFile = path.join(tempDir, `${tempPrefix}-1.png`);
    
    if (!fs.existsSync(generatedFile)) {
      throw new Error("PDF 转换失败，临时文件不存在");
    }

    const outputFilename = `${certNo.replace(/[^a-zA-Z0-9-_]/g, "_")}-01.png`;
    const outputPath = path.join(thumbnailDir, outputFilename);

    await sharp(generatedFile)
      .resize(800, null, { fit: "inside", withoutEnlargement: true })
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(outputPath);

    try {
      fs.unlinkSync(generatedFile);
    } catch (err) {
      console.warn("删除临时文件失败:", err.message);
    }

    return `/certificates/thumbnails/${outputFilename}`;
  } catch (error) {
    console.error("生成缩略图失败:", error.message);
    throw new Error(`生成缩略图失败: ${error.message}`);
  }
}

module.exports = { generateThumbnail };
