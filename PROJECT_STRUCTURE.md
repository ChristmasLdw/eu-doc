# eu-doc 项目结构说明

本文件用于帮助用户和 AI 快速理解文件夹分类，减少无效读取，避免浪费 token。

## 核心原则

- 源代码和运行路径保持原位，不为了分类而移动。
- AI 优先读取根目录的 `AGENTS.md` 和 `CURRENT_STATUS.md`。
- 历史文档放入 `docs/archive/`，默认不读取。
- 数据、上传文件、数据库、依赖目录不默认读取。

## 根目录入口

- `AGENTS.md`：AI 长期工作规则，必须优先读取。
- `CURRENT_STATUS.md`：当前状态摘要，必须优先读取。
- `PROJECT_STRUCTURE.md`：项目结构说明。
- `README.md`：项目基础说明。
- `QUICK_START.md`：快速启动说明。

## 源代码

不要移动这些路径，否则可能影响功能：

- `src/`：前端源代码。
- `server/`：后端源代码，以及部分本地数据目录。
- `index.html`：Vite 入口 HTML。
- `vite.config.js`：Vite 构建配置。
- `package.json`：项目脚本和依赖声明。
- `package-lock.json`：依赖锁定文件。

## AI 工作指南

- `AGENTS.md`：主要 AI 工作规则。
- `CURRENT_STATUS.md`：当前短状态。
- `.aiignore`：AI 默认忽略清单。
- `docs/ai-guides/`：AI 补充说明，不作为默认入口。

## 正式项目文档

- `docs/guides/`：正式指南。
- `docs/legal/`：法律和合规文档。
- `docs/README.md`：文档目录说明。

## 历史归档

- `docs/archive/`：历史文档归档。
- `docs/archive/deployment/`：部署历史。
- `docs/archive/fixes/`：修复记录。
- `docs/archive/releases/`：版本和发布记录。
- `docs/archive/status-and-plans/`：旧状态和计划。
- `docs/archive/summaries/`：旧总结。

AI 默认不读取 `docs/archive/`，除非用户要求追溯历史。

## 数据与备份

这些路径不要随便移动、删除或让 AI 默认读取：

- `server/uploads/`：上传文件，例如证书 PDF 和缩略图。
- `server/data/`：本地数据库运行数据。
- `server/*.db`：SQLite 数据库文件。

这些文件未来应有独立备份方案，不建议直接提交到 GitHub。

## 依赖和构建产物

这些路径不要默认读取，也不应手动编辑：

- `node_modules/`：前端依赖目录。
- `server/node_modules/`：后端依赖目录。
- `dist/`：前端构建产物。

## 配置与部署

- `.gitignore`：Git 忽略规则。
- `.aiignore`：AI 忽略建议。
- `.version`：版本记录。
- `deploy.sh`：部署脚本。
- `ssl-setup.sh`：SSL 配置脚本。
- `test-deployment.sh`：部署测试脚本。

移动部署脚本前必须确认线上部署流程是否依赖它们。

## 常见任务的读取范围

- 搜索页样式/下拉栏：`src/pages/SearchPage.jsx`、`src/pages/SearchPage.module.css`、`src/styles/global.css`
- 首页问题：`src/pages/HomePage.jsx`、`src/pages/HomePage.module.css`
- 导航栏问题：`src/components/Navbar.jsx`、`src/components/Navbar.module.css`
- 多语言问题：`src/i18n/`
- 后端 API 问题：`src/services/api.js`、`server/routes/`、`server/index.cjs`

## 不要默认读取

- `node_modules/`
- `server/node_modules/`
- `dist/`
- `server/uploads/`
- `server/data/`
- 数据库文件
- `docs/archive/`

## 近期工作文档三天规则

根目录可以保留最近三天的工作类文档，方便用户和 AI 快速接续工作。

例如：

- 今日工作总结
- 明日工作规划
- 当前状态
- 最近完成报告
- 最近修复说明

超过三天的工作类文档应移动到：

- `docs/archive/summaries/`
- `docs/archive/status-and-plans/`
- `docs/archive/fixes/`
- `docs/archive/releases/`
- `docs/archive/deployment/`

AI 默认不读取 `docs/archive/`，除非用户明确要求追溯历史。
