# EU-DOC v2.0 API 参考文档

**版本**: v2.0.0  
**基础URL**: `http://localhost:3007/api`  
**最后更新**: 2026-06-22

---

## 目录

1. [认证](#认证)
2. [证书管理](#证书管理)
3. [产品管理](#产品管理)
4. [文档管理](#文档管理)
5. [分类管理](#分类管理)
6. [标签管理](#标签管理)
7. [企业管理](#企业管理)
8. [错误处理](#错误处理)

---

## 认证

### 认证方式

使用 Bearer Token 认证。登录后获取 token，在后续请求的 Header 中携带：

```
Authorization: Bearer <your-token>
```

### POST /api/auth/login

登录获取 token。

**请求**:
```bash
curl -X POST http://localhost:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-password"
  }'
```

**响应**:
```json
{
  "success": true,
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "display_name": "管理员",
    "role": "admin"
  }
}
```

---

## 证书管理

### GET /api/certificates

获取证书列表（公开，已审核证书）。

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |
| search | string | 否 | 搜索关键词 |
| companyId | number | 否 | 企业ID筛选 |
| status | string | 否 | 证书状态筛选 |
| reviewStatus | string | 否 | 审核状态（需登录） |
| issuer | string | 否 | 发证机构筛选 |
| standard | string | 否 | 标准筛选 |
| sortBy | string | 否 | 排序字段 |
| sortOrder | string | 否 | 排序方向 (ASC/DESC) |

**示例**:
```bash
# 基础查询
curl "http://localhost:3007/api/certificates?page=1&pageSize=10"

# 搜索
curl "http://localhost:3007/api/certificates?search=helmet"

# 筛选+排序
curl "http://localhost:3007/api/certificates?companyId=1&sortBy=created_at&sortOrder=DESC"
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "cert_no": "20_100_52_6160",
      "company_id": 1,
      "product_name": "Equestrian Helmet F20-201AL Series",
      "model": "F20-201AL, F20-201AE",
      "standard": "CE EN 1384",
      "issuer": "SGS",
      "issue_date": "2025-05-05",
      "expiry_date": "2028-05-04",
      "status": "active",
      "file_path": "/certificates/20_100_52_6160_cert.pdf",
      "review_status": "approved",
      "remark": null,
      "created_at": "2026-06-06 00:32:55",
      "updated_at": "2026-06-06 00:32:55",
      "company_name": "Shaoxing RIF Sports Goods Co., Ltd"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 30,
    "totalPages": 3
  }
}
```

---

### GET /api/certificates/:id

获取证书详情。

**示例**:
```bash
curl "http://localhost:3007/api/certificates/1"
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "cert_no": "20_100_52_6160",
    "company_id": 1,
    "product_name": "Equestrian Helmet F20-201AL Series",
    "model": "F20-201AL, F20-201AE, F20-201AE-MP, F20-202AL",
    "standard": "CE EN 1384",
    "issuer": "SGS",
    "issue_date": "2025-05-05",
    "expiry_date": "2028-05-04",
    "status": "active",
    "file_path": "/certificates/20_100_52_6160_cert.pdf",
    "review_status": "approved",
    "company_name": "Shaoxing RIF Sports Goods Co., Ltd",
    "company_name_en": "Shaoxing RIF Sports Goods Co., Ltd"
  }
}
```

---

### POST /api/certificates

创建证书（需认证）。

**请求体**:
```json
{
  "cert_no": "TEST-001",
  "company_id": 1,
  "product_name": "Test Product",
  "model": "TP-001",
  "standard": "CE EN 1384",
  "issuer": "SGS",
  "issue_date": "2026-01-01",
  "expiry_date": "2029-01-01",
  "status": "active",
  "remark": "测试证书"
}
```

**示例**:
```bash
curl -X POST http://localhost:3007/api/certificates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**响应**:
```json
{
  "success": true,
  "message": "证书创建成功",
  "id": 48
}
```

---

### PUT /api/certificates/:id

更新证书（需认证）。

**示例**:
```bash
curl -X PUT http://localhost:3007/api/certificates/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "expired",
    "remark": "已过期"
  }'
```

---

### DELETE /api/certificates/:id

删除证书（需认证，软删除）。

**示例**:
```bash
curl -X DELETE http://localhost:3007/api/certificates/1 \
  -H "Authorization: Bearer <token>"
```

---

### PUT /api/certificates/:id/review

审核证书（需管理员）。

**请求体**:
```json
{
  "status": "approved",
  "remark": "审核通过"
}
```

**示例**:
```bash
curl -X PUT http://localhost:3007/api/certificates/1/review \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "remark": "审核通过"
  }'
```

---

### POST /api/certificates/:id/upload

上传证书PDF文件（需认证）。

**示例**:
```bash
curl -X POST http://localhost:3007/api/certificates/1/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@certificate.pdf"
```

**响应**:
```json
{
  "success": true,
  "message": "文件上传成功",
  "filePath": "/certificates/TEST-001_cert.pdf",
  "thumbnailPath": "/thumbnails/TEST-001_thumb.png"
}
```

---

### POST /api/certificates/import

批量导入证书（需认证）。

**请求体**:
```json
{
  "certificates": [
    {
      "cert_no": "BATCH-001",
      "companyName": "Company A",
      "product_name": "Product 1",
      "model": "M001",
      "standard": "CE",
      "issuer": "SGS",
      "issueDate": "2026-01-01",
      "expiryDate": "2029-01-01"
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "message": "批量导入完成：成功 10 条，跳过 2 条",
  "imported": 10,
  "skipped": 2
}
```

---

## 产品管理

### GET /api/v2/products

获取产品列表。

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |
| search | string | 否 | 搜索关键词 |
| companyId | number | 否 | 企业ID |
| categoryId | number | 否 | 分类ID |
| status | string | 否 | 状态 |

**示例**:
```bash
curl "http://localhost:3007/api/v2/products?page=1&pageSize=10"
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "company_id": 1,
      "name": "Equestrian Helmet F10-102A",
      "model": "F10-102A",
      "description": null,
      "category_primary_id": null,
      "status": "active",
      "created_at": "2026-06-06 00:32:55",
      "company_name": "Shaoxing RIF Sports Goods Co., Ltd",
      "category_name": null,
      "document_count": 1,
      "certificate_count": 1
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 47,
    "totalPages": 5
  }
}
```

---

### GET /api/v2/products/:id

获取产品详情。

**示例**:
```bash
curl "http://localhost:3007/api/v2/products/1"
```

---

### GET /api/v2/products/:id/documents

获取产品的所有文档。

**示例**:
```bash
curl "http://localhost:3007/api/v2/products/1/documents"
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": 1,
      "document_type": "certificate",
      "title": "Equestrian Helmet F20-201AL Series - 20_100_52_6160",
      "cert_no": "20_100_52_6160"
    }
  ],
  "total": 1
}
```

---

### POST /api/v2/products

创建产品（需认证）。

**请求体**:
```json
{
  "company_id": 1,
  "name": "新产品",
  "model": "NP-001",
  "description": "产品描述",
  "category_primary_id": 1
}
```

---

### PUT /api/v2/products/:id

更新产品（需认证）。

---

### DELETE /api/v2/products/:id

删除产品（需管理员）。

---

## 文档管理

### GET /api/v2/documents

获取文档列表。

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |
| search | string | 否 | 搜索关键词 |
| companyId | number | 否 | 企业ID |
| productId | number | 否 | 产品ID |
| documentType | string | 否 | 文档类型 |
| reviewStatus | string | 否 | 审核状态 |

**文档类型**:
- `certificate` - 证书
- `declaration_of_conformity` - DoC声明
- `manual` - 说明书
- `test_report` - 测试报告
- `other` - 其他

**示例**:
```bash
curl "http://localhost:3007/api/v2/documents?documentType=certificate&page=1"
```

---

### GET /api/v2/documents/:id

获取文档详情。

**响应特点**:
- 如果是证书类型，自动包含 `certificate_metadata`
- 包含文档标签信息

**示例**:
```bash
curl "http://localhost:3007/api/v2/documents/1"
```

---

### POST /api/v2/documents

创建文档（需认证）。

---

### PUT /api/v2/documents/:id

更新文档（需认证）。

---

### DELETE /api/v2/documents/:id

删除文档（需认证）。

---

## 分类管理

### GET /api/v2/categories

获取分类列表。

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tree | boolean | 否 | 是否返回树形结构 |
| includeCount | boolean | 否 | 是否包含产品数量 |

**示例**:
```bash
# 扁平列表
curl "http://localhost:3007/api/v2/categories"

# 树形结构
curl "http://localhost:3007/api/v2/categories?tree=true"
```

**响应（树形）**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "安全防护设备",
      "level": 1,
      "product_count": 0,
      "children": [
        {
          "id": 11,
          "name": "头部防护",
          "level": 2,
          "product_count": 0,
          "children": []
        }
      ]
    }
  ],
  "total": 7
}
```

---

### GET /api/v2/categories/:id

获取分类详情（包含子分类）。

---

### POST /api/v2/categories

创建分类（需管理员）。

---

### PUT /api/v2/categories/:id

更新分类（需管理员）。

---

### DELETE /api/v2/categories/:id

删除分类（需管理员）。

---

## 标签管理

### GET /api/v2/tags

获取标签列表。

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 标签类型筛选 |
| includeCount | boolean | 否 | 是否包含使用统计 |

**标签类型**:
- `standard` - 标准认证
- `region` - 地区
- `material` - 材质
- `feature` - 特性
- `general` - 通用

**示例**:
```bash
# 所有标签
curl "http://localhost:3007/api/v2/tags"

# 筛选标准类型
curl "http://localhost:3007/api/v2/tags?type=standard"
```

---

### GET /api/v2/tags/:id

获取标签详情（包含使用示例）。

---

### POST /api/v2/tags

创建标签（需管理员）。

---

### PUT /api/v2/tags/:id

更新标签（需管理员）。

---

### DELETE /api/v2/tags/:id

删除标签（需管理员）。

---

### POST /api/v2/tags/:id/products

给产品打标签（需认证）。

**请求体**:
```json
{
  "product_id": 1
}
```

---

### DELETE /api/v2/tags/:id/products/:productId

移除产品标签（需认证）。

---

### POST /api/v2/tags/:id/documents

给文档打标签（需认证）。

---

### DELETE /api/v2/tags/:id/documents/:documentId

移除文档标签（需认证）。

---

## 错误处理

### 标准错误响应

```json
{
  "success": false,
  "message": "错误描述"
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 500 | 服务器错误 |

---

## API 端点总览

### 证书管理 (8个)
- GET /api/certificates
- GET /api/certificates/:id
- POST /api/certificates
- PUT /api/certificates/:id
- DELETE /api/certificates/:id
- PUT /api/certificates/:id/review
- POST /api/certificates/:id/upload
- POST /api/certificates/import

### 产品管理 (6个)
- GET /api/v2/products
- GET /api/v2/products/:id
- GET /api/v2/products/:id/documents
- POST /api/v2/products
- PUT /api/v2/products/:id
- DELETE /api/v2/products/:id

### 文档管理 (5个)
- GET /api/v2/documents
- GET /api/v2/documents/:id
- POST /api/v2/documents
- PUT /api/v2/documents/:id
- DELETE /api/v2/documents/:id

### 分类管理 (5个)
- GET /api/v2/categories
- GET /api/v2/categories/:id
- POST /api/v2/categories
- PUT /api/v2/categories/:id
- DELETE /api/v2/categories/:id

### 标签管理 (9个)
- GET /api/v2/tags
- GET /api/v2/tags/:id
- POST /api/v2/tags
- PUT /api/v2/tags/:id
- DELETE /api/v2/tags/:id
- POST /api/v2/tags/:id/products
- DELETE /api/v2/tags/:id/products/:productId
- POST /api/v2/tags/:id/documents
- DELETE /api/v2/tags/:id/documents/:documentId

**总计**: 33个API端点

---

## 版本历史

### v2.0.0 (2026-06-22)
- ✨ 全新的产品管理API
- ✨ 文档管理API
- ✨ 分类管理API
- ✨ 标签管理API
- ✅ 保持 v1.x 证书API兼容
- 🚀 性能优化（< 10ms）

### v1.x
- 基础证书管理功能

---

**文档版本**: v2.0.0  
**最后更新**: 2026-06-22  
**维护者**: EU-DOC Team
