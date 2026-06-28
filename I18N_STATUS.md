# EU-DOC 多语言支持状态

**更新时间**: 2026-06-26

---

## ✅ 已支持多语言的页面

### 核心功能页面
1. **HomePage.jsx** - 首页 ✅
2. **SearchPage.jsx** - 搜索页面 ✅
3. **ProductsPage.jsx** - 产品列表 ✅
4. **CertificatePage.jsx** - 证书详情页 ✅
5. **CompanyPage.jsx** - 公司详情页 ✅
6. **HistoryPage.jsx** - 浏览历史 ✅
7. **SharePage.jsx** - 分享页面 ✅

### 法律政策页面
8. **PrivacyPage.jsx** - 隐私政策 ✅
9. **TermsPage.jsx** - 服务条款 ✅

### 其他页面
10. **ContactPage.jsx** - 联系我们 ✅ (刚刚完成)

---

## ❌ 未支持多语言的页面

### 高优先级（核心功能）
1. **ProductDetailPage.jsx** - 产品详情页 ❌
   - **状态**: 已添加翻译文件，需要修改组件代码
   - **影响**: 用户查看产品详情时无法切换语言
   - **优先级**: 🔴 高

### 中优先级（常用功能）
2. **GuidePage.jsx** - 使用指南 ❌
   - **状态**: 未开始
   - **影响**: 新用户无法查看其他语言的使用说明
   - **优先级**: 🟡 中

3. **CompanyVerificationPage.jsx** - 企业认证 ❌
   - **状态**: 未开始
   - **影响**: 企业入驻流程无多语言支持
   - **优先级**: 🟡 中

### 低优先级（辅助功能）
4. **DisclaimerPage.jsx** - 免责声明 ❌
   - **状态**: 未开始
   - **优先级**: 🟢 低

5. **EnterpriseAgreementPage.jsx** - 企业协议 ❌
   - **状态**: 未开始
   - **优先级**: 🟢 低

6. **UploadCommitmentPage.jsx** - 上传承诺书 ❌
   - **状态**: 未开始
   - **优先级**: 🟢 低

### 账户相关页面
7. **EmailVerifyPage.jsx** - 邮箱验证 ❌
   - **状态**: 未开始
   - **优先级**: 🟡 中

8. **ForgotPasswordPage.jsx** - 忘记密码 ❌
   - **状态**: 未开始
   - **优先级**: 🟡 中

9. **ResetPasswordPage.jsx** - 重置密码 ❌
   - **状态**: 未开始
   - **优先级**: 🟡 中

---

## 📊 统计

- **总页面数**: 19
- **已支持多语言**: 10 (52.6%)
- **未支持多语言**: 9 (47.4%)

### 按优先级分类
- 🔴 高优先级: 1 个页面
- 🟡 中优先级: 5 个页面
- 🟢 低优先级: 3 个页面

---

## 🎯 推荐的完成顺序

基于用户使用频率和功能重要性：

### 第一批（核心功能）
1. ✅ **ContactPage.jsx** - 已完成
2. **ProductDetailPage.jsx** - 产品详情页（最重要）
   - 翻译键已添加到 zh.json 和 en.json
   - 需要修改组件代码使用 t() 函数

### 第二批（常用功能）
3. **GuidePage.jsx** - 使用指南
4. **CompanyVerificationPage.jsx** - 企业认证
5. **EmailVerifyPage.jsx** - 邮箱验证
6. **ForgotPasswordPage.jsx** - 忘记密码
7. **ResetPasswordPage.jsx** - 重置密码

### 第三批（辅助功能）
8. **DisclaimerPage.jsx** - 免责声明
9. **EnterpriseAgreementPage.jsx** - 企业协议
10. **UploadCommitmentPage.jsx** - 上传承诺书

---

## 📝 ProductDetailPage 待修改清单

ProductDetailPage.jsx 的翻译已经添加到 zh.json 和 en.json，现在需要修改组件代码：

