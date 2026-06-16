/**
 * 最近查看记录管理工具
 * 使用localStorage存储用户最近查看的证书
 */

const STORAGE_KEY = 'eu-doc-recent-views';
const MAX_ITEMS = 10;

/**
 * 添加一条查看记录
 * @param {Object} certificate - 证书对象
 */
export function addRecentView(certificate) {
  if (!certificate || !certificate.id) return;

  const recentViews = getRecentViews();

  // 创建记录项
  const item = {
    id: certificate.id,
    certNo: certificate.certNo,
    productName: certificate.productName,
    companyName: certificate.companyName,
    category: certificate.category,
    issueDate: certificate.issueDate,
    status: certificate.status,
    thumbnailUrl: certificate.thumbnailUrl,
    viewedAt: new Date().toISOString(),
  };

  // 移除已存在的相同记录
  const filtered = recentViews.filter(v => v.id !== certificate.id);

  // 添加到最前面
  const updated = [item, ...filtered].slice(0, MAX_ITEMS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('保存最近查看记录失败:', error);
  }
}

/**
 * 获取所有最近查看记录
 * @returns {Array} 最近查看的证书列表
 */
export function getRecentViews() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('读取最近查看记录失败:', error);
    return [];
  }
}

/**
 * 清除所有最近查看记录
 */
export function clearRecentViews() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('清除最近查看记录失败:', error);
  }
}

/**
 * 移除单条记录
 * @param {number} id - 证书ID
 */
export function removeRecentView(id) {
  const recentViews = getRecentViews();
  const filtered = recentViews.filter(v => v.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('删除记录失败:', error);
  }
}
