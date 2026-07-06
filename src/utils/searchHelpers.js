/**
 * 搜索页辅助函数和配置
 */

/**
 * 排序选项配置
 * 使用函数返回，以便支持多语言
 */
export function getSortOptions(t) {
  return [
    { value: 'relevance', label: t('search.sort.relevance') || '相关度优先' },
    { value: 'expiry-asc', label: t('search.sort.expiryAsc') || '有效期（近→远）' },
    { value: 'expiry-desc', label: t('search.sort.expiryDesc') || '有效期（远→近）' },
    { value: 'issue-desc', label: t('search.sort.newest') || '签发日期（新→旧）' },
    { value: 'issue-asc', label: t('search.sort.oldest') || '签发日期（旧→新）' },
  ];
}

/**
 * 将前端排序值映射为后端 API 的 sortBy 和 sortOrder 参数
 */
export function mapSortToApiParams(sortValue) {
  switch (sortValue) {
    case 'expiry-asc': return { sortBy: 'expiry_date', sortOrder: 'ASC' };
    case 'expiry-desc': return { sortBy: 'expiry_date', sortOrder: 'DESC' };
    case 'issue-desc': return { sortBy: 'issue_date', sortOrder: 'DESC' };
    case 'issue-asc': return { sortBy: 'issue_date', sortOrder: 'ASC' };
    default: return null;
  }
}

/**
 * 获取搜索建议类型的显示标签
 */
export function getSuggestionTypeLabel(type, t) {
  const labels = {
    product: t('certificate.productName'),
    model: t('certificate.model'),
    company: t('certificate.company'),
    certNo: t('certificate.certNo'),
    doc: 'DoC声明',
    manual: '说明书',
    file: '资料'
  };
  return labels[type] || type;
}
