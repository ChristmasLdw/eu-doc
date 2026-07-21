# eu-doc TODO

最后更新：2026-07-21 CST
当前版本：v2.8.1
当前阶段：第一阶段 - 地基功能建设（基本完成）

---

## 已完成 ✅

### EU-T036 企业文件审核状态与通知闭环（v2.8.1）
**状态**：✅ 已完成，待部署
**完成时间**：2026-07-21

- [x] 企业资料管理显示待审核、已公开和审核未通过状态
- [x] 人工审核阶段明确提示“待平台审核，请联系管理员”
- [x] 审核拒绝后展示平台审核意见
- [x] 审核通过或拒绝后通知上传者及企业负责人
- [x] 企业成员替换文件后重新进入待审核并清除旧审核结果
- [x] 安全回归测试 15 项通过，生产构建通过


### EU-T035 平台管理真实数据闭环（v2.8.0）
**状态**：✅ 已完成并部署
**完成时间**：2026-07-21

- [x] 修复“分类管理”误显示为“内容举报”
- [x] 企业审核统计读取全部真实状态，并支持查看企业认证材料
- [x] 企业待审核文件按公司汇总，可逐份预览、通过或拒绝
- [x] 用户查询接入真实账号、企业关系和账号状态，支持平台权限与禁用处理
- [x] 内容举报接入真实举报记录、详情和处理状态
- [x] 分类管理支持搜索、新增、子分类新增和编辑
- [x] 平台设置支持真实读取、保存和审计记录
- [x] 普通、证书和批量上传审核口径统一，企业成员上传均进入待审核
- [x] 安全回归测试 14 项通过，生产构建通过


### EU-T033 平台级成员监管与全局日志（v2.7.0）
**状态**：✅ 已完成并部署
**完成时间**：2026-07-18

- [x] 平台管理员可只读查看任意公司的真实成员
- [x] 平台管理员不会被写入企业成员表，也没有企业成员修改按钮
- [x] 新增全平台操作记录页面，可按公司、类型、时间和关键词筛选
- [x] 公司和全平台操作记录默认展示全部时间
- [x] 旧全局日志接口收紧为仅平台管理员访问
- [x] 本地验证平台管理员可读取公司成员和全局日志，未登录访问返回 `401`

### EU-T032 企业申请人角色兼容（v2.6.1）
**状态**：✅ 已完成
**完成时间**：2026-07-18

- [x] 员工权限页展示认证前的 `applicant` 成员
- [x] 企业申请人显示为“认证前拥有者权限”
- [x] 企业申请人可管理普通成员，但不能降级或移除自己
- [x] 生产构建与后端语法检查通过

### EU-T031 企业成员与操作记录真实化（v2.6.0）
**状态**：✅ 已完成
**完成时间**：2026-07-18

- [x] 员工权限页读取真实企业成员和角色数量
- [x] 添加已注册成员、修改角色、移除成员
- [x] 成员变更补写真实审计日志
- [x] 公司操作记录按公司隔离并支持筛选、搜索和 CSV 导出
- [x] 生产构建、后端语法和路由鉴权检查通过
- [ ] 使用真实企业拥有者账号完成线上交互复查

### 数据架构 (v2.0)
- ✅ 数据库升级：企业 → 产品 → 文档三级架构
- ✅ 33个 API 端点全部完成
- ✅ 旧数据迁移（47个产品 + 47个文档）
- ✅ 修复企业/统计/报告 API（适配新表结构）

### 前台功能
- ✅ 首页、搜索页、证书详情页、企业详情页
- ✅ 搜索结果点击跳转产品详情页
- ✅ 产品详情页展示文档列表
- ✅ 证书文件路径（PDF/缩略图/DoC/说明书）

### 管理后台
- ✅ 登录页面
- ✅ 产品管理页面（列表/创建/编辑）
- ✅ 文档上传页面
- ✅ 证书管理页面
- ✅ 企业管理页面
- ✅ 操作日志页面

### 数据清理
- ✅ 删除重复企业数据
- ✅ 企业名称 UNIQUE 约束

---

## 第一优先级：地基（必须现在做）

### P0-1 用户认证体系
**状态**：✅ 已完成（v2.3.0）

- [x] 升级 `users` 表结构（v2.0 已完成）
  - email（唯一）
  - phone（可选）
  - password_hash
  - display_name
  - email_verified
  - phone_verified
  - platform_role（admin / user）
  - status
- [x] 邮箱注册流程
- [x] 邮箱验证（开发环境返回 token）
- [x] 密码加密存储（已有 bcrypt）
- [x] 忘记密码 / 重置密码
- [x] 登录/注册页面（已有）
- [x] 个人设置页面（修改密码）

