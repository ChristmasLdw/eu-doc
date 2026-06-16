# eu-doc AI 工作规则

## 项目定位

`eu-doc` 是 EU 文档/证书工具，技术栈为 Vite + React + Express + SQLite。

用户不是程序员，因此 AI 不应要求用户精准指出文件路径。AI 应根据问题类型自动选择最小必要文件范围，避免从头到尾扫描整个项目。

## 每次开始工作的必读文件

AI 每次处理本项目时，默认只先读：

1. `AGENTS.md`
2. `CURRENT_STATUS.md`
3. 与当前问题最相关的少量源码文件

不要默认读取所有 README、历史总结、部署报告和 docs 全部内容。

## 默认不要读取的目录和文件

除非用户明确要求，AI 不要读取：

- `node_modules/`
- `server/node_modules/`
- `dist/`
- `server/uploads/`
- `server/data/`
- `*.db`
- `*.db-shm`
- `*.db-wal`
- `package-lock.json`，除非处理依赖问题
- 根目录历史总结类 Markdown
- `docs/archive/`
- 历史报告、完成报告、部署成功报告、每日总结

这些内容通常对修复页面样式、小交互、文案问题没有帮助，会大量浪费 token。

## 按问题类型自动选择文件

### 样式、颜色、透明度、布局问题

优先读取：

- 对应页面或组件的 `.module.css`
- 对应页面或组件的 `.jsx`
- `src/styles/global.css`

不要读取后端、数据库、上传文件、构建产物。

### 搜索页问题

优先读取：

- `src/pages/SearchPage.jsx`
- `src/pages/SearchPage.module.css`
- `src/styles/global.css`

### 首页问题

优先读取：

- `src/pages/HomePage.jsx`
- `src/pages/HomePage.module.css`
- `src/styles/global.css`

### 证书详情页问题

优先读取：

- `src/pages/CertificatePage.jsx`
- `src/pages/CertificatePage.module.css`
- `src/components/StatusBadge.jsx`
- `src/components/StatusBadge.module.css`

### 企业页面问题

优先读取：

- `src/pages/CompanyPage.jsx`
- `src/pages/CompanyPage.module.css`

### 导航栏、主题切换、语言切换问题

优先读取：

- `src/components/Navbar.jsx`
- `src/components/Navbar.module.css`
- `src/contexts/ThemeContext.jsx`
- `src/i18n/index.js`
- `src/i18n/locales/zh.json`
- `src/i18n/locales/en.json`

### 管理后台页面问题

优先读取：

- `src/pages/admin/` 下对应页面的 `.jsx`
- `src/pages/admin/` 下对应页面的 `.module.css`
- 必要时读取 `src/contexts/AdminContext.jsx`

### API、上传、登录、数据库问题

只有这类问题才读取后端文件：

- `server/index.cjs`
- `server/db.cjs`
- `server/routes/`
- `server/middleware/`
- `src/services/api.js`

不要读取真实数据库文件内容。

## 工作方式

1. 先判断问题类型。
2. 只读取最相关的 2 到 5 个文件。
3. 如果信息不够，再逐步扩大范围。
4. 修改前先说明计划。
5. 修改后说明改了什么、为什么改、如何验证。
6. 不要读取或打印真实密钥、数据库内容、上传文件内容。

## 用户模糊提问时的处理

如果用户说“下拉栏不清楚”“按钮不好看”“页面太透明”等非程序员表达，AI 应自动推断问题区域，并先从对应页面的 JSX 和 CSS 文件查起。

不要要求用户必须提供精确文件路径。

## 禁止行为

- 不要全项目递归读取。
- 不要默认扫描 `server/`。
- 不要默认扫描 `node_modules/`。
- 不要默认扫描 `dist/`。
- 不要默认读取历史 Markdown。
- 不要直接改线上环境。
- 不要删除文件，除非用户明确要求。

## 近期工作文档三天规则

为了让用户和 AI 都能快速接续工作，根目录允许保留最近三天的工作类文档。

工作类文档包括：

- 今日工作总结
- 明日工作规划
- 当前状态记录
- 最近修复说明
- 最近完成报告

规则：

- 最近三天内的工作类文档可以放在根目录，方便 AI 快速了解当前进展。
- 超过三天的工作类文档应移动到 `docs/archive/` 下对应分类。
- AI 默认只读取根目录近期工作文档，不读取 `docs/archive/`。
- 如果用户要求追溯历史，AI 才读取 `docs/archive/`。
- 如果根目录近期文档过多，应优先保留总览类文档，减少重复。

当前日期以用户环境日期为准。

## 统一工作流文件规则

为避免重复文档导致 token 浪费，本项目统一使用以下工作文件：

- `WORKFLOW.md`：工作流规则，记录版本号、TODO、工作日志、每日总结、继续工作规则。
- `TODO.md`：当前任务清单，只保留当前任务、未完成任务和最近三天重要任务。
- `WORK_LOG.md`：最近三天工作日志、每日总结和下一步计划。

AI 在以下场景必须读取这些文件：

- 用户说“继续工作”。
- 用户要求总结今天工作。
- 用户要求规划明天工作。
- 用户要求开始新任务或新功能。
- 用户要求检查当前进度。

禁止默认新建重复的工作总结文件，例如：

- `DAILY_SUMMARY_xxx.md`
- `WORK_SUMMARY_xxx.md`
- `README_TOMORROW.md`
- `COMPLETION_REPORT_xxx.md`

除非用户明确要求导出单独报告，否则相关内容应写入 `WORK_LOG.md`。

当任务完成或未完全完成时：

1. 优先更新 `TODO.md` 状态。
2. 必要时更新 `CURRENT_STATUS.md`。
3. 不要每次小工作都更新 `WORK_LOG.md`。
4. 只有用户要求“总结今天工作”，或完成重要阶段性成果时，才更新 `WORK_LOG.md`。

## 前一天总结/计划读后归档规则

当用户第二天说“继续工作”时，AI 应读取 `WORK_LOG.md` 中最近一次当日总结和下一步计划。理解完成后，旧的单独总结/计划文件应归档到 `docs/archive/`，不要继续留在根目录造成重复读取。

当天新的总结和下一步计划继续写入 `WORK_LOG.md`，默认不再新建额外总结文件。


## 避免频繁总结

用户希望一天持续工作，到最后主动要求总结时再汇总。

AI 不应每完成一次小任务就自动写完整总结。

工作中应：

- 专注执行当前任务。
- 必要时更新 `TODO.md` 状态。
- 在回复中简短说明当前完成内容。
- 不频繁追加 `WORK_LOG.md`。

当用户说“总结今天工作”时，再一次性更新 `WORK_LOG.md`，记录当天工作内容、完成情况、未完善事项和下一步计划。
