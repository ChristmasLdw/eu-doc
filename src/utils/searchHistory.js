/**
 * 搜索历史记录管理工具
 * 使用 localStorage 存储最近的搜索记录
 */

const STORAGE_KEY = 'eu_doc_search_history';
const MAX_HISTORY_SIZE = 10; // 最多保存10条历史记录

/**
 * 获取搜索历史记录
 * @returns {string[]} 搜索历史数组
 */
export function getSearchHistory() {
  try {
    const history = localStorage.getItem(STORAGE_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Failed to get search history:', error);
    return [];
  }
}

/**
 * 添加搜索记录
 * @param {string} query - 搜索关键词
 */
export function addSearchHistory(query) {
  if (!query || !query.trim()) return;

  try {
    const history = getSearchHistory();
    const trimmedQuery = query.trim();

    // 移除重复项（如果存在）
    const filteredHistory = history.filter(item => item !== trimmedQuery);

    // 添加到开头
    const newHistory = [trimmedQuery, ...filteredHistory].slice(0, MAX_HISTORY_SIZE);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error('Failed to add search history:', error);
  }
}

/**
 * 删除指定的搜索记录
 * @param {string} query - 要删除的搜索关键词
 */
export function removeSearchHistory(query) {
  try {
    const history = getSearchHistory();
    const newHistory = history.filter(item => item !== query);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error('Failed to remove search history:', error);
  }
}

/**
 * 清空所有搜索历史
 */
export function clearSearchHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear search history:', error);
  }
}
