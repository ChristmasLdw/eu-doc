# 登录问题修复说明

## 🐛 问题描述

**症状**：登录页面要求输入"邮箱"，但无法登录

**原因**：
- 前端登录页面标签显示"邮箱"，字段名为 `email`
- 前端 API 发送请求时使用 `email` 字段
- 后端 API 期望的是 `username` 字段
- 导致字段不匹配，登录失败

## ✅ 修复内容

### 1. 修改登录页面 (`LoginPage.jsx`)
- ✅ 将"邮箱"标签改为"用户名"
- ✅ 将 `email` 状态变量改为 `username`
- ✅ 将输入框类型从 `type="email"` 改为 `type="text"`
- ✅ 更新占位符文本

### 2. 修改 API 服务层 (`api.js`)
- ✅ 将登录请求体中的 `email` 字段改为 `username`

### 3. 保持 AdminContext 不变
- ✅ 参数名 `emailOrUsername` 保持不变（向后兼容）

## 🎯 修复后的登录流程

```javascript
// 用户在登录页面输入
用户名: admin
密码: admin123

// 前端发送请求
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}

// 后端接收并验证
SELECT * FROM admins WHERE username = 'admin'
// ✅ 匹配成功！
```

## 📝 可用的测试账号

### 管理员账号
```
用户名: admin
密码: admin123
角色: admin（平台管理员）
权限: 可以操作所有企业的数据
```

### 企业用户账号
```
用户名: testuser
密码: （需要重置，见下方说明）
角色: user（企业用户）
企业: 测试企业
权限: 只能操作自己企业的数据
```

## 🔧 如何测试

### 1. 确保后端服务运行中
```bash
# 检查进程
ps aux | grep "node.*index.cjs"

# 如果没运行，启动它
cd /Users/christmasldw/christmasldw-projects/eu-doc/server
node index.cjs
```

### 2. 启动前端服务
```bash
cd /Users/christmasldw/christmasldw-projects/eu-doc
npm run dev
```

### 3. 访问登录页面
打开浏览器访问：
```
http://localhost:5173/eu-doc/admin/login
```

### 4. 测试登录
输入：
- 用户名：`admin`
- 密码：`admin123`

点击"登录"按钮

### 5. 预期结果
- ✅ 登录成功
- ✅ 跳转到管理后台
- ✅ 可以访问产品管理页面

## 🧪 完整测试流程

### 步骤 1: 登录管理后台
```
1. 访问 http://localhost:5173/eu-doc/admin/login
2. 输入用户名: admin
3. 输入密码: admin123
4. 点击登录
5. 验证：跳转到 /admin
```

### 步骤 2: 访问产品管理
```
1. 点击左侧菜单"产品管理"
2. 验证：显示产品列表（47 个产品）
3. 验证：有"创建产品"按钮
```

### 步骤 3: 创建产品
```
1. 点击"创建产品"
2. 选择企业：测试企业
3. 输入产品名称：UI 测试产品
4. 输入产品英文名称：UI Test Product
5. 输入产品型号：TEST-UI-001
6. 输入产品描述（中文）：这是通过界面创建的测试产品
7. 输入产品描述（英文）：This is a test product created via UI
8. 点击"创建产品"
9. 验证：提示"产品创建成功"
10. 验证：自动跳转回产品列表
11. 验证：新产品出现在列表中
```

### 步骤 4: 编辑产品
```
1. 找到刚创建的产品
2. 点击"编辑"按钮
3. 修改产品名称为：UI 测试产品-已编辑
4. 修改型号为：TEST-UI-002
5. 点击"保存修改"
6. 验证：提示"产品更新成功"
7. 验证：列表中显示更新后的信息
```

### 步骤 5: 搜索产品
```
1. 在搜索框输入：helmet
2. 验证：显示包含 helmet 的产品
3. 验证：搜索结果动态更新
```

### 步骤 6: 删除产品
```
1. 找到测试产品
2. 点击"删除"按钮
3. 确认删除
4. 验证：提示"删除成功"
5. 验证：产品从列表中消失
```

## 🔐 重置 testuser 密码（如需要）

如果需要测试企业用户权限，但不知道密码：

```bash
cd /Users/christmasldw/christmasldw-projects/eu-doc/server
node -e "
const bcrypt = require('bcryptjs');
const {db} = require('./db.cjs');

const newPassword = 'test123';
const hash = bcrypt.hashSync(newPassword, 10);

db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(hash, 'testuser');
console.log('✅ testuser 密码已重置为: test123');
"
```

然后就可以用：
- 用户名：`testuser`
- 密码：`test123`
登录了。

## 📊 测试清单

- [ ] 后端服务运行中（端口 3007）
- [ ] 前端服务运行中（端口 5173）
- [ ] 管理员登录成功
- [ ] 产品列表显示正常
- [ ] 可以创建产品（双语字段）
- [ ] 可以编辑产品（双语字段）
- [ ] 可以搜索产品
- [ ] 可以删除产品
- [ ] 企业用户登录成功（可选）
- [ ] 企业用户只能看到自己企业的产品（可选）

## ⚠️ 常见问题

### 问题 1: 前端启动失败
**解决**：
```bash
cd /Users/christmasldw/christmasldw-projects/eu-doc
npm install
npm run dev
```

### 问题 2: 登录后显示空白页
**解决**：
1. 打开浏览器开发者工具（F12）
2. 查看 Console 是否有错误
3. 查看 Network 标签，确认 API 请求是否成功

### 问题 3: 产品列表为空
**解决**：
1. 检查后端日志：`tail -f /tmp/eu-doc-server.log`
2. 检查数据库：
```bash
cd /Users/christmasldw/christmasldw-projects/eu-doc/server
sqlite3 data/eu-doc.db "SELECT COUNT(*) FROM products;"
```

### 问题 4: 企业下拉框为空
**解决**：
检查是否有企业数据：
```bash
curl http://localhost:3007/api/companies?pageSize=10
```

## 🎉 修复完成

**修改的文件**：
1. `/src/pages/admin/LoginPage.jsx` - 登录页面
2. `/src/services/api.js` - API 服务层

**现在可以正常登录了！**

测试账号：
- 用户名：`admin`
- 密码：`admin123`
