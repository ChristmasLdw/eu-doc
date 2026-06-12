/**
 * EU-DOC 后端服务 - 证书 CRUD 路由
 * 版本: 1.0.3
 *
 * 变更记录 (1.0.3):
 * - 修改 POST /:id/upload - 上传 PDF 后自动生成缩略图
 * - 文件保存到 certificates 目录，按证书编号命名
 * - 自动更新 thumbnail_path 字段
 */

const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const { db } = require("../db.cjs");
const { authMiddleware, requireAdmin } = require("../middleware/auth.cjs");
const { generateThumbnail } = require("../utils/pdfThumbnail.cjs");

const router = Router();