### P0-2 企业认证流程
**状态**：✅ 已完成（v2.4.0）

- [x] 企业注册流程（v2.0 已有）
- [x] 企业认证资料提交
  - 营业执照照片
  - 授权书（可选）
- [x] 管理员审核界面
  - 查看认证资料
  - 通过 / 拒绝
  - 备注
- [x] 认证状态管理
  - unverified → pending → verified → rejected
- [x] 前台显示企业认证状态
- [x] 后端 API 完整实现

### P0-3 企业成员权限
**状态**：✅ 已完成（v2.4.0 + v2.5.0）

- [x] `company_members` 表（v2.0 已完成）
- [x] 成员邀请流程（v2.0 API 已有）
- [x] 权限控制中间件
  - Owner：全部权限
  - Admin：管理产品和文档
  - Uploader：只能上传文档
  - Viewer：只能查看
- [x] 文档上传权限检查
- [x] 产品管理权限检查
- [x] 企业切换功能（一个用户可属于多个企业）
- [ ] 更多 API 的权限检查（编辑、删除等）
- [x] 成员管理页面接入真实成员数据
- [x] 支持添加已注册成员、修改角色、移除成员
- [x] 成员变更写入企业操作记录
- [x] 企业操作记录接入真实审计日志，支持筛选和 CSV 导出

### P0-4 上传确认与免责声明
**状态**：✅ 已完成（v2.3.0）

- [x] 上传前勾选确认
  - ☑ 我确认此文档真实有效
  - ☑ 我确认本人有权代表该企业上传此文档
  - ☑ 我已阅读并同意免责声明和上传承诺书
- [x] `upload_confirmations` 表记录（v2.0 已完成）
- [x] 后端 API 保存确认记录
- [x] 管理员可查看上传确认记录
- [x] 确认勾选框链接到法律页面

### P0-5 法律页面
**状态**：✅ 已完成（v2.3.0）

- [x] 免责声明页面（v2.2 已有）
- [x] 企业入驻协议页面（v2.2 已有）
- [x] 上传承诺书页面（新建）
- [x] 联系我们页面（v2.2 已有）
- [x] Footer 添加完整链接
- [x] 上传页链接到免责声明和上传承诺书

### P0-6 环境变量配置
**状态**：✅ 已完成（v2.3.0）

- [x] 前端环境变量
  - VITE_APP_BASE_PATH
  - VITE_API_BASE_URL
- [x] 后端环境变量
  - DATABASE_PATH
  - UPLOAD_DIR
  - PUBLIC_FILE_BASE_URL
  - APP_ENV
  - SMTP_*（预留）
- [x] 创建 .env.example 文件
- [x] 创建 src/config/env.js 统一管理

---

## 第二优先级：核心功能完善

### P1-1 文档管理功能
**状态**：未开始

- [ ] 文档列表页面（按产品分组）
- [ ] 文档编辑功能
  - 修改标题、类型、语言
  - 修改证书元数据（编号、标准、有效期等）
- [ ] 文档删除功能（软删除）
- [ ] 文档状态管理（approved / pending / rejected）
- [ ] 文档版本管理（证书更新时保留旧版本）

### P1-2 企业管理页面完善
**状态**：部分完成

- [ ] 企业创建功能
- [ ] 企业编辑功能
- [ ] 企业删除功能
- [ ] 企业认证状态显示
- [ ] 企业成员管理界面

### P1-3 产品详情页完善
**状态**：部分完成

- [ ] 文档内嵌预览（不跳转）
- [ ] 文档下载按钮
- [ ] 分享产品链接
- [ ] 产品编辑入口（管理员）
- [ ] 文档审核状态显示

### P1-4 数据备份方案
**状态**：未开始

- [ ] 数据库备份脚本
- [ ] 上传文件备份脚本
- [ ] 备份命名规范
- [ ] 恢复步骤文档
- [ ] 定时备份配置

---

## 第三优先级：体验优化

### EU-T034 批量上传问卷滚动定位优化
**状态**：未开始
**创建时间**：2026-07-21
**关联版本**：待定

- [ ] 点击每一步确认后，精确滚动到下一步的确认按钮，而不是整个问卷区块中心
- [ ] 将滚动范围限制在批量上传确认弹窗内部，避免带动后台外层页面
- [ ] 使用 React 渲染完成后的可靠定位，替换固定 `60ms` 延时
- [ ] 验证桌面端、移动端以及不同窗口高度下的滚动位置

### P2-1 移动端适配
**状态**：未开始

- [ ] 管理后台响应式优化
- [ ] 产品详情页移动端适配
- [ ] 搜索结果页移动端适配
- [ ] 文档预览移动端适配

