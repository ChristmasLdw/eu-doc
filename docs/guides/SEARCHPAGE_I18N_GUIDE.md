# SearchPage 多语言实施指南

由于 SearchPage.jsx 文件太大（578行），这里提供精确的修改指南。

## 需要修改的具体位置

### 1. 导入部分（文件开头）
```javascript
// 添加导入
import { useTranslation } from 'react-i18next';
import { getSortOptions, mapSortToApiParams, getSuggestionTypeLabel } from '../utils/searchHelpers';
```

### 2. 组件内部（第45行左右）
```javascript
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation(); // 添加这一行
  // ... 其他代码
```

### 3. 排序选项（删除原来的 sortOptions，改用函数）
```javascript
// 第35-41行，删除：
// const sortOptions = [
//   { value: 'relevance', label: '相关度优先' },
//   ...
// ];

// 改为在组件内部使用：
const sortOptions = getSortOptions(t);
```

### 4. JSX 渲染部分的具体替换

#### 搜索框占位符（约第330行）
```javascript
// 原来：
placeholder="搜索公司、产品、型号、证书编号..."
// 改为：
placeholder={t('search.placeholder')}
```

#### 搜索按钮（约第345行）
```javascript
// 原来：
<button type="submit" className={styles.searchButton}>搜索</button>
// 改为：
<button type="submit" className={styles.searchButton}>{t('home.searchButton')}</button>
```

#### 搜索建议类型标签（约第358行）
```javascript
// 原来：
{s.type === 'product' ? '产品' : s.type === 'model' ? '型号' : s.type === 'company' ? '公司' : '证书'}
// 改为：
{getSuggestionTypeLabel(s.type, t)}
```

#### 分类筛选（约第375行）
```javascript
// 原来：
全部分类
// 改为：
{t('search.filters.allCategories')}
```

#### 状态/机构/标准下拉框（约第395-417行）
```javascript
// 原来：
<option value="">全部状态</option>
// 改为：
<option value="">{t('search.filters.allStatus')}</option>

// 原来：
<option value="">全部机构</option>
// 改为：
<option value="">{t('search.filters.allIssuers')}</option>

// 原来：
<option value="">全部标准</option>
// 改为：
<option value="">{t('search.filters.allStandards')}</option>
```

#### 结果计数（约第430-436行）
```javascript
// 原来：
{loading ? (
  <>搜索中...</>
) : error ? (
  <>加载失败</>
) : (
  <>找到 <strong>{totalResults}</strong> 条结果</>
)}

// 改为：
{loading ? (
  <>{t('search.searching')}</>
) : error ? (
  <>{t('search.loadFailed')}</>
) : (
  <span dangerouslySetInnerHTML={{ __html: t('search.foundResults', { count: totalResults }) }} />
)}
```

#### 清除筛选按钮（约第440行）
```javascript
// 原来：
清除筛选 ({activeFilterCount})
// 改为：
{t('search.clearFilters')} ({activeFilterCount})
```

#### 分页按钮（约第290, 310行）
```javascript
// 原来：
上一页
// 改为：
{t('search.prevPage')}

// 原来：
下一页
// 改为：
{t('search.nextPage')}
```

#### 错误提示（约第458行）
```javascript
// 原来：
<h3 className={styles.emptyTitle}>加载失败</h3>
// 改为：
<h3 className={styles.emptyTitle}>{t('search.loadFailed')}</h3>

// 原来：
<button className={styles.emptyClearBtn} onClick={fetchResults}>重试</button>
// 改为：
<button className={styles.emptyClearBtn} onClick={fetchResults}>{t('search.retry')}</button>
```

#### 空状态提示（约第538-543行）
```javascript
// 原来：
<p className={styles.emptyText}>请尝试使用不同的关键词，或调整筛选条件</p>
// 改为：
<p className={styles.emptyText}>{t('search.tryDifferent')}</p>

// 原来：
<button className={styles.emptyClearBtn} onClick={clearAllFilters}>清除所有筛选条件</button>
// 改为：
<button className={styles.emptyClearBtn} onClick={clearAllFilters}>{t('search.clearAllFilters')}</button>
```

#### 公司卡片标题（约第492行）
```javascript
// 原来：
<span className={styles.companyViewBtn}>查看全部 →</span>
// 改为：
<span className={styles.companyViewBtn}>{t('search.viewAll')} →</span>
```

## 快速替换命令（使用 sed）

如果你熟悉命令行，可以使用以下命令快速替换：

```bash
cd src/pages

# 备份原文件
cp SearchPage.jsx SearchPage.jsx.backup

# 进行替换（示例）
sed -i '' 's/placeholder="搜索公司、产品、型号、证书编号..."/placeholder={t('\''search.placeholder'\'')}/g' SearchPage.jsx
sed -i '' 's/>搜索<\/button>/>{t('\''home.searchButton'\'')}<\/button>/g' SearchPage.jsx
sed -i '' 's/上一页/{t('\''search.prevPage'\'')}/g' SearchPage.jsx
sed -i '' 's/下一页/{t('\''search.nextPage'\'')}/g' SearchPage.jsx

# 更多替换...
```

## 验证步骤

修改完成后：

1. 运行 `npm run build` 确保无语法错误
2. 刷新浏览器测试搜索页
3. 切换语言验证所有文字都改变
4. 切换主题验证样式正常

## 预计工作量

- **修改点数：** 约 20 处
- **预计时间：** 15-20 分钟（手动修改）
- **风险：** 低（主要是文字替换）
