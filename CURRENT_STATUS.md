# eu-doc 当前状态

最后更新：2026-06-15

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

## 当前已知 token 消耗风险

不要默认读取：

- `node_modules/`
- `server/node_modules/`
- `dist/`
- `server/uploads/`
- `server/data/`
- 数据库文件
- 历史总结、部署报告、完成报告类 Markdown

## 搜索页下拉栏问题提示

如果用户提到“下拉栏背景透明度”“筛选下拉”“排序下拉”“搜索建议下拉”，优先查看：

- `src/pages/SearchPage.jsx`
- `src/pages/SearchPage.module.css`
- `src/styles/global.css`

不要扫描后端和历史文档。

## 后续建议

1. 先使用本文件和 `AGENTS.md` 约束 AI 读取范围。
2. 再确认 `docs/archive/ARCHIVE_PLAN.md`。
3. 用户确认后，才考虑移动历史文档到 `docs/archive/`。
