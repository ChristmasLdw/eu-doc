# eu-doc TODO

最后更新：2026-06-22 CST  
当前版本：v2.2.0  
当前阶段：第一阶段 - 基础功能完善

---

## 已完成 ✅

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
**状态**：未开始  
**原因**：后期改会影响所有数据

- [ ] 升级 `users` 表结构
  - email（唯一）
  - phone（可选）
  - password_hash
  - display_name
  - email_verified
  - phone_verified
  - platform_role（admin / user）
  - status
- [ ] 邮箱注册流程
- [ ] 邮箱验证（发送验证码）
- [ ] 密码加密存储（已有 bcrypt）
- [ ] 忘记密码 / 重置密码
- [ ] 登录/注册页面 UI 优化

### P0-2 企业认证流程
**状态**：未开始  
**原因**：第二阶段真实企业需要

- [ ] 企业注册流程
  - 企业名称
  - 营业执照号
  - 联系人信息
- [ ] 企业认证资料提交
  - 营业执照照片
  - 授权书
- [ ] 管理员审核界面
  - 查看认证资料
  - 通过 / 拒绝
  - 备注
- [ ] 认证状态管理
  - unverified → pending → verified → rejected
- [ ] 前台显示企业认证状态

### P0-3 企业成员权限
**状态**：未开始  
**原因**：企业需要多人协作

- [ ] `company_members` 表
  - user_id
  - company_id
  - role（owner / admin / uploader / viewer）
  - status
  - invited_by
  - joined_at
- [ ] 成员邀请流程
  - 邀请链接 / 邮件邀请
  - 接受邀请
- [ ] 权限控制
  - Owner：全部权限
  - Admin：管理产品和文档
  - Uploader：只能上传文档
  - Viewer：只能查看
- [ ] 企业切换功能（一个用户可属于多个企业）

### P0-4 上传确认与免责声明
**状态**：未开始  
**原因**：法律风险规避

- [ ] 上传前勾选确认
  - ☐ 我确认此文档真实有效
  - ☐ 我确认本人有权代表该企业上传此文档
  - ☐ 我确认此文档不侵犯第三方权利
  - ☐ 我已阅读并同意免责声明
  - ☐ 我理解虚假资料由上传方承担全部法律责任
- [ ] `upload_confirmations` 表记录
- [ ] 管理员可查看上传确认记录

### P0-5 法律页面
**状态**：部分完成（已有 TermsPage、PrivacyPage）  
**原因**：合规要求

- [ ] 免责声明页面（新建）
- [ ] 企业入驻协议页面（新建）
- [ ] 上传承诺书页面（新建）
- [ ] 联系我们页面（新建）
- [ ] Footer 添加完整链接
- [ ] 上传页链接到免责声明

### P0-6 环境变量配置
**状态**：未开始  
**原因**：部署迁移需要

- [ ] 前端环境变量
  - VITE_APP_BASE_PATH
  - VITE_API_BASE_URL
- [ ] 后端环境变量
  - DATABASE_PATH
  - UPLOAD_DIR
  - PUBLIC_FILE_BASE_URL
  - APP_ENV
- [ ] 创建 .env.example 文件
- [ ] 更新文档说明

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
