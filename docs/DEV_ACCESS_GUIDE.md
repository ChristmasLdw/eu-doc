# EU-DOC 开发环境访问指南

**日期：** 2026年6月12日  
**状态：** ✅ 服务已启动

---

## 🎉 服务状态

### 前端服务 ✅
- **地址：** http://localhost:5173/eu-doc/
- **状态：** 运行中
- **启动时间：** 117ms
- **技术栈：** Vite + React 19

### 后端服务 ✅
- **地址：** http://localhost:3007
- **API：** http://localhost:3007/api
- **健康检查：** http://localhost:3007/api/health
- **状态：** 运行中
- **技术栈：** Node.js + Express + SQLite

---

## 📱 快速访问

### 主要页面

#### 前台页面
- **首页：** http://localhost:5173/eu-doc/
- **证书搜索：** http://localhost:5173/eu-doc/search
- **用户协议：** http://localhost:5173/eu-doc/terms
- **隐私政策：** http://localhost:5173/eu-doc/privacy

#### 管理后台
- **登录页：** http://localhost:5173/eu-doc/admin/login
- **注册页：** http://localhost:5173/eu-doc/admin/register
- **仪表盘：** http://localhost:5173/eu-doc/admin

---

## 🧪 测试新功能

### 1. 测试多语言切换
```
1. 打开：http://localhost:5173/eu-doc/
2. 点击导航栏右侧的 [中] 或 [EN] 按钮
3. 观察页面文案自动切换
4. 刷新页面，验证语言保持不变
```

### 2. 测试主题切换
```
1. 打开：http://localhost:5173/eu-doc/
2. 点击导航栏右侧的 🌙 (暗黑) 或 ☀️ (明亮) 图标
3. 观察页面主题平滑切换
4. 刷新页面，验证主题保持不变
```

### 3. 测试用户协议集成
```
1. 打开：http://localhost:5173/eu-doc/admin/register
2. 填写注册信息
3. 尝试不勾选协议直接注册 → 应该提示错误
4. 勾选"我已阅读并同意..."
5. 点击协议链接，验证在新标签页打开
6. 提交注册
```

---

## 🔑 测试账号

### 默认管理员账号
- **用户名：** admin
- **密码：** admin123

⚠️ **重要：** 首次登录后请立即修改密码！

---

## 🎨 主题演示

### 明亮模式（默认）
- 白色背景
- 深色文字
- 清爽现代

### 暗黑模式
- 深色背景
- 浅色文字
- 专业高端

---

## 🌍 语言演示

### 中文（默认）
- 简体中文界面
- 适合国内用户

### English
- 英文界面
- 适合海外用户
- 符合国际化标准

---

## 📊 功能清单

### ✅ 已实现
- [x] 多语言支持（中英文）
- [x] 主题切换（明亮/暗黑）
- [x] 用户协议集成
- [x] 证书查询
- [x] 公司管理
- [x] 用户注册
- [x] 管理后台

### 🔜 待实现（优先级）
- [ ] 批量上传证书
- [ ] 证书到期提醒
- [ ] 移动端适配
- [ ] API 接口文档
- [ ] 数据统计看板

---

## 🐛 故障排查

### 前端无法访问
```bash
# 检查前端服务
lsof -i :5173

# 如果没有运行，重新启动
npm run dev
```

### 后端无法访问
```bash
# 检查后端服务
lsof -i :3007

# 如果没有运行，重新启动
cd server
node index.cjs
```

### 依赖问题
```bash
# 重新安装前端依赖
npm install

# 重新安装后端依赖
cd server
npm install --include=optional
npm rebuild better-sqlite3
```

---

## 🛠️ 开发命令

### 前端
```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览构建产物
npm run lint     # 代码检查
```

### 后端
```bash
cd server
npm start        # 启动后端服务
node index.cjs   # 直接启动（开发用）
```

---

## 📝 浏览器要求

- **推荐：** Chrome、Edge、Safari 最新版
- **最低：** Chrome 90+、Firefox 88+、Safari 14+
- **不支持：** IE 11 及以下

---

## 🎯 下一步

### 立即测试
1. ✅ 打开 http://localhost:5173/eu-doc/
2. ✅ 测试语言切换
3. ✅ 测试主题切换
4. ✅ 注册新用户（测试协议集成）
5. ✅ 登录管理后台

### 反馈问题
- 发现问题请记录具体步骤
- 截图有助于快速定位
- 描述预期行为 vs 实际行为

---

**祝开发愉快！** 🚀

如有问题，请随时询问。
