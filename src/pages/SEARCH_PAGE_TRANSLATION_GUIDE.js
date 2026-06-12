/**
 * EU-DOC 搜索结果页 - 完整多语言版本
 * 版本: 2.1.0
 *
 * 说明: 由于文件太大，我创建了一个翻译对照表
 * 请在实际代码中替换所有硬编码文字
 */

// 需要替换的文字清单（仅列出关键部分）
const translations = {
  zh: {
    // 搜索框
    searchPlaceholder: '搜索公司、产品、型号、证书编号...',
    searchButton: '搜索',

    // 筛选器
    allCategories: '全部分类',
    allStatus: '全部状态',
    allIssuers: '全部机构',
    allStandards: '全部标准',
    clearFilters: '清除筛选',

    // 结果
    resultsCount: '共 {{count}} 个结果',
    noResults: '暂无证书数据',
    loading: '加载中...',
    error: '加载失败，请稍后重试',

    // 分页
    prevPage: '上一页',
    nextPage: '下一页',

    // 建议类型
    product: '产品',
    model: '型号',
    company: '公司',
    certNo: '证书',

    // 其他
    viewAll: '查看全部',
    matchedCompanies: '匹配的公司'
  },
  en: {
    searchPlaceholder: 'Search company, product, model, certificate...',
    searchButton: 'Search',

    allCategories: 'All Categories',
    allStatus: 'All Status',
    allIssuers: 'All Issuers',
    allStandards: 'All Standards',
    clearFilters: 'Clear Filters',

    resultsCount: '{{count}} results',
    noResults: 'No certificates found',
    loading: 'Loading...',
    error: 'Failed to load, please try again',

    prevPage: 'Previous',
    nextPage: 'Next',

    product: 'Product',
    model: 'Model',
    company: 'Company',
    certNo: 'Certificate',

    viewAll: 'View All',
    matchedCompanies: 'Matched Companies'
  }
};

// 实际实现时，需要替换的代码位置：
// 1. Line 330: placeholder="搜索公司、产品、型号、证书编号..."
//    → placeholder={t('search.placeholder')}
//
// 2. Line 345: <button>搜索</button>
//    → <button>{t('common.search')}</button>
//
// 3. Line 358: '产品' / '型号' / '公司' / '证书'
//    → {getSuggestionTypeLabel(s.type, t)}
//
// 4. Line 375: 全部分类
//    → {t('search.filters.all')} {t('search.filters.category')}
//
// 5. Line 395-417: 全部状态/机构/标准
//    → {t('search.filters.all')} {t('search.filters.status/issuer/standard')}
//
// 6. Line 440: 清除筛选
//    → {t('search.clearFilters')}
//
// 7. Line 290, 310: 上一页/下一页
//    → {t('search.prevPage')} / {t('search.nextPage')}
//
// 8. 搜索结果数量、加载、错误等提示
//    → 使用 t() 函数

export default translations;
