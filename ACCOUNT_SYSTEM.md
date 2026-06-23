# EU-DOC 账户体系说明

## 📊 账户分类

目前系统有 **2 种角色分类**：

### 1. **admin（平台管理员）**
- **权限**：超级管理员，可以管理整个平台
- **能做什么**：
  - ✅ 查看所有企业的产品
  - ✅ 为任意企业创建产品
  - ✅ 编辑任意企业的产品
  - ✅ 删除任意企业的产品
  - ✅ 管理企业信息
  - ✅ 管理用户账号
  - ✅ 查看统计数据和审计日志

**现有账号**：
```
用户名: admin
密码: admin123
企业: 无（平台管理员）
```

### 2. **user（企业用户）**
- **权限**：普通用户，只能操作自己企业的数据
- **能做什么**：
  - ✅ 查看自己企业的产品
  - ✅ 为自己企业创建产品
  - ✅ 编辑自己企业的产品
  - ✅ 删除自己企业的产品（无文档时）
  - ✅ 上传文档到自己企业的产品
  - ❌ 不能查看其他企业的产品
  - ❌ 不能操作其他企业的数据

**现有账号**：
```
用户名: testuser
密码: （需要查询）
企业: 测试企业

用户名: testuser2
密码: （需要查询）
企业: 测试企业
```

---

## 🔐 权限控制机制

### 后端权限检查

**产品管理权限检查逻辑**：

```javascript
// 1. 管理员：直接放行
if (req.admin.role === 'admin') {
  // 可以操作任何企业的产品
}

// 2. 普通用户：检查企业归属
else {
  // 获取用户所属企业
  const userCompany = db.prepare('SELECT company_name FROM admins WHERE id = ?').get(req.admin.id);
  
  // 获取产品所属企业
  const productCompany = db.prepare('SELECT name FROM companies WHERE id = ?').get(product.company_id);
  
  // 比对企业名称
  if (userCompany.company_name !== productCompany.name) {
    return 403; // 禁止访问
  }
}
```

### 前端过滤

**产品列表自动过滤**：

```javascript
// 管理员：显示所有产品
if (currentUser.role === 'admin') {
  // 不添加企业过滤参数
}

// 普通用户：只显示自己企业的产品
else {
  // 查找用户企业的 ID
  const company = await findCompanyByName(currentUser.company_name);
  // 添加企业过滤参数
  params.append('companyId', company.id);
}
```

---

## 🗂️ 数据库表结构

### 当前使用的表（v1.0）

#### admins 表
存储用户账号信息：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 用户 ID |
| username | TEXT | 用户名（登录用） |
| password_hash | TEXT | 密码哈希 |
| role | TEXT | 角色：admin/user |
| company_name | TEXT | 所属企业名称 |
| created_at | DATETIME | 创建时间 |

**示例数据**：
```
id=1, username=admin, role=admin, company_name=null
id=2, username=testuser, role=user, company_name=测试企业
id=3, username=testuser2, role=user, company_name=测试企业
```

### v2.0 新表（已创建但未完全启用）

#### users 表
新版用户表（更规范）：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 用户 ID |
| email | TEXT | 邮箱（登录用） |
| phone | TEXT | 手机号 |
| password_hash | TEXT | 密码哈希 |
| display_name | TEXT | 显示名称 |
| platform_role | TEXT | 平台角色：admin/user |
| status | TEXT | 状态：active/inactive |

#### company_members 表
企业成员关系表（多对多）：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 记录 ID |
| user_id | INTEGER | 用户 ID |
| company_id | INTEGER | 企业 ID |
| role | TEXT | 企业内角色：owner/admin/member/viewer |
| status | TEXT | 状态：active/inactive |
| joined_at | DATETIME | 加入时间 |

**⚠️ 当前状态**：
- users 表已有数据（从 admins 迁移而来）
- company_members 表为空
- 认证系统仍使用 admins 表
- 权限检查已修改为使用 admins 表的 company_name 字段

---

## 🔄 架构演进

### 当前架构（v1.0）
```
admins 表
├─ username（登录）
├─ role（admin/user）
└─ company_name（企业归属）
```

**优点**：简单直观  
**缺点**：
- 一个用户只能属于一个企业
- 企业内没有角色细分
- 使用 company_name 字符串匹配，不够严谨

