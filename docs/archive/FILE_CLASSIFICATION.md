# eu-doc 文件六类分类清单

生成日期：2026-06-15

本文件只做分类说明，不代表已经移动、删除或修改任何文件。

## 分类原则

本项目文件按 6 类管理：

1. 源代码
2. AI 工作指南
3. 正式项目文档
4. 数据与备份
5. 配置与部署
6. 历史归档

重要原则：

- 能分类不代表能移动。
- 源代码、数据、上传文件、数据库、构建产物不要随便移动。
- 历史 Markdown 文档可以优先归档。
- 依赖目录和数据库文件未来应处理 Git 跟踪，但不应直接删除本地文件。

## 1. 源代码

这些文件和目录与项目运行直接相关，暂时不要移动：

- `src/`
- `server/`
- `index.html`
- `package.json`
- `package-lock.json`
- `vite.config.js`

说明：

- `src/` 是前端源码。
- `server/` 是后端源码，但其中也混有数据、上传文件和依赖目录。
- `package-lock.json` 虽然不是手写代码，但用于锁定依赖版本，应保留。

## 2. AI 工作指南

这些文件用于指导 AI 高效工作，应该保留在根目录，方便 AI 进入项目时优先读取：

- `AGENTS.md`
- `CURRENT_STATUS.md`
- `.aiignore`

说明：

- `AGENTS.md` 是长期规则。
- `CURRENT_STATUS.md` 是短状态摘要。
- `.aiignore` 告诉 AI 默认不要读哪些大目录和历史文件。

## 3. 正式项目文档

这些文档有长期参考价值，建议保留或整理到 `docs/guides/`、`docs/legal/` 等正式目录中：

- `README.md`
- `QUICK_START.md`
- `LICENSE`
- `docs/DEV_ACCESS_GUIDE.md`
- `docs/SEARCHPAGE_I18N_GUIDE.md`
- `docs/PRIVACY_POLICY.md`
- `docs/TERMS_OF_SERVICE.md`

说明：

- `README.md` 和 `LICENSE` 建议保留根目录。
- `QUICK_START.md` 可保留根目录，也可放入 `docs/guides/`。
- 隐私政策、服务条款属于正式文档，不建议归入历史归档。

## 4. 数据与备份

这些文件可能包含业务数据或用户上传内容，不应默认让 AI 读取，也不应随便删除或移动：

- `server/uploads/`
- `server/data/`
- `server/database.sqlite`
- `server/eu-doc.db`
- `server/data/eu-doc.db`
- `server/data/eu-doc.db-shm`
- `server/data/eu-doc.db-wal`

说明：

- `server/uploads/` 可能包含证书 PDF 和缩略图。
- 数据库文件可能包含账号、证书、上传记录等数据。
- 未来建议：先备份，再取消 Git 跟踪；不要直接删除。

## 5. 配置与部署

这些文件用于配置、部署、忽略规则或辅助运维：

- `.gitignore`
- `.version`
- `deploy.sh`
- `ssl-setup.sh`
- `test-deployment.sh`
- `DEPLOYMENT_README.md`，建议未来归档到部署类历史目录
- `DEPLOYMENT_2026-06-15.md`，建议未来归档到部署类历史目录
- `DEPLOYMENT_SUCCESS.md`，建议未来归档到部署类历史目录
- `docs/DEPLOYMENT.md`，建议未来归档或整理到正式部署指南
- `docs/DEPLOYMENT_GUIDE.md`，建议未来保留为正式部署指南或归档旧版

说明：

- 脚本文件移动前要确认是否被部署流程引用。
- 部署类 Markdown 如果只是历史记录，适合归档；如果是当前有效说明，应整理成正式文档。

## 6. 历史归档

这些文件主要是历史记录、总结、修复说明、旧计划或旧发布记录。建议未来移动到 `docs/archive/` 下分类保存。

### 6.1 修复类

建议归档到 `docs/archive/fixes/`：

- `BUG_FIX_2026-06-15.md`
- `I18N_FIX_2026-06-14.md`
- `docs/BUG_FIX_REPORT.md`

### 6.2 总结类

建议归档到 `docs/archive/summaries/`：

- `COMPLETION_REPORT_2026-06-15.md`
- `COMPLETION_SUMMARY.md`
- `DAILY_SUMMARY_2026-06-14.md`
- `WORK_SUMMARY_2026-06-15.md`
- `docs/FINAL_COMPLETION_REPORT.md`
- `docs/FINAL_COMPLETION_REPORT_v2.md`
- `docs/FINAL_SUMMARY.md`
- `docs/FINAL_SUMMARY_REPORT.md`
- `docs/WORK_SUMMARY_2026-06-12-13.md`

### 6.3 状态和计划类

建议归档到 `docs/archive/status-and-plans/`：

- `PROJECT_STATUS.md`
- `README_TOMORROW.md`
- `STATUS.md`
- `TODAY_STATUS.md`
- `WORK_PLAN_2026-06-15.md`
- `docs/FINAL_STATUS.md`
- `docs/PROGRESS_REPORT.md`
- `docs/PROJECT_REVIEW.md`
- `docs/IMPROVEMENT_SUGGESTIONS.md`

### 6.4 发布和版本类

建议归档到 `docs/archive/releases/`：

- `MAJOR_UPDATE_v2.0.0.md`
- `UPDATE_LOG_2026-06-14.md`
- `VERSION_v1.0.1.md`
- `docs/FEATURE_RELEASE_v2.0.md`

### 6.5 旧代码备份和补丁

建议人工确认后归档到 `docs/archive/code-backups/`：

- `server/routes/certificates-upload-patch.txt`
- `server/routes/certificates.cjs.backup-20260609-165928`
- `server/routes/certificates.cjs.pre-thumbnail-backup`
- `src/pages/HomePage.jsx.backup-20260609-165307`

说明：

- 这些可能是旧修复过程中的备份文件。
- 第一阶段建议归档，不建议直接删除。

## 特殊类别：依赖和构建产物

这两类可以归入“源代码相关运行产物”，但不应进入 Git，也不应让 AI 默认读取。

### 依赖目录

- `node_modules/`
- `server/node_modules/`

建议：

- 不移动。
- 不删除。
- 未来从 Git 跟踪中移除。
- 依赖应通过 `npm install` 重建。

### 构建产物

- `dist/`

建议：

- 不手动修改。
- 不默认让 AI 读取。
- 是否保留取决于部署方式。
- 如果线上部署依赖 `dist/`，移动会影响部署。

## 可以清理的系统临时文件

- `.DS_Store`

建议：

- 可删除。
- 应确保 `.gitignore` 忽略它。

## 建议执行顺序

如果后续要真正整理，建议顺序如下：

1. 先归档历史 Markdown 文档。
2. 再归档旧代码备份和补丁文件。
3. 清理 `.DS_Store`。
4. 处理 Git 中已跟踪的 `node_modules/`。
5. 备份数据库后，处理 Git 中已跟踪的数据库文件。
6. 最后再考虑数据备份和上传文件长期存储方案。

## 不建议移动的文件

短期内不要移动：

- `src/`
- `server/`
- `index.html`
- `package.json`
- `package-lock.json`
- `vite.config.js`
- `server/uploads/`
- `server/data/`
- 数据库文件
- `dist/`，除非确认部署方式不依赖它

## 总结

六类分类可以覆盖当前项目文件，但实际操作时必须区分：

- 可以归类
- 可以归档
- 可以取消 Git 跟踪
- 可以删除
- 不能移动

当前最安全的下一步是：只归档历史 Markdown，不处理代码、不处理数据库、不处理上传文件。
