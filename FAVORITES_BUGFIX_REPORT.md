# 收藏功能 Bug 修复报告

**修复时间**: 2026-06-26  
**状态**: ✅ 已完成

---

## 🐛 修复的问题

### 问题1: 收藏后弹出错误 "Cannot read properties of undefined (reading 'id')"

**原因**:  
- API返回数据经过两层处理：
  1. `request()` 函数自动解包 `data.data` → 返回收藏对象
  2. `.then(keysToCamelCase)` 转换字段名
- 最终返回的是收藏对象本身：`{ id: 1, userId: 2, ... }`
- 但代码中错误地使用了 `result.data.id`，应该直接用 `result.id`

**修复方案**:
```javascript
// 错误写法
const result = await api.addFavorite(...);
setFavoriteId(result.data.id);  // ❌ result.data 是 undefined

// 正确写法
const result = await api.addFavorite(...);
setFavoriteId(result.id);  // ✅ result 就是收藏对象
```

**修改的文件**:
- `/src/pages/ProductDetailPage.jsx` - addFavorite 和 checkFavorite
- `/src/pages/CompanyPage.jsx` - addFavorite 和 checkFavorite
- `/src/pages/CertificatePage.jsx` - addFavorite 和 checkFavorite（两处）

---

### 问题2: 点击"查看"按钮跳转到空白页

**原因**:  
- 路由配置是 `/products/:id`（复数）
- 但跳转代码写的是 `/product/:id`（单数）
- 路由不匹配，导致显示空白页

**修复方案**:
```javascript
// 错误写法
navigate(`/eu-doc/product/${itemId}`);  // ❌ 路由不存在

// 正确写法
navigate(`/eu-doc/products/${itemId}`);  // ✅ 匹配路由
```

**修改的文件**:
- `/src/pages/admin/AdminV2Page.jsx` - "查看"按钮的跳转
- `/src/pages/ProductDetailPage.jsx` - 分享链接

---

## 📝 修改详情

### 1. ProductDetailPage.jsx

#### 修改1: addFavorite 返回值处理
```javascript
// 之前
const result = await api.addFavorite(...);
setFavoriteId(result.data.id);  // ❌

// 现在
const result = await api.addFavorite(...);
if (result && result.id) {
  setFavoriteId(result.id);  // ✅
}
```

#### 修改2: checkFavorite 返回值处理
```javascript
// 之前
const result = await api.checkFavorite('产品', parseInt(id));
setIsFavorited(result.data.isFavorited);  // ❌
setFavoriteId(result.data.favoriteId);

// 现在
const result = await api.checkFavorite('产品', parseInt(id));
if (result && result.isFavorited) {
  setIsFavorited(true);  // ✅
  setFavoriteId(result.favoriteId);
}
```

#### 修改3: 分享链接路由
```javascript
// 之前
const shareUrl = `${window.location.origin}/eu-doc/product/${id}`;  // ❌

// 现在
const shareUrl = `${window.location.origin}/eu-doc/products/${id}`;  // ✅
```

#### 修改4: 添加 useEffect 调用 loadFavoriteStatus
```javascript
useEffect(() => {
  if (product) {
    loadFavoriteStatus();
  }
}, [product, id]);
```

---

### 2. CompanyPage.jsx

#### 修改1: addFavorite 返回值处理
```javascript
// 之前
const result = await api.addFavorite(...);
setFavoriteId(result.data.id);  // ❌

// 现在
const result = await api.addFavorite(...);
if (result && result.id) {
  setFavoriteId(result.id);  // ✅
}
```

#### 修改2: checkFavorite 返回值处理
```javascript
// 之前
const result = await api.checkFavorite('公司', parseInt(companyId));
if (result.data.isFavorited) {  // ❌

// 现在
const result = await api.checkFavorite('公司', parseInt(companyId));
if (result && result.isFavorited) {  // ✅
```

---

### 3. CertificatePage.jsx

#### 修改1: addFavorite 返回值处理
```javascript
// 之前
const result = await api.addFavorite(...);
setFavoriteId(result.data.id);  // ❌

// 现在
const result = await api.addFavorite(...);
if (result && result.id) {
  setFavoriteId(result.id);  // ✅
}
```

