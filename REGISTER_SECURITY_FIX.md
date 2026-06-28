# 注册安全问题修复记录

**修复时间**: 2026-06-25  
**问题严重性**: 🔴 高 - 安全漏洞  
**修复状态**: ✅ 已完成

---

## 🚨 问题描述

### **安全风险**

注册页面允许用户在注册时填写"企业名称"，存在以下严重安全隐患：

1. **冒用风险** - 任何人都可以填写知名企业名称（如"苹果公司"、"华为"等）
2. **数据混乱** - 同一企业可能被多个用户用不同名称重复注册
3. **无法验证** - 注册时没有任何验证机制，无法确认用户是否真的拥有该企业
4. **法律风险** - 虚假企业信息可能导致平台承担法律责任

### **原有流程**

```
用户注册 → 填写企业名称 → 自动创建企业 → 立即成为Owner
```

❌ **问题**: 没有任何验证，恶意用户可以随意冒用企业名称

---

## ✅ 解决方案

### **新的安全流程**

```
用户注册（只填写个人信息）
    ↓
登录后台
    ↓
手动创建企业（填写企业信息）
    ↓
提交企业认证资料（营业执照等）
    ↓
平台管理员审核
    ↓
审核通过后才能上传产品和文档
```

✅ **优点**:
- 有审核流程，确保企业信息真实
- 防止恶意冒用
- 符合商业平台的合规要求

---

## 🔧 修改内容

### **1. 前端 - RegisterPage.jsx**

**修改前**:
```jsx
// 包含企业名称字段
const [companyName, setCompanyName] = useState('');

<input
  id="companyName"
  placeholder="您的企业名称（可选）"
  value={companyName}
  onChange={(e) => setCompanyName(e.target.value)}
/>

// 注册时传递企业名称
await register(email, password, displayName, companyName);
```

**修改后**:
```jsx
// ❌ 删除企业名称字段
// ❌ 删除companyName状态
// ✅ 注册时不传递企业名称
await register(email, password, displayName);

// ✅ 注册成功后跳转到企业创建页面
navigate('/admin/company', { replace: true });
```

---

### **2. 后端 - auth.cjs**

**修改前**:
```javascript
// 接收企业名称参数
const { email, password, display_name, company_name } = req.body;

// 自动创建企业
if (company_name && company_name.trim()) {
  const trimmedCompany = company_name.trim();
  db.prepare('INSERT OR IGNORE INTO companies (name, name_en) VALUES (?, ?)')
    .run(trimmedCompany, trimmedCompany);
  // 自动关联用户为Owner
  db.prepare('INSERT OR IGNORE INTO company_members (user_id, company_id, role) VALUES (?, ?, ?)')
    .run(userId, company.id, 'owner');
}
```

**修改后**:
```javascript
// ❌ 移除company_name参数
const { email, password, display_name } = req.body;

// ✅ 注册时不再自动创建企业
// 注释: 用户需要在后台手动创建并提交认证
```

---

### **3. 前端Context - AdminContext.jsx**

**修改前**:
```javascript
const register = useCallback(async (email, password, displayName, companyName) => {
  const data = await api.register(email, password, displayName, companyName);
  // ...
}, []);
```

**修改后**:
```javascript
// ❌ 移除companyName参数
const register = useCallback(async (email, password, displayName) => {
  const data = await api.register(email, password, displayName);
  // ...
}, []);
```

---

### **4. API服务层 - api.js**

**修改前**:
```javascript
export function register(email, password, displayName, companyName) {
  const body = { email, password };
  if (displayName) body.display_name = displayName;
  if (companyName) body.company_name = companyName; // ❌
  return request('/auth/register', { /* ... */ });
}
```

**修改后**:
```javascript
// ❌ 移除companyName参数和逻辑
export function register(email, password, displayName) {
  const body = { email, password };
  if (displayName) body.display_name = displayName;
  return request('/auth/register', { /* ... */ });
}
```

---

## 📋 新的用户流程

### **步骤1: 用户注册**
访问: http://localhost:5173/eu-doc/admin/register

填写内容:
- ✅ 邮箱（必填）
- ✅ 密码（必填，≥6位）
- ✅ 确认密码
- ✅ 显示名称（可选）
- ❌ ~~企业名称~~（已删除）

### **步骤2: 创建企业**
注册成功后自动跳转到: `/admin/company`

填写企业信息:
- 企业中文名称（必填）
- 英文名称、联系方式等（可选）

### **步骤3: 企业认证**
访问: `/admin/company-verifications`

提交认证资料:
- 营业执照扫描件（必填）
- 企业注册号（必填）
- 法人/负责人信息（必填）
- 授权书（如果非法人申请）

### **步骤4: 等待审核**
- 平台管理员审核认证资料
- 审核通过后，企业状态变为 `verified`
- 只有认证通过的企业才能上传产品和文档

### **步骤5: 上传产品和文档**
- 企业认证通过后，可以创建产品
- 可以为产品上传证书、DoC声明、使用说明书

---

## 🔒 安全机制

### **1. 企业创建需要真实信息**
用户必须填写完整的企业信息，不能随意填写

### **2. 强制认证审核**
所有企业必须提交营业执照等资料，经过人工审核

### **3. 认证状态控制**
```
unverified (未认证) → 不能上传产品
pending (审核中) → 不能上传产品
verified (已认证) → ✅ 可以上传产品
rejected (被拒绝) → 不能上传产品，可重新提交
```

### **4. 防止重复和冒用**
管理员审核时会检查:
- 企业名称是否已存在
- 注册号是否已被使用
- 营业执照信息是否与申请信息一致
- 是否有冒用嫌疑

---

## ✅ 验证测试

### **测试1: 注册页面检查**
- [x] 注册页面不显示"企业名称"字段
- [x] 只需要填写邮箱、密码、显示名称

### **测试2: 注册流程测试**
- [x] 注册成功后跳转到 `/admin/company`
- [x] 数据库不会自动创建企业记录

### **测试3: 企业创建测试**
- [x] 手动创建企业成功
- [x] 创建后状态为 `unverified`

### **测试4: 产品上传权限测试**
- [x] 未认证企业不能上传产品
- [x] 前端显示"需要认证"提示
- [x] 后端返回403错误

---

## 📊 影响范围

### **已有用户**
- ✅ 不受影响，已注册用户可以继续使用
- ✅ 已创建的企业不受影响

### **新用户**
- ✅ 注册更安全，不会被误导填写企业名称
- ✅ 明确的企业创建和认证流程

---

## 🎯 后续建议

1. **在注册页面添加提示**
   ```
   "注册成功后，您可以在后台创建企业并提交认证资料"
   ```

2. **完善企业认证审核功能**
   - 管理员审核页面优化
   - 审核失败原因记录
   - 重新提交机制

3. **添加企业名称唯一性检查**
   - 创建企业时检查名称是否重复
   - 防止相似名称混淆

4. **增加企业认证指引**
   - 首次登录后显示引导流程
   - 企业认证材料准备说明
   - 审核时间预期告知

---

**修复完成时间**: 2026-06-25  
**修复工程师**: Claude (AI Assistant)  
**复核状态**: ✅ 已测试验证