### P2-2 搜索优化
**状态**：未开始

- [ ] 搜索结果高亮
- [ ] 搜索建议
- [ ] 热门搜索
- [ ] 搜索历史
- [ ] 按分类筛选
- [ ] 按标签筛选

### P2-3 批量上传
**状态**：未开始

- [ ] 多文件选择
- [ ] 批量填写信息
- [ ] 上传进度显示
- [ ] 上传结果汇总

### P2-4 用户指引
**状态**：未开始

- [ ] 新手引导页面
- [ ] B端企业使用教程
- [ ] C端用户使用教程
- [ ] 审批机构使用指南
- [ ] 常见问题 FAQ

---

## 第四优先级：商业化预留

### P3-1 收费体系（预留表结构）
**状态**：未开始

- [ ] `plans` 表（套餐定义）
  - name
  - price
  - max_products
  - max_documents_per_product
  - max_file_size
  - features
- [ ] `subscriptions` 表（订阅记录）
- [ ] `usage_records` 表（使用量记录）
- [ ] 套餐页面 UI（展示但不接支付）

### P3-2 支付集成（第二阶段）
**状态**：未开始

- [ ] 微信支付接入
- [ ] 支付宝接入
- [ ] 支付订单管理
- [ ] 发票功能

---

## 第五优先级：高级功能

### P4-1 SEO 优化
**状态**：未开始

- [ ] 产品页 SEO
- [ ] 企业页 SEO
- [ ] 证书页 SEO
- [ ] sitemap.xml
- [ ] 结构化数据

### P4-2 数据分析
**状态**：未开始

- [ ] 访问量统计
- [ ] 搜索关键词统计
- [ ] 下载量统计
- [ ] 地区分布

### P4-3 OCR 自动识别
**状态**：未开始

- [ ] 证书编号识别
- [ ] 签发机构识别
- [ ] 有效期识别
- [ ] 认证标准识别

### P4-4 对象存储迁移
**状态**：未开始

- [ ] 腾讯云 COS / AWS S3 接入
- [ ] 文件迁移脚本
- [ ] CDN 配置

### P4-5 多语言完善
**状态**：部分完成

- [ ] 中文（已有）
- [ ] 英文（已有）
- [ ] 德文
- [ ] 法文
- [ ] 西班牙文
- [ ] 意大利文

### P4-6 证书到期提醒
**状态**：未开始

- [ ] 到期前 30 天提醒
- [ ] 到期前 60 天提醒
- [ ] 到期前 90 天提醒
- [ ] 邮件通知

---

## 数据库设计预留

以下表结构建议在第一阶段就创建，即使暂时不使用：

```sql
-- 用户表（升级现有 users 表）
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN platform_role TEXT DEFAULT 'user';

-- 企业成员表
CREATE TABLE company_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  status TEXT DEFAULT 'active',
  invited_by INTEGER,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- 上传确认记录
CREATE TABLE upload_confirmations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  confirmed_authentic INTEGER DEFAULT 0,
  confirmed_authorized INTEGER DEFAULT 0,
  accepted_disclaimer INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 套餐表（预留）
CREATE TABLE plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  max_products INTEGER,
  max_documents_per_product INTEGER,
  max_file_size INTEGER,
  features TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 订阅表（预留）
CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  start_date DATETIME,
  end_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);
```

---

## 开发顺序建议

### 本周（第一阶段地基）
1. 用户认证体系（P0-1）
2. 上传确认 + 免责声明（P0-4）
3. 法律页面（P0-5）

### 下周（企业认证）
1. 企业认证流程（P0-2）
2. 企业成员权限（P0-3）
3. 环境变量配置（P0-6）

### 第三周（功能完善）
1. 文档管理功能（P1-1）
2. 企业管理页面（P1-2）
3. 产品详情页完善（P1-3）

### 第四周（体验优化）
1. 移动端适配（P2-1）
2. 搜索优化（P2-2）
3. 用户指引（P2-4）

---

## 注意事项

1. **不要跳过地基**：用户认证、企业认证、法律声明必须先做
2. **预留表结构**：即使不实现功能，也要先建好表
3. **环境变量**：所有配置项都要可配置，不要写死
4. **数据备份**：从一开始就养成备份习惯
5. **代码规范**：保持一致性，方便后续维护


## 产品建模与批量导入规则

- [ ] 按 `PRODUCT_MODELING_GUIDE.md` 完成轻量版改造。
  - 产品条目表示“产品 / 产品系列”。
  - 型号作为适用型号 / 变体，不默认等同于产品。
  - 批量导入识别多个型号时，默认建议产品系列。
  - 后续再升级 `product_models` 和 `document_model_links`。
