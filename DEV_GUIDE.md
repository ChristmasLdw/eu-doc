# EU-DOC 开发环境指南

## 🚀 快速启动

### 一键启动（推荐）

```bash
cd /Users/christmasldw/christmasldw-projects/eu-doc

# 启动所有服务
./start-dev.sh

# 检查服务状态
./check-status.sh

# 停止所有服务
./stop-dev.sh
```

### 手动启动

如果启动脚本遇到问题，可以手动启动：

```bash
# 终端1 - 启动后端
cd /Users/christmasldw/christmasldw-projects/eu-doc
node server/index.cjs

# 终端2 - 启动前端
cd /Users/christmasldw/christmasldw-projects/eu-doc
npm run dev
```

---

## 📍 访问地址

启动成功后，在浏览器中访问：

- **前台首页**: http://localhost:5173/eu-doc/
- **管理后台**: http://localhost:5173/eu-doc/admin/
- **登录页面**: http://localhost:5173/eu-doc/admin/login
- **注册页面**: http://localhost:5173/eu-doc/admin/register
- **后端API**: http://localhost:3007/api/

---

## 🔐 测试账号

### 管理员账号（旧版兼容）
- 用户名: `admin`
- 密码: `admin123`

### 新用户注册
访问注册页面: http://localhost:5173/eu-doc/admin/register

**注意**: 注册时请不要填写企业名称（安全原因，需要审核）

---

## ⚠️ 常见问题及解决方案

### 问题1: 登录失败 - "The string did not match the expected pattern"

**症状**:
- 输入正确的用户名密码后，显示错误信息
- 错误信息是英文，而不是中文

**根本原因**:
- 后端服务未启动或已崩溃
- 前端无法连接到后端API

**解决步骤**:

```bash
# 1. 检查服务状态
./check-status.sh

# 2. 如果后端显示 "❌ 未运行"，重启服务
./stop-dev.sh
./start-dev.sh

# 3. 如果问题依然存在，查看后端日志
tail -20 logs/backend.log
```

**如何避免**:
- 每次开发前先运行 `./start-dev.sh`
- 不要直接关闭终端窗口，使用 `./stop-dev.sh` 正常停止

---

### 问题2: 网页打不开 - "无法访问此网站"

**症状**:
- 浏览器显示 "无法访问此网站" 或 "ERR_CONNECTION_REFUSED"
- 页面一片空白

**根本原因**:
- 前端服务未启动
- 或前端服务崩溃了

**解决步骤**:

```bash
# 1. 检查服务状态
./check-status.sh

# 2. 重启所有服务
./stop-dev.sh
./start-dev.sh

# 3. 确认地址正确
# 必须访问: http://localhost:5173/eu-doc/
# 不能访问: http://localhost:5173/ (缺少 /eu-doc/)
```

**如何避免**:
- 启动服务后等待几秒，让服务完全启动
- 使用 `./check-status.sh` 确认服务正常后再访问

---

### 问题3: 端口被占用

**症状**:
- 启动时报错 "Address already in use"
- 或者显示端口 3007/5173 被占用

**解决步骤**:

```bash
# 方法1: 使用启动脚本（会自动清理）
./start-dev.sh

# 方法2: 手动清理端口
lsof -ti:3007 | xargs kill -9  # 清理后端端口
lsof -ti:5173 | xargs kill -9  # 清理前端端口
```

---

### 问题4: 页面显示空白或加载失败

**症状**:
- 页面能打开，但内容是空白的
- 浏览器控制台显示 API 请求失败

**解决步骤**:

```bash
# 1. 确认后端正在运行
./check-status.sh

# 2. 测试后端API
curl http://localhost:3007/api/health

# 应该返回: {"success":true,"message":"EU-DOC API 服务运行中",...}

# 3. 如果后端没响应，重启
./stop-dev.sh
./start-dev.sh
```

---

### 问题5: AI修改代码后服务停止

**原因**:
- AI修改代码时可能会停止服务来重新启动
- 但有时重启失败，导致服务停止

**解决方法**:

