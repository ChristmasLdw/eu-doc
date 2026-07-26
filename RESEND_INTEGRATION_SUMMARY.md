# Resend 邮件服务接入完成总结

**完成日期：** 2026-07-26  
**状态：** ✅ 已完成并部署到生产环境

---

## 📋 项目概述

成功将 Resend 邮件服务接入 EU-DOC 产品合规资料管理平台，实现注册验证邮件和密码重置邮件功能，并完成品牌风格统一优化。

---

## ✅ 完成的功能

### 1. 基础配置
- Resend 账号注册并获取 API Key：`re_bq7hpvPi_***`
- 配置发件域名：`auth.christmasldw.com`
- DNS 记录配置：DKIM、SPF、MX 全部验证通过
- 发件人地址：`EU-DOC <noreply@auth.christmasldw.com>`

### 2. 邮件发送功能
**文件位置：** `server/utils/mailer.cjs`

- ✅ **注册验证邮件** (`sendVerificationEmail`)
  - 主题：验证你的 EU-DOC 账户邮箱
  - Token 有效期：24 小时
  - 包含验证链接和备用文本链接

- ✅ **密码重置邮件** (`sendPasswordResetEmail`)
  - 主题：重置你的 EU-DOC 账户密码
  - Token 有效期：1 小时
  - 包含重置链接和安全提示

### 3. 邮件模板设计
**品牌风格统一：**
- 背景色：`#f8fafc`（与 EU-DOC 主站一致）
- Logo：蓝色渐变 `#3b82f6 → #6366f1`（品牌色）
- 按钮：蓝色渐变 + 阴影效果
- 响应式设计，移动端友好
- 现代卡片布局，专业科技感

**文案优化：**
- 突出"产品合规资料管理平台"定位
- 强化安全提示（"如果不是你本人操作"）
- 添加功能说明和有效期提醒
- 提供备用链接

### 4. 频率限制机制
**文件位置：** `server/utils/emailRateLimit.cjs`

- 每邮箱 60 秒冷却期
- 每邮箱每小时限制 5 次
- 每邮箱每天限制 20 次
- 每 IP 每小时限制 30 次
- 使用 HMAC-SHA256 加密存储
- 数据库持久化记录

### 5. 数据库表结构

**email_verifications 表**（验证 token 管理）
```sql
- id: 主键
- user_id: 用户 ID
- email: 邮箱地址
- token: SHA256 哈希 token
- type: 类型（verify/reset）
- created_at: 创建时间
- expires_at: 过期时间
- used_at: 使用时间
```

**email_send_events 表**（发送记录）
```sql
- id: 主键
- recipient_email_hash: 邮箱哈希（隐私保护）
- recipient_ip_hash: IP 哈希
- mail_type: 邮件类型（verify/password_reset）
- created_at: 发送时间
```

### 6. 前端页面优化

**EmailVerifyPage（邮箱验证页面）**
- 文件：`src/pages/EmailVerifyPage.jsx`
- 样式：`src/pages/EmailVerifyPage.module.css`
- 改进：背景使用 EU-DOC 品牌蓝色渐变，添加装饰元素

**ResetPasswordPage（密码重置页面）**
- 文件：`src/pages/ResetPasswordPage.jsx`
- 样式：使用 `LoginPage.module.css`
- 功能：验证新密码、确认密码匹配、提交重置

### 7. API 接口

**POST /api/auth/register**
- 返回 `emailSent: true/false` 标识邮件发送状态
- 自动发送验证邮件

**POST /api/auth/verify-email**
- 验证 token 并标记邮箱为已验证
- 返回验证结果

**POST /api/auth/forgot-password**
- 发送密码重置邮件
- 应用频率限制

**POST /api/auth/reset-password**
- 验证 token 并重置密码
- Token 使用后自动失效

---

## 🚀 部署情况

### 本地开发环境
- ✅ 配置文件：`.env`（根目录）
- ✅ 服务运行：`node server/index.cjs`
- ✅ 测试通过

### 生产环境
- ✅ 服务器：腾讯云 christmasldw.com
- ✅ 配置文件：`/var/www/eu-doc/.env`
- ✅ 进程管理：PM2 (eu-doc-api)
- ✅ 已部署文件：
  - `server/utils/mailer.cjs`
  - `server/utils/emailRateLimit.cjs`
  - `server/routes/auth.cjs`
  - `src/pages/EmailVerifyPage.module.css`

---

## 🧪 测试结果

### 自动化测试
- ✅ 邮件配置加载测试
- ✅ 频率限制功能测试
- ✅ Token 生成和验证测试
- ✅ 数据库记录测试
- ✅ 6/6 测试用例全部通过

### 真实邮件测试
- ✅ QQ 邮箱（1072809280@qq.com）接收成功
- ✅ 验证链接可正常工作
- ✅ 密码重置链接可正常工作
- ✅ 邮件样式在邮件客户端正常显示

### 功能测试
- ✅ 注册流程完整
- ✅ 密码重置流程完整
- ✅ 频率限制有效
- ✅ Token 过期机制正常

