# eu-doc P0 级地基功能实施计划

**计划编写时间**: 2026-06-24
**目标**: 完成 P0-1 到 P0-6 所有地基功能
**预估工作量**: 大型重构，涉及数据库升级、后端 API、前端页面

---

## 现状分析

### 已有基础
- ✅ 数据库已经是 v2.0 架构（`users`, `companies`, `products`, `documents`, `certificate_metadata`）
- ✅ 已有 `users` 表（支持邮箱、密码哈希、角色）
- ✅ 已有 `company_members` 表（企业成员关系）
- ✅ 已有 `upload_confirmations` 表（上传确认记录）
- ✅ 已有 `email_verifications` 表（邮箱验证令牌）
- ✅ 后端已实现注册/登录 API（`/api/auth/register`, `/api/auth/login`）
- ✅ 前端已有注册页面（`RegisterPage.jsx`）、登录页面（`LoginPage.jsx`）
- ✅ 已有法律页面：免责声明（`DisclaimerPage.jsx`）、企业入驻协议（`EnterpriseAgreementPage.jsx`）、隐私政策（`PrivacyPage.jsx`）
- ✅ AdminContext 已支持 `register()` 方法
- ✅ 文档上传页面已有确认勾选框逻辑（`DocumentUploadPage.jsx` 行84-87）

### 待完善内容

#### P0-1 用户认证体系
- ❌ 邮箱验证功能（前端页面 + 邮件发送模拟）
- ❌ 忘记密码功能（前端页面）
- ❌ 修改密码功能（前端页面）
- ❌ 用户信息完善（手机号等）

#### P0-2 企业认证流程
- ❌ 企业认证申请页面（前台）
- ❌ 企业认证审核页面（管理后台）
- ❌ 企业认证资料上传（营业执照、授权书）
- ❌ 认证状态管理 API（待提交 → 审核中 → 已认证 → 已拒绝）
- ⚠️  `companies` 表已有 `verification_status`, `verified_at`, `verified_by` 字段
- ⚠️  已有 `company_verification_documents` 表

#### P0-3 企业成员权限
- ✅ `company_members` 表已存在
- ✅ 企业成员管理 API 已完成（`/api/v2/company-members`）
- ❌ 前端企业成员管理页面
- ❌ 成员邀请页面
- ❌ 权限检查逻辑（文档上传/编辑权限）

#### P0-4 上传确认 + 免责声明
- ✅ `upload_confirmations` 表已存在
- ✅ 文档上传页面已有确认勾选框
- ❌ 后端 API 需要保存确认记录到 `upload_confirmations`
- ❌ 管理员查看上传确认记录页面

#### P0-5 法律页面
- ✅ 免责声明页面已存在
- ✅ 企业入驻协议页面已存在
- ✅ 隐私政策页面已存在
- ⚠️  服务条款页面（`/terms` 路由需要确认）
- ❌ 上传承诺书页面（新建）
- ❌ Footer 需要添加完整的法律页面链接

#### P0-6 环境变量配置
- ❌ 创建 `.env.example` 文件
- ❌ 前端环境变量配置（`VITE_APP_BASE_PATH`, `VITE_API_BASE_URL`）
- ❌ 后端环境变量配置（`DATABASE_PATH`, `UPLOAD_DIR`, `PUBLIC_FILE_BASE_URL`, `JWT_SECRET`, `SMTP_*`）
- ❌ 更新部署文档

---

## 实施计划

### 阶段 1: P0-1 用户认证体系完善

#### 1.1 邮箱验证功能
**后端**:
- ✅ API 已有 `/api/auth/verify-email`（接受 token，标记邮箱已验证）
- ✅ 注册时自动生成验证令牌
- ⚠️  邮件发送：暂时返回 token 到前端（生产环境需集成 SMTP）

**前端**:
- 创建 `EmailVerifyPage.jsx`（接收 URL 参数 `?token=xxx`，调用验证 API）
- 注册成功后显示"请查收验证邮件"提示
- 在个人中心显示邮箱验证状态

