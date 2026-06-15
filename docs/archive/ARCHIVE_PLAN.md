# eu-doc 历史文档归档计划

本计划只说明建议如何整理历史文档，不代表已经移动或删除文件。

目标：减少 AI 每次进入项目时误读大量历史文档的概率。

## 暂时保留在根目录

建议根目录长期只保留：

- `README.md`
- `AGENTS.md`
- `CURRENT_STATUS.md`
- `package.json`
- `vite.config.js`
- `.gitignore`
- `.aiignore`

## 建议归档：修复类

移动到 `docs/archive/fixes/`：

- `BUG_FIX_2026-06-15.md`
- `I18N_FIX_2026-06-14.md`
- `docs/BUG_FIX_REPORT.md`

## 建议归档：总结类

移动到 `docs/archive/summaries/`：

- `COMPLETION_REPORT_2026-06-15.md`
- `COMPLETION_SUMMARY.md`
- `DAILY_SUMMARY_2026-06-14.md`
- `WORK_SUMMARY_2026-06-15.md`
- `docs/FINAL_COMPLETION_REPORT.md`
- `docs/FINAL_COMPLETION_REPORT_v2.md`
- `docs/FINAL_SUMMARY.md`
- `docs/FINAL_SUMMARY_REPORT.md`
- `docs/WORK_SUMMARY_2026-06-12-13.md`

## 建议归档：部署类

移动到 `docs/archive/deployment/`：

- `DEPLOYMENT_README.md`
- `DEPLOYMENT_SUCCESS.md`
- `docs/DEPLOYMENT.md`
- `docs/DEPLOYMENT_GUIDE.md`

## 建议归档：状态和计划类

移动到 `docs/archive/status-and-plans/`：

- `PROJECT_STATUS.md`
- `README_TOMORROW.md`
- `STATUS.md`
- `TODAY_STATUS.md`
- `WORK_PLAN_2026-06-15.md`
- `docs/FINAL_STATUS.md`
- `docs/PROGRESS_REPORT.md`
- `docs/PROJECT_REVIEW.md`
- `docs/IMPROVEMENT_SUGGESTIONS.md`

## 建议归档：版本和发布类

移动到 `docs/archive/releases/`：

- `MAJOR_UPDATE_v2.0.0.md`
- `UPDATE_LOG_2026-06-14.md`
- `VERSION_v1.0.1.md`
- `docs/FEATURE_RELEASE_v2.0.md`

## 建议保留但按需读取

这些文档可能有实际用途，但不应每次默认读取：

- `docs/SEARCHPAGE_I18N_GUIDE.md`
- `docs/DEV_ACCESS_GUIDE.md`
- `docs/PRIVACY_POLICY.md`
- `docs/TERMS_OF_SERVICE.md`
- `QUICK_START.md`

## 执行原则

- 先确认计划，再移动。
- 不删除文件。
- 不改业务代码。
- 移动前查看 Git 状态。
- 移动后检查链接是否受影响。
