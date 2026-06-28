# 收藏功能重新设计 - 基于实体ID和软删除

**设计时间**: 2026-06-26  
**状态**: ✅ 已完成

---

## 🎯 设计理念

### **原来的问题**
- ❌ 手动填写收藏信息，用户体验差
- ❌ 可以随意填写，无法关联到真实的产品/公司/文件
- ❌ 数据不一致，无法追踪
- ❌ 误删后无法恢复

### **新的设计**
- ✅ 基于实体ID的收藏（产品ID、公司ID、文件ID）
- ✅ 只能从详情页点"收藏"按钮添加
- ✅ 软删除机制，支持恢复
- ✅ "最近取消"功能，防止误删

---

## 📊 数据库设计

### **user_favorites 表结构**

```sql
CREATE TABLE user_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,              -- 用户ID
  item_type TEXT NOT NULL,                -- 类型：产品/公司/文件
  item_id INTEGER,                        -- 实体ID（关联到products/companies/documents表）
  title TEXT NOT NULL,                    -- 标题
  meta TEXT,                              -- 相关信息
  description TEXT,                       -- 描述
  note TEXT,                              -- 用户备注
  status TEXT DEFAULT '正常',            -- 状态：正常/需注意
  deleted_at DATETIME,                    -- 软删除时间（NULL=未删除）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### **关键字段说明**

- **item_id**: 关联到真实实体的ID
  - 产品收藏 → products.id
  - 公司收藏 → companies.id
  - 文件收藏 → documents.id

- **deleted_at**: 软删除标记
  - `NULL` = 正常收藏
  - `有值` = 已取消（但可恢复）

---

## 🔧 API设计

### **1. 添加收藏（基于实体ID）**

```http
POST /api/personal/favorites
Authorization: Bearer <token>

Body:
{
  "item_type": "产品|公司|文件",
  "item_id": 123,                    // 实体ID（必填）
  "title": "产品名称",
  "meta": "公司名称",
  "description": "描述信息"
}

Response:
{
  "success": true,
  "data": { ... },
  "message": "已添加到收藏"
}
```

**特性**:
- ✅ 检查重复（基于 user_id + item_type + item_id）
- ✅ 如果之前删除过，自动恢复（deleted_at 设为 NULL）

---

### **2. 取消收藏（软删除）**

```http
DELETE /api/personal/favorites/:id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "收藏已取消"
}
```

**实现**:
```sql
UPDATE user_favorites 
SET deleted_at = CURRENT_TIMESTAMP 
WHERE id = ? AND user_id = ?
```

- ✅ 不真正删除数据
- ✅ 可以在"最近取消"中恢复

---

### **3. 永久删除收藏**

```http
DELETE /api/personal/favorites/:id/permanent
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "已永久删除"
}
```

**实现**:
```sql
DELETE FROM user_favorites 
WHERE id = ? AND user_id = ?
```

- ⚠️ 真正删除数据，不可恢复
- ✅ 只能从"最近取消"列表中操作

---

### **4. 获取收藏列表**

```http
GET /api/personal/overview
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "favorites": [...],           // 正常收藏（deleted_at IS NULL）
    "recentlyDeleted": [...],     // 最近取消的收藏（deleted_at IS NOT NULL）
    ...
  }
}
```

**查询逻辑**:
```sql
-- 正常收藏
SELECT * FROM user_favorites 
WHERE user_id = ? AND deleted_at IS NULL 
ORDER BY updated_at DESC

