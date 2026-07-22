# 搜索结果卡片重构计划

## 目标

为不同搜索类型（产品、文档/资料）设计独立的卡片样式，同时保持统一的设计语言和可复用性。

## 现状分析

### 当前证书卡片结构
- **布局**：左侧信息区（flex: 1）+ 右侧 200px 缩略图
- **信息区**：
  - 顶部：公司名 + 产品名 + 状态徽章
  - 中间：2列网格详情（证书号、型号、标准、过期日期）
  - 底部：发证机构 + "查看详情"链接
- **样式**：卡片悬停效果、缩略图缩放、统一圆角和阴影

### 后端 API 状态
✅ `/api/v2/products` - 已实现（支持搜索、分页、筛选）
✅ `/api/v2/documents` - 已实现（支持搜索、分页、类型筛选）
❌ 前端尚未接入这两个 API，仍在使用旧的 `getCertificates`

### 数据字段

**产品**：
- `id`, `name`, `model`, `description`
- `company_name`, `category_name`, `category_path`
- `image_path` - 产品图片（可作为缩略图）
- `document_count`, `certificate_count` - 关联资料数量
- `status`, `created_at`

**文档/资料**：
- `id`, `title`, `document_type` (certificate/doc/manual)
- `product_name`, `company_name`
- `thumbnail_path` - 文档缩略图
- `cert_no`, `standard`, `issuer` (仅证书类型)
- `file_path`, `review_status`, `status`

## 设计方案

### 卡片设计原则

1. **统一布局模式**：所有卡片保持"左信息 + 右缩略图"的布局
2. **视觉一致性**：使用相同的圆角、阴影、悬停效果
3. **信息层级**：标题 > 副标题 > 详情网格 > 底部元信息
4. **灵活内容**：详情网格可容纳不同字段，自适应内容

### 产品卡片设计

**缩略图**：产品图片 (`image_path`)，无图时显示占位符

**信息区**：
- **标题**：产品名称 (name)
- **副标题**：型号 (model) + 公司名 (company_name)
- **详情网格** (2列)：
  - 分类 (category_path)
  - 相关资料 (document_count + certificate_count)
  - 描述摘要 (description，截断)
- **底部**：状态徽章 + "查看产品 →"

### 文档卡片设计

**缩略图**：文档缩略图 (`thumbnail_path`)，无图时显示文档类型图标

**信息区**：
- **标题**：文档标题 (title)
- **副标题**：产品名 (product_name) + 公司名 (company_name)
- **详情网格** (2列，根据文档类型动态显示)：
  - 证书类型：证书号 (cert_no)、标准 (standard)、发证机构 (issuer)
  - 其他类型：文档类型 (document_type)、相关产品 (product_name)
- **底部**：文档类型标签 + "查看文档 →"

### DoC 卡片设计

**缩略图**：DoC 文档缩略图

**信息区**：
- **标题**：DoC 标题 (title)
- **副标题**：产品名 + 公司名
- **详情网格** (2列)：
  - 符合标准 (standard，如果有)
  - 声明类型 (DoC/DoP 等)
  - 产品型号 (product_model)
- **底部**：文档类型 "符合性声明" + "查看详情 →"

## 实现步骤

### 第一阶段：接入 API 和数据处理

1. **在 `api.js` 中添加新的 API 函数**
   ```javascript
   export function getProducts(params) { ... }
   export function getDocuments(params) { ... }
   ```

2. **修改 SearchPage.jsx 的 `fetchResults` 函数**
   - `searchMode === 'product'` 时调用 `getProducts`
   - `searchMode === 'document'` 时调用 `getDocuments`
   - 保持向后兼容，证书仍使用 `getCertificates`

### 第二阶段：创建可复用卡片组件

1. **创建基础卡片组件** `SearchResultCard.jsx`
   ```jsx
   <SearchResultCard
     type="product|document|certificate"
     data={item}
     thumbnailUrl={...}
     title={...}
     subtitle={...}
     details={[{ label, value }, ...]}
     footer={...}
   />
   ```

2. **创建类型适配器函数**
   ```javascript
   function adaptProductCard(product) { ... }
   function adaptDocumentCard(document) { ... }
   function adaptCertificateCard(certificate) { ... }
   ```

### 第三阶段：渐进式替换

1. **先实现产品卡片**
   - 在 `searchMode === 'product'` 时使用新卡片组件
   - 测试并优化样式

2. **再实现文档卡片**
   - 在 `searchMode === 'document'` 时根据 `documentType` 使用不同适配器
   - 证书、DoC、说明书等显示不同字段

3. **保留证书兼容**
   - 综合模式 (`searchMode === 'all'`) 继续使用现有证书卡片
   - 待产品/文档卡片稳定后再统一

### 第四阶段：优化和完善

1. **缺失图片处理**
   - 产品无图：显示分类图标或品牌首字母
   - 文档无图：显示文档类型图标

2. **响应式优化**
   - 移动端缩略图缩小或移至顶部
   - 详情网格从2列变为1列

3. **性能优化**
   - 图片懒加载（已有 LazyImage 组件）
   - 列表虚拟滚动（如结果数量很大）

## 风险和注意事项

1. **向后兼容**：不破坏现有证书搜索功能
2. **数据完整性**：部分产品可能无图片，需要优雅降级
3. **用户体验**：卡片切换时避免布局跳动
4. **多语言**：新增的文案需要添加到翻译文件

## 待确认的问题

1. 产品卡片是否需要显示价格、库存等电商属性？（当前数据库无此字段）
2. 文档卡片是否需要显示上传时间、文件大小？
3. 是否需要在卡片上直接预览文档（如 PDF 首页）？

## 时间估算

- 第一阶段（API 接入）：1-2 小时
- 第二阶段（组件创建）：2-3 小时
- 第三阶段（渐进替换）：3-4 小时
- 第四阶段（优化完善）：2-3 小时

**总计**：8-12 小时