#### 1.2 忘记密码功能
**后端**:
- ✅ API 已有 `/api/auth/forgot-password`（生成重置令牌）
- ✅ API 已有 `/api/auth/reset-password`（验证令牌并重置密码）

**前端**:
- 创建 `ForgotPasswordPage.jsx`（输入邮箱，调用 `/api/auth/forgot-password`）
- 创建 `ResetPasswordPage.jsx`（接收 URL 参数 `?token=xxx`，输入新密码）
- 登录页面添加"忘记密码"链接

#### 1.3 修改密码功能
**后端**:
- ✅ API 已有 `/api/auth/password`（需登录，验证原密码后修改）

**前端**:
- 在个人中心或设置页面添加"修改密码"表单

---

### 阶段 2: P0-4 上传确认逻辑完善

#### 2.1 后端 API 改造
**文档上传 API**（`/api/v2/documents/upload`）需要：
- 接收 `confirmed_authentic`, `confirmed_authorized`, `accepted_disclaimer` 参数
- 验证所有确认项都为 `true`，否则拒绝上传
- 上传成功后，写入 `upload_confirmations` 表（记录 user_id, company_id, document_id, IP 地址等）

#### 2.2 前端改造
- ✅ `DocumentUploadPage.jsx` 已有确认勾选框
- 确保提交时传递确认参数到后端
- 提交失败时显示"请确认所有声明事项"错误

#### 2.3 管理员审计页面
- 创建 `UploadConfirmationsPage.jsx`（管理后台）
- 显示所有上传确认记录（文档、上传者、确认项、时间、IP）
- 支持按文档/用户/企业筛选

---

### 阶段 3: P0-2 企业认证流程

#### 3.1 数据库表确认
**已存在表**:
- `companies` 表已有 `verification_status` 字段（默认 'verified'，需改为 'unverified'）
- `company_verification_documents` 表已存在

**需要的状态值**:
- `unverified`（未认证）
- `pending`（审核中）
- `verified`（已认证）
- `rejected`（已拒绝）

#### 3.2 后端 API
**新增路由**:
- `POST /api/v2/companies/:id/verification` - 提交认证申请（上传营业执照、授权书）
- `PUT /api/v2/companies/:id/verification` - 管理员审核（通过/拒绝）
- `GET /api/v2/companies/:id/verification` - 查看认证资料和状态

**逻辑**:
- 用户提交认证时，上传文件到 `company_verification_documents` 表
- 状态变为 `pending`
- 管理员审核后，更新 `verification_status`，记录 `verified_by`, `verified_at`, `verification_note`

#### 3.3 前端页面
**前台（企业用户）**:
- 创建 `CompanyVerificationPage.jsx`（提交认证申请）
- 在企业管理页面显示认证状态徽章

**管理后台**:
- 创建 `CompanyVerificationAdminPage.jsx`（审核列表）
- 显示待审核企业、已认证企业、已拒绝企业
- 支持查看资料、通过/拒绝操作

---

### 阶段 4: P0-3 企业成员权限

#### 4.1 后端权限检查
在以下 API 中添加权限检查：
- 文档上传：要求 `owner`, `admin`, `uploader` 角色
- 文档编辑/删除：要求 `owner`, `admin` 角色
- 产品创建/编辑/删除：要求 `owner`, `admin` 角色
- 企业信息编辑：要求 `owner`, `admin` 角色
- 成员管理：要求 `owner`, `admin` 角色

**实现方式**:
- 创建中间件 `requireCompanyRole(companyId, allowedRoles)`
- 在路由中应用该中间件

#### 4.2 前端页面
**已有**:
- `CompanyMembersPage.jsx`（待确认是否完整）

**需要创建**:
- `TeamMembersPage.jsx`（企业视角的成员管理）
- 成员邀请弹窗/页面
- 角色权限说明提示

