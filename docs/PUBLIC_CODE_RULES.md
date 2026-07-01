# EU-DOC 公开编号规则

本文档定义 EU-DOC 2.0 之后对外公开使用的公司、产品、文档编号规则。公开编号会用于页面 URL、二维码、分享链接、说明书/包装印刷等场景，因此一旦生成必须长期稳定。

## 1. 核心原则

- 公开编号只使用纯数字，方便用户手动输入、客服口述和印刷展示。
- 公司、产品、文档分别使用独立编号池。
- 每种类型内部唯一，不要求跨类型唯一。
- 默认使用 8 位随机数字，范围建议为 `10000000` 到 `99999999`。
- 编号不使用自增序号，避免暴露平台数据规模。
- 编号不包含公司名、产品型号、文件类型、年份等业务含义。
- 编号一旦生成，不允许修改。
- 编号一旦使用，不允许复用。
- 删除、下架、隐藏后，编号仍然保留。

## 2. 编号类型

### 公司编号

公司编号对应一个公司主页。

示例：

```txt
58273910
```

对应 URL：

```txt
/eu-doc/companies/58273910
```

### 产品编号

产品编号对应某个公司下的一个产品系列，而不是单个型号。

例如，不同公司可以都有 `F20` 系列，但必须拥有不同产品编号：

```txt
RIF / F20 Series       -> 84739201
Cavali / F20 Series    -> 29384756
```

对应 URL：

```txt
/eu-doc/products/84739201
```

产品型号只是产品属性，不参与公开编号生成。

### 文档编号

文档编号对应一份具体文档，例如某个证书、某个 DoC、某个说明书、某个测试报告。

示例：

```txt
27481936
```

对应 URL：

```txt
/eu-doc/documents/27481936
```

文档替换新版文件时，文档编号不变；版本号另行记录。

### 分享编号

高级分享页后续再单独生成分享编号。分享编号同样使用纯数字、独立编号池、不可修改、不可复用。

## 3. URL 规则

永久公开 URL 采用类型路径 + 公开编号：

```txt
/eu-doc/companies/{companyCode}
/eu-doc/products/{productCode}
/eu-doc/documents/{documentCode}
```

示例：

```txt
/eu-doc/companies/58273910
/eu-doc/products/84739201
/eu-doc/documents/27481936
```

不要把数据库自增 ID 作为对外永久链接使用。

## 4. 二维码规则

- 二维码绑定完整类型 URL，不绑定数据库自增 ID。
- 产品二维码绑定产品 URL。
- 公司二维码绑定公司 URL。
- 文档二维码绑定文档 URL。
- 二维码图片必须在服务器备份。
- 二维码文件名应使用类型和公开编号，不使用公司名、产品名、文件名。

推荐二维码文件路径：

```txt
/uploads/qrcodes/companies/58273910.png
/uploads/qrcodes/products/84739201.png
/uploads/qrcodes/documents/27481936.png
```

二维码记录建议保存：

```txt
target_type
target_id
public_code
target_url
qr_image_path
checksum
status
created_at
```

## 5. 搜索规则

用户输入纯数字编号时：

- 在“全部”搜索中，可以显示公司、产品、文档多个匹配结果。
- 在“公司 / 产品 / 文档”筛选中，只查对应类型编号。
- 搜索结果必须清晰标注类型，避免同编号跨类型时混淆。

示例：

```txt
搜索 58273910

公司
- RIF Safety Equipment Co., Ltd.
  公司编号：58273910

产品
- F20 Equestrian Helmet Series
  产品编号：58273910
```

## 6. 删除和下架规则

删除公司、产品、文档时：

- 不删除公开编号。
- 不释放公开编号。
- 不允许其他对象复用该编号。
- 访问旧 URL 时应展示“资料已下架 / 暂不可访问”，而不是直接 404。

示例：

```txt
该产品资料已下架。
如需确认，请联系企业或 EU-DOC 平台。
```

## 7. 数据库建议

业务表建议保存公开编号字段：

```txt
companies.public_code
products.public_code
documents.public_code
```

每张表分别建立唯一索引：

```txt
UNIQUE(companies.public_code)
UNIQUE(products.public_code)
UNIQUE(documents.public_code)
```

建议额外建立统一登记表，便于二维码、分享、审计和后续迁移：

```txt
public_code_registry
- id
- target_type        company / product / document / share
- public_code        8位数字
- target_id          内部数据库 ID
- status             active / deleted / reserved
- created_at
- updated_at

UNIQUE(target_type, public_code)
```

## 8. 迁移要求

后续改造数据库和 URL 时，需要：

1. 给已有公司、产品、文档补生成公开编号。
2. 新建公司、产品、文档时自动生成公开编号。
3. 后台展示公开编号，但不允许用户修改。
4. 前台详情页支持通过公开编号访问。
5. 原数字自增 ID 链接仅作为兼容入口，不作为长期印刷或二维码链接。
6. 分享和二维码统一使用公开编号 URL。
7. 删除和下架时保留公开编号。

## 9. 当前结论

EU-DOC 现阶段采用：

```txt
纯数字
8位随机
按类型唯一
不可修改
不可复用
不表达业务含义
```

该规则后续如需调整，必须先评估已印刷二维码、说明书链接、外部分享链接的兼容成本。