```bash
# 简单粗暴的解决方案：重启所有服务
./stop-dev.sh
./start-dev.sh

# 或者告诉AI：
# "请不要停止服务，只修改代码即可"
```

---

## 📝 日志查看

如果服务启动失败或运行异常，查看日志找出问题：

```bash
# 查看后端日志（最后20行）
tail -20 logs/backend.log

# 实时监控后端日志
tail -f logs/backend.log

# 查看前端日志
tail -20 logs/frontend.log

# 实时监控前端日志
tail -f logs/frontend.log
```

---

## 🔧 日常开发工作流

```bash
# 1. 每天开始工作
cd /Users/christmasldw/christmasldw-projects/eu-doc
./start-dev.sh

# 2. 等待服务启动（3-5秒）
# 看到 "✅ 服务启动成功！" 后，打开浏览器

# 3. 访问开发地址
# http://localhost:5173/eu-doc/admin/login

# 4. 开发过程中...
# - 修改前端代码 → 浏览器自动刷新 ✅
# - 修改后端代码 → 需要重启后端: ./stop-dev.sh && ./start-dev.sh

# 5. 遇到问题时
./check-status.sh  # 先检查服务状态
# 如果服务异常，重启服务

# 6. 工作结束
./stop-dev.sh
```

---

## 🎯 测试完整流程

现在可以测试你的完整用户流程：

### 步骤1: 注册新用户
1. 访问: http://localhost:5173/eu-doc/admin/register
2. 填写：
   - 邮箱（必填）
   - 密码（必填，至少6位）
   - 确认密码
   - 显示名称（可选）
   - ⚠️ **不要填写企业名称**（需要审核）
3. 勾选同意服务条款
4. 点击"注册"

### 步骤2: 创建企业
1. 注册成功后自动登录，进入后台
2. 访问: http://localhost:5173/eu-doc/admin/company
3. 填写企业信息：
   - 企业中文名称（必填）
   - 英文名称（可选）
   - 联系方式等
4. 点击"创建企业"

### 步骤3: 企业认证（重要！）
1. 创建企业后，需要提交认证资料
2. 访问: http://localhost:5173/eu-doc/admin/company-verifications
3. 上传营业执照等资料
4. 提交认证申请
5. ⚠️ 需要管理员审核通过后才能上传产品

### 步骤4: 上传产品
1. 企业认证通过后
2. 访问: http://localhost:5173/eu-doc/admin/products
3. 点击"新增产品"
4. 填写产品信息并保存

### 步骤5: 上传文档
1. 访问: http://localhost:5173/eu-doc/admin/documents
2. 点击"上传文件"
3. 选择产品、文件类型（证书/DoC/说明书）
4. 上传文件
5. ⚠️ 必须勾选上传确认

### 步骤6: 前台查看
1. 访问: http://localhost:5173/eu-doc/
2. 搜索你的产品
3. 查看产品详情和文档

---

## 💡 重要提示

1. **启动顺序**: 先后端，后前端（启动脚本会自动处理）
2. **访问地址**: 必须包含 `/eu-doc/` 路径
3. **后端修改**: 修改后端代码需要重启服务
4. **前端修改**: 前端代码会自动热重载
5. **日志监控**: 遇到问题先看日志
6. **服务检查**: 经常运行 `./check-status.sh` 确认服务正常

---

## 🆘 紧急救援

如果所有方法都不行，执行以下操作重置环境：

```bash
# 1. 停止所有相关进程
killall node 2>/dev/null || true

# 2. 清理端口
lsof -ti:3007 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# 3. 删除日志和PID文件
rm -f logs/*.log logs/*.pid

# 4. 重新启动
./start-dev.sh

# 5. 如果还是不行，重装依赖
npm install
./start-dev.sh
```

---

## 📞 需要帮助？

如果遇到其他问题，请提供以下信息：

1. 运行 `./check-status.sh` 的输出
2. 后端日志: `tail -20 logs/backend.log`
3. 前端日志: `tail -20 logs/frontend.log`
4. 浏览器控制台的错误信息（F12 打开）
5. 具体的操作步骤和错误现象

---

**最后更新**: 2026-06-25
