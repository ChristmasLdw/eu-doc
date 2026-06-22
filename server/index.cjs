/**
 * EU-DOC 后端服务 - Express 服务入口
 * 版本: 1.0.1
 *
 * 职责:
 * - 加载环境变量配置（dotenv）
 * - 初始化数据库
 * - 配置 Express 中间件（CORS、JSON 解析、静态文件）
 * - 注册 API 路由
 * - 启动 HTTP 服务器
 *
 * 什么是 Express?
 * - Express 是 Node.js 最流行的 Web 框架
 * - 它封装了 Node.js 原生的 http 模块，提供了更简洁的 API
 * - 通过中间件机制处理请求/响应，支持路由组织
 *
 * 什么是 CORS?
 * - Cross-Origin Resource Sharing（跨域资源共享）
 * - 浏览器的安全机制会阻止网页从不同域名/端口请求后端 API
 * - CORS 中间件通过添加特定的 HTTP 响应头来允许跨域请求
 * - 开发环境中前端(localhost:5173)和后端(localhost:3001)是不同端口，需要 CORS
 */

// 加载 .env 环境变量文件（必须在最前面，因为其他模块可能依赖环境变量）
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { db, initDatabase } = require('./db.cjs');

// 创建 Express 应用实例
const app = express();
const PORT = process.env.PORT || 3007;

/**
 * 中间件配置（按顺序执行，顺序很重要）
 */

// CORS 跨域配置
// 允许前端开发服务器（Vite 默认端口 5173）访问后端 API
app.use(cors({
  origin: [
    'https://christmasldw.com',
    'http://christmasldw.com',
    'http://localhost:5173',  // Vite 开发服务器
    'http://localhost:5174',  // 备用端口
    'http://127.0.0.1:5173',
  ],
  credentials: true,  // 允许发送 Cookie
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// JSON 请求体解析
// 将请求体中的 JSON 字符串自动解析为 JavaScript 对象，挂载到 req.body 上
app.use(express.json({ limit: '10mb' }));

// 请求日志中间件（开发环境）
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 静态文件服务
// 让前端可以直接通过 URL 访问上传的文件（如 /uploads/xxx.pdf）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// 添加 /certificates 路径映射到 uploads/certificates
app.use('/certificates', express.static(path.join(__dirname, 'uploads/certificates')));
// 添加 /manuals 路径映射到 uploads/manuals
app.use('/manuals', express.static(path.join(__dirname, 'uploads/manuals')));
// 添加 /declarations 路径映射到 uploads/declarations
app.use('/declarations', express.static(path.join(__dirname, 'uploads/declarations')));

/**
 * API 路由注册
 * 所有 API 路由统一挂载在 /api 前缀下
 */
app.use('/api/auth', require('./routes/auth.cjs'));
app.use('/api/certificates', require('./routes/certificates.cjs'));  // v2.0 完整版本
app.use('/api/companies', require('./routes/companies.cjs'));
app.use('/api/stats', require('./routes/stats.cjs'));
app.use('/api/reports', require('./routes/reports.cjs'));

// v2.0 新 API
app.use('/api/v2/products', require('./routes/products.cjs'));
app.use('/api/v2/documents', require('./routes/documents.cjs'));
app.use('/api/v2/categories', require('./routes/categories.cjs'));
app.use('/api/v2/tags', require('./routes/tags.cjs'));

/**
 * 健康检查接口
 * 用于确认服务是否正常运行
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'EU-DOC API 服务运行中',
    timestamp: new Date().toISOString(),
  });
});

/**
 * 404 处理
 * 当请求的路径没有匹配到任何路由时返回
 */
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `接口不存在: ${req.method} ${req.originalUrl}`,
  });
});

/**
 * 全局错误处理中间件
 * 捕获路由中未处理的异常，避免服务崩溃
 * 注意：这个中间件必须有 4 个参数（err, req, res, next），Express 通过参数数量识别它
 */
app.use((err, req, res, _next) => {
  console.error(`[错误] ${err.message}`);
  console.error(err.stack);

  // multer 文件大小超限错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: '文件大小超过限制（最大 10MB）',
    });
  }

  res.status(500).json({
    success: false,
    message: '服务器内部错误',
  });
});

/**
 * 启动服务器
 */
function startServer() {
  // 初始化数据库（建表、创建默认管理员、导入 mock 数据）
  initDatabase();

  app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('  EU-DOC 后端 API 服务');
    console.log(`  地址: http://localhost:${PORT}`);
    console.log(`  API:  http://localhost:${PORT}/api`);
    console.log('='.repeat(50));
  });
}

// 启动服务
startServer();

// 进程退出时关闭数据库连接
process.on('SIGINT', () => {
  console.log('\n  [服务] 正在关闭...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});