#### 4.3 企业切换功能
- 在导航栏添加企业切换下拉菜单
- 用户可在多个企业之间切换
- 切换后，所有操作都基于当前选中的企业

---

### 阶段 5: P0-5 法律页面完善

#### 5.1 缺失页面
- ✅ 免责声明（`DisclaimerPage.jsx`）
- ✅ 企业入驻协议（`EnterpriseAgreementPage.jsx`）
- ✅ 隐私政策（`PrivacyPage.jsx`）
- ❓ 服务条款（需确认 `/terms` 路由）
- ❌ 上传承诺书页面（新建 `UploadCommitmentPage.jsx`）
- ❌ 联系我们页面（已有 `ContactPage.jsx`，需确认内容）

#### 5.2 Footer 改造
在 `Footer.jsx` 中添加完整的法律页面链接：
- 服务条款
- 隐私政策
- 免责声明
- 企业入驻协议
- 上传承诺书
- 联系我们

#### 5.3 上传页面关联
在文档上传页面的确认勾选框中，添加链接到免责声明和上传承诺书。

---

### 阶段 6: P0-6 环境变量配置

#### 6.1 前端环境变量
**创建文件**:
- `.env.example`（示例配置）
- `.env.development`（开发环境）
- `.env.production`（生产环境）

**变量**:
```bash
VITE_APP_BASE_PATH=/eu-doc
VITE_API_BASE_URL=http://localhost:3007/api
```

**代码改造**:
- 创建 `src/config/env.js`，统一读取环境变量
- 将硬编码的 API 地址和路径替换为环境变量

#### 6.2 后端环境变量
**创建文件**:
- `server/.env.example`

**变量**:
```bash
PORT=3007
DATABASE_PATH=./data/eu-doc.db
UPLOAD_DIR=./uploads
PUBLIC_FILE_BASE_URL=http://localhost:3007
JWT_SECRET=eu-doc-secret-key-change-in-production
APP_ENV=development

# SMTP 配置（邮件发送）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@eu-doc.com
SMTP_PASS=your-password
SMTP_FROM=noreply@eu-doc.com
```

**代码改造**:
- 已有 `require('dotenv').config()`
- 将硬编码的配置项（如 `JWT_SECRET`, `PORT`, 数据库路径等）替换为 `process.env.*`

#### 6.3 文档更新
- 更新 `README.md`（环境变量配置说明）
- 更新 `DEPLOYMENT_README.md`（部署时的环境变量设置）

---

## 实施顺序

按优先级和依赖关系，建议实施顺序：

1. **P0-6 环境变量配置**（地基中的地基，先做配置再开发）
2. **P0-1 用户认证体系**（邮箱验证、忘记密码、修改密码）
3. **P0-4 上传确认逻辑**（后端 API + 前端改造 + 管理员审计页面）
4. **P0-5 法律页面完善**（上传承诺书页面 + Footer 链接）
5. **P0-2 企业认证流程**（认证申请 + 管理员审核）
6. **P0-3 企业成员权限**（权限检查中间件 + 前端成员管理 + 企业切换）

---

## 关键文件清单

### 需要新建的文件

**前端页面**:
- `src/pages/EmailVerifyPage.jsx`
- `src/pages/ForgotPasswordPage.jsx`
- `src/pages/ResetPasswordPage.jsx`
- `src/pages/UploadCommitmentPage.jsx`
- `src/pages/CompanyVerificationPage.jsx`
- `src/pages/admin/CompanyVerificationAdminPage.jsx`
- `src/pages/admin/UploadConfirmationsPage.jsx`
- `src/pages/admin/SettingsPage.jsx`（个人中心，修改密码）

**配置文件**:
- `.env.example`
- `.env.development`
- `.env.production`
- `server/.env.example`
- `src/config/env.js`

**后端中间件**:
- `server/middleware/companyRole.cjs`（企业角色权限检查）