-- 最近取消
SELECT * FROM user_favorites 
WHERE user_id = ? AND deleted_at IS NOT NULL 
ORDER BY deleted_at DESC 
LIMIT 20
```

---

## 🎨 前端UI设计

### **收藏页面工具栏**

```
[全部收藏] [公司] [产品] [文件] [已过期/下架提醒] [最近取消]
```

- 新增"最近取消"标签页
- 点击查看已删除的收藏

---

### **正常收藏卡片**

```
┌─────────────────────────────────┐
│ [产品]              [正常]       │
│ Equestrian Helmet F20           │
│ Guangzhou Safety Equipment Co.  │
│ 资质证书、DoC、说明书已收录      │
│ 备注：客户A需要核对证书          │
│ [查看] [编辑备注] [取消收藏]    │
└─────────────────────────────────┘
```

**操作**:
- 查看 → 跳转到详情页（待实现）
- 编辑备注 → 弹窗输入备注
- 取消收藏 → 软删除，移到"最近取消"

---

### **最近取消的收藏卡片**

```
┌─────────────────────────────────┐
│ [产品]              [已取消]     │  ← 半透明显示
│ Equestrian Helmet F20           │
│ Guangzhou Safety Equipment Co.  │
│ 资质证书、DoC、说明书已收录      │
│ 取消时间：2026-06-26 14:30:00   │
│ [恢复收藏] [永久删除]           │
└─────────────────────────────────┘
```

**操作**:
- 恢复收藏 → 重新添加到收藏（deleted_at = NULL）
- 永久删除 → 真正删除（需确认）

---

## 🔄 完整流程

### **添加收藏流程**

```
用户在产品详情页
    ↓
点击"收藏"按钮（星星图标）
    ↓
调用 POST /api/personal/favorites
    - item_type: "产品"
    - item_id: 产品ID
    - title: 产品名称
    - meta: 公司名称
    - description: 产品信息
    ↓
添加到收藏列表
    ↓
可以在"我的收藏"页面查看
```

---

### **取消收藏流程**

```
用户在"我的收藏"页面
    ↓
点击"取消收藏"按钮
    ↓
调用 DELETE /api/personal/favorites/:id
    - 设置 deleted_at = 当前时间
    ↓
从收藏列表移除
    ↓
出现在"最近取消"标签页
    ↓
显示提示："收藏已取消，可在'最近取消'中恢复"
```

---

### **恢复收藏流程**

```
用户在"最近取消"标签页
    ↓
找到误删的收藏
    ↓
点击"恢复收藏"按钮
    ↓
调用 POST /api/personal/favorites
    - 使用相同的 item_type 和 item_id
    - 后端检测到之前删除过
    - 自动恢复（deleted_at = NULL）
    ↓
重新出现在收藏列表
    ↓
从"最近取消"中消失
```

---

### **永久删除流程**

```
用户在"最近取消"标签页
    ↓
点击"永久删除"按钮
    ↓
弹出确认对话框："确定永久删除？此操作不可恢复。"
    ↓
用户确认
    ↓
调用 DELETE /api/personal/favorites/:id/permanent
    - 真正从数据库删除
    ↓
从"最近取消"中移除
    ↓
无法再恢复
```

---

## 🎯 使用场景

### **场景1：浏览产品时收藏**

用户在前台浏览产品详情页，看到感兴趣的产品：

1. 点击页面右上角的"⭐ 收藏"按钮
2. 系统自动保存：
   - item_type: "产品"
   - item_id: 产品的真实ID
   - title: 产品名称
   - meta: 所属公司名称
   - description: 产品型号、类别等
3. 按钮变为"★ 已收藏"
4. 可以在后台"我的收藏"查看

---

### **场景2：误删后恢复**

用户不小心点了"取消收藏"：

1. 收藏从列表中消失
2. 看到提示："收藏已取消，可在'最近取消'中恢复"
3. 点击"最近取消"标签页
4. 找到刚才删除的收藏
5. 点击"恢复收藏"
6. 收藏重新出现在列表中

---

### **场景3：定期清理**

用户想清理不需要的旧收藏：

1. 点击"取消收藏"按钮（软删除）
2. 一段时间后确认不再需要
3. 进入"最近取消"标签页
4. 点击"永久删除"
5. 确认后真正删除

---

## 💡 优势对比

| 特性 | 旧设计（手动填写） | 新设计（基于实体ID） |
|------|-------------------|---------------------|
| **添加收藏** | ❌ 需要手动填写表单 | ✅ 详情页点击按钮 |
| **数据准确性** | ❌ 可以随意填写 | ✅ 关联真实实体 |
| **数据一致性** | ❌ 无法保证 | ✅ 自动同步 |
| **误删恢复** | ❌ 无法恢复 | ✅ 可以恢复 |
| **用户体验** | ⭐⭐ 繁琐 | ⭐⭐⭐⭐⭐ 便捷 |
| **实体关联** | ❌ 无关联 | ✅ 有关联 |

---

## 🔐 安全特性

### **1. 用户隔离**
```sql
WHERE user_id = ?
```
- 用户只能看到和管理自己的收藏

### **2. 防止重复**
```sql
SELECT id, deleted_at 
FROM user_favorites 
WHERE user_id = ? AND item_type = ? AND item_id = ?
```
- 相同实体不会重复收藏
- 如果之前删除过，自动恢复而不是创建新记录

### **3. 软删除保护**
- 误删不会丢失数据
- 可以随时恢复
- 永久删除需要二次确认

---

## 📝 待实现功能

### **1. 详情页收藏按钮**（重要）

需要在以下页面添加"收藏"按钮：

- [ ] 产品详情页
- [ ] 公司详情页  
- [ ] 文件详情页

**按钮设计**:
```jsx
<button onClick={handleFavorite}>
  {isFavorited ? '★ 已收藏' : '☆ 收藏'}