### 需要修改的文本

#### 1. 错误消息
- `"加载产品失败"` → `t('productDetail.loadFailed')`
- `"网络错误，请稍后重试"` → `t('productDetail.networkError')`
- `"产品不存在"` → `t('productDetail.productNotFound')`

#### 2. 按钮和标签
- `"← 返回产品列表"` → `t('productDetail.backToList')`
- `"型号:"` → `t('productDetail.model') + ':'`
- `"收藏"` / `"已收藏"` → `t('productDetail.favorite')` / `t('productDetail.favorited')`
- `"分享"` → `t('productDetail.share')`
- `"✓ 有效"` / `"✗ 无效"` → `t('productDetail.status.active')` / `t('productDetail.status.inactive')`

#### 3. 信息标签
- `"所属企业"` → `t('productDetail.company')`
- `"企业英文名"` → `t('productDetail.companyEnglish')`
- `"产品标签"` → `t('productDetail.tags')`

#### 4. 资料中心
- `"资料中心"` → `t('productDetail.resourceCenter')`
- `"📜 资质证书"` → `'📜 ' + t('productDetail.certificates')`
- `"📋 DoC 声明文件"` → `'📋 ' + t('productDetail.declarations')`
- `"📖 使用说明书"` → `'📖 ' + t('productDetail.manuals')`

#### 5. 提示信息
- `"请选择一个证书"` → `t('productDetail.selectCertificate')`
- `"该证书暂无文件"` → `t('productDetail.noCertificateFile')`
- `"查看证书详情"` → `t('productDetail.viewCertificateDetail')`
- `"打开原 PDF"` → `t('productDetail.openPdf')`
- `"不支持预览此文件格式"` → `t('productDetail.unsupportedFormat')`
- `"暂无 DoC 声明文件"` → `t('productDetail.noDeclarations')`
- `"暂无使用说明书"` → `t('productDetail.noManuals')`

#### 6. Alert消息
- `"链接已复制到剪贴板"` → `t('productDetail.linkCopied')`

### 估计工作量
- 预计修改行数: ~30-40 行
- 预计时间: 15-20 分钟

---

## 🔧 如何为页面添加多语言支持

### 步骤1: 添加翻译文本

在 `/src/i18n/locales/zh.json` 中添加：
```json
"pageName": {
  "key1": "中文文本",
  "key2": "中文文本"
}
```

在 `/src/i18n/locales/en.json` 中添加：
```json
"pageName": {
  "key1": "English text",
  "key2": "English text"
}
```

### 步骤2: 修改组件代码

```javascript
// 导入 useTranslation
import { useTranslation } from 'react-i18next';

export default function PageName() {
  // 使用 hook
  const { t } = useTranslation();
  
  return (
    <div>
      {/* 替换硬编码文本 */}
      <h1>{t('pageName.key1')}</h1>
      <p>{t('pageName.key2')}</p>
    </div>
  );
}
```

---

## 📦 已添加的翻译命名空间

- `common` - 通用文本
- `nav` - 导航
- `home` - 首页
- `search` - 搜索
- `certificate` - 证书
- `company` - 公司
- `history` - 历史
- `share` - 分享
- `privacy` - 隐私政策
- `terms` - 服务条款
- `productDetail` - 产品详情 ✅ (新增)
- `contact` - 联系我们 ✅ (新增)
- `footer` - 页脚
- `messages` - 系统消息
- `auth` - 认证相关

---

## ✅ 下一步行动

1. **完成 ProductDetailPage.jsx 的代码修改** (最高优先级)
   - 已有翻译文件
   - 需要修改组件代码

2. **添加 GuidePage 的翻译**
   - 需要添加 zh.json 和 en.json 翻译
   - 需要修改组件代码

3. **依次完成其他中优先级页面**

---

**备注**: 后台管理页面（AdminV2Page等）暂时不需要多语言支持，因为主要面向中文用户。