**后端路由**:
- 已有路由需要改造，不需要新建

### 需要修改的文件

**后端**:
- `server/routes/documents.cjs`（文档上传 API 添加确认记录）
- `server/routes/companies.cjs`（企业认证 API）
- `server/index.cjs`（引入环境变量）
- `server/db.cjs`（默认 verification_status 改为 'unverified'）

**前端**:
- `src/components/Footer.jsx`（添加法律页面链接）
- `src/pages/admin/LoginPage.jsx`（添加"忘记密码"链接）
- `src/pages/admin/DocumentUploadPage.jsx`（确保传递确认参数）
- `src/App.jsx`（添加新页面路由）
- `src/services/api.js`（使用环境变量的 API 地址）

**路由**:
- `src/App.jsx`（添加新页面路由）

---

## 数据库迁移

### 需要的 SQL 更新

```sql
-- 修改企业表默认认证状态
UPDATE companies SET verification_status = 'unverified' WHERE verification_status IS NULL OR verification_status = '';

-- 确保企业认证文档表存在（db.cjs 已创建）

-- 确保邮件验证表存在（db.cjs 已创建）

-- 确保上传确认表存在（db.cjs 已创建）
```

---

## 风险与注意事项

1. **邮件发送**：当前环境无 SMTP，暂时将验证令牌/重置令牌返回到前端，生产环境需集成邮件服务
2. **企业切换逻辑**：用户可能同时属于多个企业，需要在前端保存"当前企业"状态
3. **权限检查**：需要在每个需要权限的 API 中添加检查，避免遗漏
4. **默认数据**：现有企业数据的 `verification_status` 需要批量更新
5. **向后兼容**：`admins_legacy` 表的用户需要能正常登录（已有兼容逻辑）

---

## 验收标准

### P0-1 用户认证体系
- ✅ 用户可以注册账号（邮箱 + 密码）
- ✅ 用户可以通过邮箱验证链接验证邮箱
- ✅ 用户可以通过"忘记密码"功能重置密码
- ✅ 登录用户可以修改密码
- ✅ 个人中心显示邮箱验证状态

### P0-2 企业认证流程
- ✅ 企业可以提交认证申请（上传营业执照、授权书）
- ✅ 管理员可以查看待审核企业列表
- ✅ 管理员可以通过/拒绝认证申请
- ✅ 前台显示企业认证状态徽章

### P0-3 企业成员权限
- ✅ 企业所有者可以邀请成员（邮箱邀请）
- ✅ 成员角色分为 owner/admin/uploader/viewer
- ✅ 不同角色的权限限制生效（上传/编辑/删除）
- ✅ 用户可以在多个企业之间切换

### P0-4 上传确认 + 免责声明
- ✅ 文档上传时必须勾选所有确认项
- ✅ 上传记录保存到 `upload_confirmations` 表
- ✅ 管理员可以查看所有上传确认记录

### P0-5 法律页面
- ✅ 所有法律页面都存在且内容完整
- ✅ Footer 包含所有法律页面链接
- ✅ 上传页面的确认框链接到免责声明和上传承诺书

### P0-6 环境变量配置
- ✅ 前后端都使用环境变量配置
- ✅ `.env.example` 文件完整
- ✅ 部署文档更新

---

## 预估工作量

- **P0-6 环境变量配置**: 1 小时
- **P0-1 用户认证体系**: 2 小时
- **P0-4 上传确认逻辑**: 1.5 小时
- **P0-5 法律页面完善**: 1 小时
- **P0-2 企业认证流程**: 2.5 小时
- **P0-3 企业成员权限**: 2 小时

**总计**: 约 10 小时

---

## 下一步行动

1. 退出计划模式，获得用户批准
2. 按照实施顺序逐个完成任务
3. 每完成一个阶段，进行构建验证和功能测试
4. 全部完成后，更新版本号为 v2.3.0
5. 创建 Git commit 并更新工作日志