#### 修改2: checkFavorite 返回值处理（loadFavoriteStatus）
```javascript
// 之前
const result = await api.checkFavorite('文件', parseInt(certId));
if (result.data.isFavorited) {  // ❌

// 现在
const result = await api.checkFavorite('文件', parseInt(certId));
if (result && result.isFavorited) {  // ✅
```

#### 修改3: checkFavorite 返回值处理（handleFavorite 中的取消收藏）
```javascript
// 之前
const result = await api.checkFavorite('文件', parseInt(id));
if (result.data.favoriteId) {  // ❌

// 现在
const result = await api.checkFavorite('文件', parseInt(id));
if (result && result.favoriteId) {  // ✅
```

---

### 4. AdminV2Page.jsx

#### 修改: "查看"按钮路由
```javascript
// 之前
if (type === '产品') {
  navigate(`/eu-doc/product/${itemId}`);  // ❌ 路由不匹配
}

// 现在
if (type === '产品') {
  navigate(`/eu-doc/products/${itemId}`);  // ✅ 正确路由
}
```

---

## 🔍 根本原因分析

### API 数据流

```
后端返回:
{
  success: true,
  data: {
    id: 1,
    user_id: 2,
    item_type: "产品",
    ...
  }
}
    ↓
request() 函数解包 (line 101):
return data.data !== undefined ? data.data : data
    ↓
返回:
{
  id: 1,
  user_id: 2,
  item_type: "产品",
  ...
}
    ↓
.then(keysToCamelCase) 转换字段名:
{
  id: 1,
  userId: 2,
  itemType: "产品",
  ...
}
    ↓
最终返回给调用者的就是这个对象
而不是 { data: { id: 1, ... } }
```

### 为什么会误用 result.data.id？

可能原因：
1. 习惯性认为 API 返回 `{ data: {...} }` 结构
2. 没有注意到 `request()` 函数已经自动解包
3. 其他接口可能使用了 `raw: true` 选项，返回完整响应

### 正确的理解

```javascript
// 当 API 函数这样写时：
export function addFavorite(...) {
  return request('/personal/favorites', {...})
    .then(keysToCamelCase);
}

// 返回值直接是：
{ id: 1, userId: 2, itemType: "产品", ... }

// 而不是：
{ data: { id: 1, ... } }
```

---

## ✅ 验证步骤

### 测试1: 产品收藏
1. ✅ 访问产品详情页
2. ✅ 点击"☆ 收藏"
3. ✅ 不弹出错误提示
4. ✅ 按钮变为"★ 已收藏"

### 测试2: 后台查看
1. ✅ 进入后台"我的收藏"
2. ✅ 看到刚才收藏的产品
3. ✅ 点击"查看"按钮
4. ✅ 正确跳转到产品详情页（不是空白页）

### 测试3: 取消收藏
1. ✅ 在后台点击"取消收藏"
2. ✅ 不报错
3. ✅ 收藏移到"最近取消"

### 测试4: 刷新保持状态
1. ✅ 收藏产品后刷新页面
2. ✅ 按钮保持"★ 已收藏"状态

### 测试5: 公司收藏
1. ✅ 访问公司详情页
2. ✅ 点击收藏不报错
3. ✅ 可以在后台查看

### 测试6: 证书收藏
1. ✅ 访问证书详情页
2. ✅ 点击收藏不报错
3. ✅ 可以在后台查看

---

## 📊 影响范围

### 修改的文件
- `/src/pages/ProductDetailPage.jsx` (4处修改)
- `/src/pages/CompanyPage.jsx` (2处修改)
- `/src/pages/CertificatePage.jsx` (3处修改)
- `/src/pages/admin/AdminV2Page.jsx` (1处修改)

### 受影响的功能
- ✅ 产品收藏
- ✅ 公司收藏
- ✅ 证书收藏
- ✅ 收藏状态加载
- ✅ 查看按钮跳转
- ✅ 分享链接

---

## 🎯 总结

### 修复前的问题
❌ 收藏后弹出错误提示  
❌ "查看"按钮跳转到空白页  
❌ 刷新后收藏状态不保存  

### 修复后的效果
✅ 收藏功能完全正常  
✅ "查看"按钮正确跳转  
✅ 收藏状态正确加载和保存  
✅ 所有详情页收藏功能一致  

---

**修复完成时间**: 2026-06-26  
**测试状态**: ✅ 全部通过  
**可以开始使用**: ✅ 是
