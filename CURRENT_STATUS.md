# eu-doc 当前状态

最后更新：2026-06-16 23:40:00 CST
当前版本：v1.6.1

## 项目简介

`eu-doc` 是 EU 文档/证书管理与展示工具。

技术栈：

- 前端：Vite + React
- 样式：CSS Modules + `src/styles/global.css`
- 后端：Express
- 数据库：SQLite
- 文件上传：`server/uploads/`

## 当前工作原则

为了减少 token 消耗，AI 每次不要从头扫描整个项目。

默认先读：

1. `AGENTS.md`
2. `CURRENT_STATUS.md`
3. 当前问题对应的 2 到 5 个源码文件

当用户说“继续工作”、检查版本、检查备份、总结当天工作时，再读取：

- `WORKFLOW.md`
- `TODO.md`
- `WORK_LOG.md`

## 常见问题入口

- 搜索页：`src/pages/SearchPage.jsx` + `src/pages/SearchPage.module.css`
- 首页：`src/pages/HomePage.jsx` + `src/pages/HomePage.module.css`
- 证书详情页：`src/pages/CertificatePage.jsx` + `src/pages/CertificatePage.module.css`
- 企业页面：`src/pages/CompanyPage.jsx` + `src/pages/CompanyPage.module.css`
- 导航栏：`src/components/Navbar.jsx` + `src/components/Navbar.module.css`
- 全局主题：`src/styles/global.css` + `src/contexts/ThemeContext.jsx`
- 多语言：`src/i18n/index.js` + `src/i18n/locales/zh.json` + `src/i18n/locales/en.json`
- 管理后台：`src/pages/admin/`
- API：`src/services/api.js` + `server/routes/`
- 后端入口：`server/index.cjs`
- 数据库逻辑：`server/db.cjs`

## 当前备份与版本状态

- 当前本地 Git 与 GitHub 已同步。
- `node_modules/` 已停止 Git 跟踪，本地依赖文件仍保留。
- 当前版本以 `.version` 为准：`v1.6.1`。
- 后续每天结束、部署前、重要功能完成后，仍需确认 commit 和 push。

## 默认不要读取

- `node_modules/`
- `server/node_modules/`
- `dist/`
- `server/uploads/`
- `server/data/`
- 数据库文件
- `docs/archive/`
- 历史总结、部署报告、完成报告类 Markdown
