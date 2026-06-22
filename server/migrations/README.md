# EU-DOC 数据库迁移脚本

## v2.0.0 迁移说明

**迁移目标**: 从 `企业 -> 证书` 升级为 `企业 -> 产品 -> 文档` 平台架构

**迁移日期**: 2026-06-22

---

## 文件说明

- `v2.0.0-migration.cjs` - 主迁移脚本，创建新表并迁移数据
- `v2.0.0-rollback.cjs` - 回滚脚本，恢复到 v1.x 结构
- `verify-migration.cjs` - 验证脚本，检查数据完整性
- `README.md` - 本文件

---

## 使用方法

### 1. 备份数据库（必须！）

```bash
cp server/data/eu-doc.db server/data/eu-doc.db.backup-before-v2.0.0
```

### 2. 执行迁移

```bash
cd server/migrations
node v2.0.0-migration.cjs
```

### 3. 验证迁移结果

```bash
node verify-migration.cjs
```

### 4. 如果需要回滚

```bash
node v2.0.0-rollback.cjs
```

或者直接恢复备份：

```bash
cp server/data/eu-doc.db.backup-before-v2.0.0 server/data/eu-doc.db
```

---

## 迁移内容

### 新增表

1. `users` - 平台用户表（替代 admins）
2. `company_members` - 企业成员关系表
3. `company_verification_documents` - 企业认证资料表
4. `categories` - 三级分类表
5. `tags` - 标签表
6. `products` - 产品表
7. `product_tags` - 产品标签关联表
8. `documents` - 统一文档表
9. `document_tags` - 文档标签关联表
10. `certificate_metadata` - 证书元数据表
11. `upload_confirmations` - 上传确认记录表

### 扩展表

- `companies` - 增加企业认证相关字段
- `audit_logs` - 调整字段名（admin_id → user_id）
- `certificate_reports` - 增加 document_id 支持

### 保留表

- `certificates` → 重命名为 `certificates_legacy`（迁移后作为备份）
- `admins` → 重命名为 `admins_legacy`（迁移后作为备份）

---

## 数据迁移映射

### admins → users
```
username → email (转为 username@legacy.local)
password_hash → password_hash
role → platform_role
created_at → created_at
```

### certificates → products + documents + certificate_metadata
```
证书 → 提取唯一产品 → products
证书 → 创建文档记录 → documents (document_type='certificate')
证书特有字段 → certificate_metadata
```

---

## 验证标准

- [ ] 所有新表创建成功
- [ ] 旧证书数量 = 新 documents (type='certificate') 数量
- [ ] 所有证书元数据完整迁移
- [ ] 产品数据正确提取
- [ ] 无孤立外键
- [ ] 回滚脚本可正常恢复

---

## 风险提示

⚠️ **执行迁移前务必备份数据库！**

⚠️ **迁移过程中不要中断脚本！**

⚠️ **验证通过后再修改后端 API 代码！**

---

## 技术支持

如遇问题，检查以下内容：

1. 数据库文件路径是否正确
2. Node.js 版本是否 >= 14
3. better-sqlite3 是否已安装
4. 数据库文件是否有写权限

查看详细错误日志：

```bash
node v2.0.0-migration.cjs 2>&1 | tee migration.log
```