---

## 📊 配置信息

### 环境变量
```bash
# Resend API
RESEND_API_KEY=re_bq7hpvPi_***
RESEND_FROM=EU-DOC <noreply@auth.christmasldw.com>

# 前端 URL
FRONTEND_URL=https://christmasldw.com/eu-doc  # 生产
FRONTEND_URL=http://localhost:5173/eu-doc     # 本地

# 频率限制
EMAIL_RATE_LIMIT_COOLDOWN_SECONDS=60
EMAIL_RATE_LIMIT_PER_EMAIL_HOUR=5
EMAIL_RATE_LIMIT_PER_EMAIL_DAY=20
EMAIL_RATE_LIMIT_PER_IP_HOUR=30
EMAIL_RATE_LIMIT_HASH_SECRET=RFtSZlm1xxOs1zylYPwZTZcJ8cU7Yn1XDBfLnrhSoZI
```

---

## 🎯 设计决策

### 1. 为什么选择 Resend？
- 现代化的 API 设计
- 支持自定义域名
- 免费额度充足（每月 3000 封）
- 文档清晰，易于集成

### 2. 为什么不强制邮箱验证？
- 降低注册门槛，提高转化率
- 避免用户因邮件延迟或垃圾箱而无法使用
- 采用"软验证"策略，平衡安全和体验

### 3. 频率限制策略
- 防止邮件滥发和攻击
- 保护邮件发送信誉
- 平衡用户体验（60秒冷却可接受）

---

## 🔧 技术栈

- **邮件服务：** Resend
- **后端：** Node.js + Express
- **数据库：** SQLite (better-sqlite3)
- **前端：** React + React Router
- **样式：** CSS Modules
- **加密：** crypto (Node.js 内置)

---

## 📝 维护说明

### 监控建议
1. 定期检查 Resend 控制台的发送成功率
2. 关注 `email_send_events` 表的发送量
3. 监控频率限制触发情况

### 故障排查
1. 邮件未收到 → 检查垃圾邮件箱、Resend 控制台
2. 验证链接失效 → 检查 token 是否过期、数据库记录
3. 频率限制过严 → 调整环境变量配置

### 扩展建议
如需添加新的邮件类型：
1. 在 `mailer.cjs` 中添加新的发送函数
2. 创建对应的邮件模板（使用 `renderEmail`）
3. 在相应的 API 路由中调用
4. 更新 `email_send_events` 的 `mail_type` 枚举

---

## 🎨 品牌风格指南

### 邮件设计规范
- **主色调：** 蓝色渐变 `#3b82f6 → #6366f1`
- **背景色：** `#f8fafc`
- **文字色：** 标题 `#0f172a`，正文 `#475569`，次要 `#64748b`
- **按钮：** 蓝色渐变 + 阴影 `0 4px 12px rgba(59,130,246,0.3)`
- **圆角：** 卡片 16px，按钮 12px，小组件 8px
- **字体：** 系统字体栈，优先 Noto Sans SC

---

## 📚 相关文件

### 后端
- `server/utils/mailer.cjs` - 邮件发送核心
- `server/utils/emailRateLimit.cjs` - 频率限制
- `server/routes/auth.cjs` - 认证路由
- `server/db.cjs` - 数据库初始化

### 前端
- `src/pages/EmailVerifyPage.jsx` - 验证页面
- `src/pages/EmailVerifyPage.module.css` - 验证页面样式
- `src/pages/ResetPasswordPage.jsx` - 重置密码页面
- `src/App.jsx` - 路由配置

### 配置
- `.env` - 本地环境变量
- `/var/www/eu-doc/.env` - 生产环境变量
- `server/data/eu-doc.db` - 数据库文件

---

## 🔒 安全考虑

1. **Token 安全**
   - 使用 SHA256 哈希存储
   - 随机生成 32 字节
   - 设置合理的过期时间

2. **隐私保护**
   - 邮箱地址哈希后存储
   - IP 地址哈希后存储
   - 使用 HMAC-SHA256 加密

3. **防止滥用**
   - 多维度频率限制
   - Token 一次性使用
   - 数据库持久化追踪

4. **错误处理**
   - 统一错误响应格式
   - 避免泄露敏感信息
   - 密码重置采用模糊提示

---

## ✨ 优化亮点

1. **品牌一致性** - 邮件和页面完全遵循 EU-DOC 设计系统
2. **用户体验** - 清晰的文案、备用链接、响应式设计
3. **安全可靠** - 多重频率限制、Token 安全、数据持久化
4. **易于维护** - 模块化设计、清晰的代码注释
5. **可扩展性** - 易于添加新的邮件类型

---

## 📞 联系方式

- **Resend 控制台：** https://resend.com/emails
- **发件域名：** auth.christmasldw.com
- **API 文档：** https://resend.com/docs

---

**完成人员：** Claudian（AI Assistant）  
**协作人员：** 先生  
**项目：** EU-DOC 产品合规资料管理平台