</button>
```

---

### **2. 收藏状态同步**

- [ ] 产品详情页显示是否已收藏
- [ ] 列表页显示收藏标记
- [ ] 收藏/取消后实时更新UI

---

### **3. 实体数据同步**

当产品/公司/文件信息更新时，自动更新收藏中的title、meta等字段：

```sql
-- 定期任务或触发器
UPDATE user_favorites 
SET title = products.name,
    meta = companies.name,
    description = products.description
FROM products, companies
WHERE user_favorites.item_type = '产品'
  AND user_favorites.item_id = products.id
  AND products.company_id = companies.id
```

---

### **4. 过期提醒**

检测收藏的实体是否：
- 产品下架
- 证书过期
- 文件更新

自动更新status为"需注意"，显示在"已过期/下架提醒"标签

---

### **5. 批量操作**

- [ ] 批量取消收藏
- [ ] 批量恢复收藏
- [ ] 批量永久删除

---

## 🧪 测试要点

### **测试1: 软删除和恢复**
1. 取消一个收藏
2. 查看"最近取消"，确认出现
3. 点击"恢复收藏"
4. 确认回到收藏列表
5. 查看数据库，deleted_at 应该为 NULL

### **测试2: 防止重复**
1. 收藏一个产品
2. 尝试再次收藏相同产品
3. 应该提示"该项已在收藏列表中"

### **测试3: 恢复已删除项**
1. 收藏产品A
2. 取消收藏
3. 在"最近取消"中恢复
4. 应该使用原来的记录（不创建新记录）
5. 查看数据库，ID不变，只是deleted_at变为NULL

### **测试4: 永久删除**
1. 取消一个收藏
2. 在"最近取消"中永久删除
3. 确认数据库中记录被删除
4. 无法再恢复

---

## 📚 相关文档

- **数据库迁移**: 添加 `item_id` 和 `deleted_at` 字段
- **API文档**: 见本文档API设计部分
- **前端组件**: AdminV2Page.jsx 收藏功能部分

---

## 🚀 下一步

1. **实现详情页收藏按钮**（最重要）
   - 产品详情页
   - 公司详情页
   - 文件详情页

2. **实现收藏状态查询API**
   ```
   GET /api/personal/favorites/check?item_type=产品&item_id=123
   返回：{ "isFavorited": true, "favoriteId": 456 }
   ```

3. **实现实体数据同步**
   - 定时任务或触发器
   - 保持收藏数据最新

4. **完善"查看"按钮跳转**
   - 根据item_type和item_id跳转到详情页

---

**完成时间**: 2026-06-26  
**测试状态**: ✅ 基础功能已测试  
**部署状态**: ✅ 已部署到开发环境