### 目标架构（v2.0）
```
users 表（用户）
└─ platform_role（平台角色）

company_members 表（企业成员关系）
├─ user_id
├─ company_id
└─ role（企业内角色）
```

**优点**：
- 一个用户可以属于多个企业
- 企业内可以有不同角色（所有者/管理员/成员/查看者）
- 使用 ID 关联，更规范

**迁移状态**：
- 🟡 数据库表已创建
- 🟡 数据已迁移（但未关联）
- 🔴 认证系统未切换
- 🔴 company_members 表为空

---

## 📝 测试账号

### 管理员账号

```bash
用户名: admin
密码: admin123
角色: admin
企业: 无
权限: 全部
```

**测试场景**：
- 可以看到所有企业的产品（47 个）
- 可以为任意企业创建产品
- 可以编辑任意产品
- 可以删除任意产品

### 企业用户账号

```bash
用户名: testuser
密码: （需要重置或查询）
角色: user
企业: 测试企业
权限: 仅自己企业
```

**测试场景**：
- 只能看到"测试企业"的产品
- 只能为"测试企业"创建产品
- 尝试编辑其他企业产品会被拒绝（403）

---

## 🧪 权限测试

### 测试 1: 管理员权限

```bash
# 1. 使用 admin 登录
POST /api/auth/login
{ "username": "admin", "password": "admin123" }

# 2. 获取产品列表
GET /api/v2/products
# ✅ 应该返回所有企业的产品（47 个）

# 3. 为任意企业创建产品
POST /api/v2/products
{ "company_id": 1, "name": "测试产品" }
# ✅ 应该创建成功
```

### 测试 2: 企业用户权限

```bash
# 1. 使用 testuser 登录
POST /api/auth/login
{ "username": "testuser", "password": "xxx" }

# 2. 获取产品列表
GET /api/v2/products
# ✅ 应该只返回"测试企业"的产品

# 3. 为自己企业创建产品
POST /api/v2/products
{ "company_id": 2, "name": "测试产品" }  # company_id=2 是"测试企业"
# ✅ 应该创建成功

# 4. 为其他企业创建产品
POST /api/v2/products
{ "company_id": 1, "name": "测试产品" }  # company_id=1 是其他企业
# ❌ 应该返回 403 禁止访问
```

---

## 🚀 未来扩展

### 企业内角色细分（v2.0 预留）

在 company_members 表中，可以定义企业内的不同角色：

| 角色 | 权限说明 |
|------|----------|
| owner | 企业所有者，最高权限 |
| admin | 企业管理员，可管理成员 |
| member | 企业成员，可编辑产品 |
| viewer | 只读用户，只能查看 |

### 多企业归属

一个用户可以：
- 在企业 A 是 owner
- 在企业 B 是 member
- 在企业 C 是 viewer

---

## 📋 当前账户列表

### admins 表（3 个账号）

| ID | 用户名 | 角色 | 企业 | 创建时间 |
|----|--------|------|------|----------|
| 1 | admin | admin | - | 2026-06-06 |
| 2 | testuser | user | 测试企业 | 2026-06-06 |
| 3 | testuser2 | user | 测试企业 | 2026-06-06 |

### users 表（6 个账号，已迁移但未启用）

| ID | 邮箱 | 显示名 | 角色 | 状态 |
|----|------|--------|------|------|
| 1 | admin@legacy.local | admin | admin | active |
| 2 | testuser@legacy.local | testuser | user | active |
| 3 | testuser2@legacy.local | testuser2 | user | active |
| 7 | test@example.com | Test User | user | active |
| 17 | newuser@test.com | New User | user | active |
| 30 | 327114305@qq.com | 327114305 | user | active |

---

## ✅ 总结

**当前系统**：
- ✅ 2 种角色：admin（管理员）、user（企业用户）
- ✅ 权限控制正常工作
- ✅ 管理员可以操作所有数据
- ✅ 企业用户只能操作自己企业的数据

**技术架构**：
- 🟢 使用 admins 表（v1.0）
- 🟡 v2.0 表已创建但未启用
- 🟡 权限检查基于 company_name 字符串匹配

**后续计划**：
- 完全迁移到 users + company_members 架构
- 支持一个用户属于多个企业
- 支持企业内角色细分
