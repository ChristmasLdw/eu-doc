/**
 * EU-DOC 搜索结果页
 * 版本: 2.1.0
 *
 * 变更记录 (2.1.0):
 * - 添加搜索历史记录功能
 * - 优化搜索建议显示
 *
 * 变更记录 (2.0.0):
 * - 添加多语言支持
 * - 所有文案使用 t() 函数
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { getCertificates, getStats, getCompanies, getSearchSuggestions, getProducts } from '../services/api';
import { categories as defaultCategories } from '../data/mockData';
import { categoryLabel, localizedField } from '../utils/languageContent';
import { getSortOptions, mapSortToApiParams, getSuggestionTypeLabel } from '../utils/searchHelpers';
import { getSearchHistory, addSearchHistory, removeSearchHistory, clearSearchHistory } from '../utils/searchHistory';
import StatusBadge from '../components/StatusBadge';
import LazyImage from '../components/LazyImage';
import SearchModeRail from '../components/SearchModeRail';
import DocumentTypeRail from '../components/DocumentTypeRail';
import styles from './SearchPage.module.css';

// 每页显示条数
const PAGE_SIZE = 8;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchBoxRef = useRef(null);
  const suggestionsRef = useRef(null);
  const isUserTyping = useRef(false);
  const { t, i18n } = useTranslation();

  // 获取排序选项（使用多语言）
  const sortOptions = getSortOptions(t);

  // 从 URL 参数获取初始值
  const initialQuery = searchParams.get('q') || '';
  const initialMode = searchParams.get('mode') || 'all';
  const initialDocumentType = searchParams.get('documentType') || 'all';
  const initialCategory = searchParams.get('category') || '';
  const initialStatus = searchParams.get('status') || '';
  const initialIssuer = searchParams.get('issuer') || '';
  const initialStandard = searchParams.get('standard') || '';
  const initialSort = searchParams.get('sort') || 'relevance';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  // 组件内部状态
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [searchMode, setSearchMode] = useState(initialMode);
  const [documentType, setDocumentType] = useState(initialDocumentType);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [activeStatus, setActiveStatus] = useState(initialStatus);
  const [activeIssuer, setActiveIssuer] = useState(initialIssuer);
  const [activeStandard, setActiveStandard] = useState(initialStandard);
  const [sortBy, setSortBy] = useState(initialSort);
  const [currentPage, setCurrentPage] = useState(initialPage);

  useEffect(() => {
    const nextQuery = searchParams.get('q') || '';
    const nextMode = searchParams.get('mode') || 'all';
    const nextDocumentType = searchParams.get('documentType') || 'all';
    const nextCategory = searchParams.get('category') || '';
    const nextStatus = searchParams.get('status') || '';
    const nextIssuer = searchParams.get('issuer') || '';
    const nextStandard = searchParams.get('standard') || '';
    const nextSort = searchParams.get('sort') || 'relevance';
    const nextPage = parseInt(searchParams.get('page') || '1', 10);

    setQuery(nextQuery);
    setSubmittedQuery(nextQuery);
    setSearchMode(nextMode);
    setDocumentType(nextDocumentType);
    setActiveCategory(nextCategory);
    setActiveStatus(nextStatus);
    setActiveIssuer(nextIssuer);
    setActiveStandard(nextStandard);
    setSortBy(nextSort);
    setCurrentPage(Number.isNaN(nextPage) ? 1 : nextPage);
  }, [searchParams]);

  // API 返回的数据
  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 匹配的公司（搜索时自动查找）
  const [matchedCompanies, setMatchedCompanies] = useState([]);

  // 搜索建议由后端统一返回，避免不同来源先后刷新导致跳动
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // 搜索页分类固定使用下拉框；不要再恢复为按钮标签列表，避免分类过多时铺满页面。
  const categories = useMemo(() => {
    if (activeCategory && !defaultCategories.includes(activeCategory)) {
      return [activeCategory, ...defaultCategories];
    }
    return defaultCategories;
  }, [activeCategory]);

  // 发证机构和认证标准列表（从 API 统计数据获取）
  const [issuers, setIssuers] = useState([]);
  const [standards, setStandards] = useState([]);

  // 搜索历史记录
  const [searchHistory, setSearchHistory] = useState([]);

  // 组件挂载时加载搜索历史
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // 组件挂载时获取搜索建议数据源和筛选选项列表
  useEffect(() => {
    // 获取发证机构和认证标准列表（从统计 API 获取）
    getStats()
      .then((data) => {
        if (data) {
          // stats API 返回 issuersList 和 standards 数组
          if (Array.isArray(data.issuersList)) {
            setIssuers(data.issuersList.map((item) => item.issuer));
          }
          if (Array.isArray(data.standards)) {
            setStandards(data.standards.map((item) => item.standard));
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const keyword = query.trim();
    if (!keyword) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setSuggestionsLoading(true);
    const timer = window.setTimeout(() => {
      getSearchSuggestions(keyword, 12)
        .then((items) => {
          if (!cancelled) setSuggestions(items);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setSuggestionsLoading(false);
        });
    }, 35);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);


  // 点击外部关闭建议下拉
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 核心数据获取：监听搜索参数变化，调用 API 获取结果
  const fetchResults = useCallback(() => {
    setLoading(true);
    setError(null);
    // 不立即清空数据，避免闪烁
    // setMatchedCompanies([]);

    const params = { page: currentPage, pageSize: PAGE_SIZE };

    // 正式搜索词：输入过程中不刷新结果，只有提交搜索后才更新
    if (submittedQuery) params.search = submittedQuery;

    // 筛选条件
    if (activeCategory) params.category = activeCategory;
    if (activeStatus) params.status = activeStatus;
    if (activeIssuer) params.issuer = activeIssuer;
    if (activeStandard) params.standard = activeStandard;

    // 排序
    const sortMapping = mapSortToApiParams(sortBy);
    if (sortMapping) {
      params.sortBy = sortMapping.sortBy;
      params.sortOrder = sortMapping.sortOrder;
    } else if (sortBy === 'relevance' && !query) {
      // relevance 排序且无搜索词时，按 id 升序（显示有缩略图的早期证书）
      params.sortBy = 'id';
      params.sortOrder = 'ASC';
    }
    // 否则不传排序参数，后端使用默认排序

    // 根据搜索模式决定查询内容
    let certPromise;
    let companyPromise;
    let productPromise;

    if (searchMode === 'company') {
      // 企业模式：只查询企业
      certPromise = Promise.resolve({ data: [], pagination: { total: 0, totalPages: 1 } });
      productPromise = Promise.resolve({ data: [], pagination: { total: 0, totalPages: 1 } });
      companyPromise = getCompanies({
        search: submittedQuery,
        page: currentPage,
        pageSize: PAGE_SIZE
      }).catch(() => ({ data: [], pagination: { total: 0, totalPages: 1 } }));
    } else if (searchMode === 'product') {
      // 产品模式：查询产品
      certPromise = Promise.resolve({ data: [], pagination: { total: 0, totalPages: 1 } });
      companyPromise = Promise.resolve({ data: [] });
      productPromise = getProducts({
        search: submittedQuery,
        page: currentPage,
        pageSize: PAGE_SIZE,
        categoryId: activeCategory || undefined,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder
      }).catch(() => ({ data: [], pagination: { total: 0, totalPages: 1 } }));
    } else if (searchMode === 'document') {
      // 资料模式：查询证书/文档
      certPromise = getCertificates(params);
      productPromise = Promise.resolve({ data: [], pagination: { total: 0, totalPages: 1 } });
      companyPromise = Promise.resolve({ data: [] });
    } else {
      // 综合模式：同时查询证书和企业
      companyPromise = (submittedQuery && currentPage === 1)
        ? getCompanies({ search: submittedQuery, pageSize: 3 }).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] });
      certPromise = getCertificates(params);
      productPromise = Promise.resolve({ data: [], pagination: { total: 0, totalPages: 1 } });
    }

    Promise.all([certPromise, companyPromise, productPromise])
      .then(([certResult, companyResult, productResult]) => {
        // 批量更新所有状态，避免中间闪烁
        const updates = {};

        // 根据模式决定使用哪个数据源的总数
        if (searchMode === 'company') {
          // 企业模式：使用企业 API 的总数
          updates.results = [];

          // 保存企业列表
          if (companyResult && Array.isArray(companyResult.data)) {
            const q = submittedQuery.toLowerCase();
            const matched = companyResult.data.filter(
              (c) => c.name.toLowerCase().includes(q) || (c.nameEn && c.nameEn.toLowerCase().includes(q))
            );
            updates.companies = matched;
            // 使用 pagination.total，如果没有则使用数组长度
            updates.totalResults = companyResult.pagination?.total ?? matched.length;
            updates.totalPages = companyResult.pagination?.totalPages ?? 1;
          } else {
            updates.companies = [];
            updates.totalResults = 0;
            updates.totalPages = 1;
          }
        } else if (searchMode === 'product') {
          // 产品模式：使用产品 API 的总数
          updates.companies = [];
          if (productResult && Array.isArray(productResult.data)) {
            updates.results = productResult.data;
            updates.totalResults = productResult.pagination?.total ?? 0;
            updates.totalPages = productResult.pagination?.totalPages ?? 1;
          } else {
            updates.results = [];
            updates.totalResults = 0;
            updates.totalPages = 1;
          }
        } else {
          // 资料/综合模式：使用证书 API 的总数
          if (certResult) {
            let data = certResult.data || [];
            // relevance 排序：有搜索词时，匹配字段越多越靠前（前端二次排序）
            if (sortBy === 'relevance' && submittedQuery) {
              data = [...data].sort((a, b) => {
                const scoreA = [a.productName, a.model, a.companyName, a.certNo]
                  .filter((f) => f && f.toLowerCase().includes(submittedQuery.toLowerCase())).length;
                const scoreB = [b.productName, b.model, b.companyName, b.certNo]
                  .filter((f) => f && f.toLowerCase().includes(submittedQuery.toLowerCase())).length;
                return scoreB - scoreA;
              });
            }
            updates.results = data;
            updates.totalResults = certResult.pagination?.total ?? 0;
            updates.totalPages = certResult.pagination?.totalPages ?? 1;
          }

          // 综合模式需要企业数据
          if (searchMode === 'all' && companyResult && Array.isArray(companyResult.data)) {
            const q = submittedQuery.toLowerCase();
            const matched = companyResult.data.filter(
              (c) => c.name.toLowerCase().includes(q) || (c.nameEn && c.nameEn.toLowerCase().includes(q))
            );
            updates.companies = matched;
          } else {
            updates.companies = [];
          }
        }

        // 一次性更新所有状态
        if (updates.results !== undefined) setResults(updates.results);
        if (updates.totalResults !== undefined) setTotalResults(updates.totalResults);
        if (updates.totalPages !== undefined) setTotalPages(updates.totalPages);
        if (updates.companies !== undefined) setMatchedCompanies(updates.companies);
      })
      .catch((err) => {
        setError(err.message || t('common.fetchFailed'));
        setResults([]);
        setTotalResults(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [submittedQuery, activeCategory, activeStatus, activeIssuer, activeStandard, sortBy, currentPage, searchMode]);

  // 搜索参数变化时重新获取数据
  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // 正式搜索词变化时重置到第 1 页，输入过程不刷新结果页
  useEffect(() => { setCurrentPage(1); }, [submittedQuery]);

  // 模式切换处理
  const handleModeChange = (newMode) => {
    setSearchMode(newMode);
    setCurrentPage(1);

    // 立即清空结果，避免显示旧模式的数据导致闪烁
    setResults([]);
    setLoading(true);

    // 切换模式时，清除不适用的筛选条件
    if (newMode !== 'document') {
      setDocumentType('all');
    }

    const params = {};
    if (submittedQuery) params.q = submittedQuery;
    if (newMode !== 'all') params.mode = newMode;
    if (newMode === 'document' && documentType !== 'all') params.documentType = documentType;
    if (activeCategory) params.category = activeCategory;
    if (activeStatus) params.status = activeStatus;
    if (activeIssuer) params.issuer = activeIssuer;
    if (activeStandard) params.standard = activeStandard;
    if (sortBy !== 'relevance') params.sort = sortBy;
    setSearchParams(params);
  };

  // 资料类型切换处理
  const handleDocumentTypeChange = (newType) => {
    setDocumentType(newType);
    setCurrentPage(1);

    const params = {};
    if (submittedQuery) params.q = submittedQuery;
    if (searchMode !== 'all') params.mode = searchMode;
    if (newType !== 'all') params.documentType = newType;
    if (activeCategory) params.category = activeCategory;
    if (activeStatus) params.status = activeStatus;
    if (activeIssuer) params.issuer = activeIssuer;
    if (activeStandard) params.standard = activeStandard;
    if (sortBy !== 'relevance') params.sort = sortBy;
    setSearchParams(params);
  };

  // 同步所有筛选条件到 URL
  // pageOverride: 当需要立即同步页码时传入（因为 setState 是异步的）
  const syncUrl = (pageOverride, queryOverride = submittedQuery) => {
    const params = {};
    if (queryOverride) params.q = queryOverride;
    if (searchMode !== 'all') params.mode = searchMode;
    if (searchMode === 'document' && documentType !== 'all') params.documentType = documentType;
    if (activeCategory) params.category = activeCategory;
    if (activeStatus) params.status = activeStatus;
    if (activeIssuer) params.issuer = activeIssuer;
    if (activeStandard) params.standard = activeStandard;
    if (sortBy !== 'relevance') params.sort = sortBy;
    const page = pageOverride !== undefined ? pageOverride : currentPage;
    if (page > 1) params.page = page;
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const nextQuery = query.trim();
    if (nextQuery) {
      addSearchHistory(nextQuery);
      setSearchHistory(getSearchHistory());
    }
    setSubmittedQuery(nextQuery);
    setCurrentPage(1);
    syncUrl(1, nextQuery);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (value) => {
    const nextQuery = value.trim();
    setQuery(value);
    if (nextQuery) {
      addSearchHistory(nextQuery);
      setSearchHistory(getSearchHistory());
    }
    setSubmittedQuery(nextQuery);
    setShowSuggestions(false);
    setCurrentPage(1);
    syncUrl(1, nextQuery);
  };

  const handleHistoryClick = (historyItem) => {
    setQuery(historyItem);
    setSubmittedQuery(historyItem.trim());
    setShowSuggestions(false);
    setCurrentPage(1);
    syncUrl(1, historyItem.trim());
    // 不再添加到历史，因为已经存在
  };

  const handleDeleteHistory = (e, historyItem) => {
    e.stopPropagation();
    removeSearchHistory(historyItem);
    setSearchHistory(getSearchHistory());
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  const handleFilterChange = (setter, value) => {
    const nextValue = value === undefined ? '' : value;
    const nextCategory = setter === setActiveCategory ? nextValue : activeCategory;
    const nextStatus = setter === setActiveStatus ? nextValue : activeStatus;
    const nextIssuer = setter === setActiveIssuer ? nextValue : activeIssuer;
    const nextStandard = setter === setActiveStandard ? nextValue : activeStandard;

    setter(nextValue);
    setCurrentPage(1);

    const params = {};
    if (submittedQuery) params.q = submittedQuery;
    if (nextCategory) params.category = nextCategory;
    if (nextStatus) params.status = nextStatus;
    if (nextIssuer) params.issuer = nextIssuer;
    if (nextStandard) params.standard = nextStandard;
    if (sortBy !== 'relevance') params.sort = sortBy;
    setSearchParams(params);
  };

  // 高亮匹配文本
  const highlightText = (text) => {
    if (!submittedQuery || !text) return text;
    const regex = new RegExp(`(${submittedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className={styles.highlight}>{part}</mark> : part
    );
  };

  // 当前激活的筛选条件数量（用于显示"清除筛选"按钮）
  const activeFilterCount = [activeCategory, activeStatus, activeIssuer, activeStandard].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  // 清除所有筛选
  const clearAllFilters = () => {
    setActiveCategory('');
    setActiveStatus('');
    setActiveIssuer('');
    setActiveStandard('');
    setSortBy('relevance');
    setCurrentPage(1);
    const params = {};
    if (submittedQuery) params.q = submittedQuery;
    setSearchParams(params);
  };

  // 生成分页按钮
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    // 显示逻辑：首页 ... 当前页附近 ... 末页
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return (
      <div className={styles.pagination}>
        <button
          className={styles.pageBtn}
          disabled={currentPage === 1}
          onClick={() => { const p = currentPage - 1; setCurrentPage(p); syncUrl(p); }}
        >
          {t('search.prevPage')}
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className={styles.pageDots}>...</span>
          ) : (
            <button
              key={p}
              className={`${styles.pageBtn} ${currentPage === p ? styles.pageActive : ''}`}
              onClick={() => { setCurrentPage(p); syncUrl(p); }}
            >
              {p}
            </button>
          )
        )}
        <button
          className={styles.pageBtn}
          disabled={currentPage === totalPages}
          onClick={() => { const p = currentPage + 1; setCurrentPage(p); syncUrl(p); }}
        >
          {t('search.nextPage')}
        </button>
      </div>
    );
  };

  return (
    <div className={styles.page} data-search-mode={searchMode}>
      <div className={styles.container}>
        {/* 搜索栏 */}
        <div className={styles.searchBar}>
          <form className={styles.searchForm} onSubmit={handleSearch}>
            <div className={styles.searchBox} ref={searchBoxRef}>
              <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                className={styles.searchInput}
                placeholder={t('search.placeholder')}
                title={t('search.searchTipsContent')}
                value={query}
                onChange={(e) => { isUserTyping.current = true; setQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => {
                  // 只在用户主动输入后显示建议，避免直接打开搜索页时自动遮挡结果。
                  if (isUserTyping.current && query.trim()) {
                    setShowSuggestions(true);
                  }
                }}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => { setQuery(''); setShowSuggestions(false); }}
                >
                  ✕
                </button>
              )}
              <button type="submit" className={styles.searchButton}>{t('common.search')}</button>

              {/* 搜索建议/历史下拉 */}
              {showSuggestions && (
                <div className={styles.suggestions} ref={suggestionsRef}>
                  {/* 当有输入时显示搜索建议 */}
                  {query && suggestions.length > 0 && suggestions.map((s, i) => (
                    <button
                      key={i}
                      className={`${styles.suggestionItem} ${styles[`type_${s.type}`]}`}
                      onClick={() => handleSuggestionClick(s.value)}
                      type="button"
                    >
                      <span className={styles.suggestionType} data-type={s.type}>
                        {getSuggestionTypeLabel(s.type, t)}
                      </span>
                      <span className={styles.suggestionValue}>{s.value}</span>
                    </button>
                  ))}

                  {/* 当无输入时显示搜索历史 */}
                  {!query && searchHistory.length > 0 && (
                    <>
                      <div className={styles.historyHeader}>
                        <span className={styles.historyTitle}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {t('search.searchHistory')}
                        </span>
                        <button
                          type="button"
                          className={styles.clearHistoryBtn}
                          onClick={handleClearHistory}
                        >
                          {t('search.clearHistory')}
                        </button>
                      </div>
                      {searchHistory.map((item, i) => (
                        <button
                          key={i}
                          className={styles.historyItem}
                          onClick={() => handleHistoryClick(item)}
                          type="button"
                        >
                          <span className={styles.historyValue}>{item}</span>
                          <button
                            className={styles.deleteHistoryBtn}
                            onClick={(e) => handleDeleteHistory(e, item)}
                            type="button"
                          >
                            ✕
                          </button>
                        </button>
                      ))}
                    </>
                  )}

                  {/* 无建议和无历史时的提示 */}
                  {query && suggestions.length === 0 && (
                    <div className={styles.noSuggestions}>
                      <div>{suggestionsLoading ? t('search.matchingSuggestions') : t('search.noSuggestions')}</div>
                      <div className={styles.searchTip}>{t('search.searchTipsContent')}</div>
                    </div>
                  )}

                  {/* 空输入且无历史时显示搜索提示 */}
                  {!query && searchHistory.length === 0 && (
                    <div className={styles.noSuggestions}>
                      <div className={styles.searchTipsTitle}>💡 {t('search.searchTips')}</div>
                      <div className={styles.searchTip}>{t('search.searchTipsContent')}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>

          {/* 筛选条件 */}
          <div className={styles.filterRow}>
            <div className={styles.filterDropdowns}>
              <select
                className={styles.filterSelect}
                value={activeCategory}
                onChange={(e) => handleFilterChange(setActiveCategory, e.target.value || undefined)}
              >
                <option value="">{t('search.filters.allCategories')}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{categoryLabel(cat, i18n.language)}</option>
                ))}
              </select>
              <select
                className={styles.filterSelect}
                value={activeStatus}
                onChange={(e) => handleFilterChange(setActiveStatus, e.target.value || undefined)}
              >
                <option value="">{t('search.filters.allStatus')}</option>
                <option value="active">{t('search.status.active')}</option>
                <option value="expired">{t('search.status.expired')}</option>
                <option value="revoked">{t('search.status.revoked')}</option>
              </select>

              <select
                className={styles.filterSelect}
                value={activeIssuer}
                onChange={(e) => handleFilterChange(setActiveIssuer, e.target.value || undefined)}
              >
                <option value="">{t('search.filters.allIssuers')}</option>
                {issuers.map((issuer) => (
                  <option key={issuer} value={issuer}>{issuer}</option>
                ))}
              </select>

              <select
                className={styles.filterSelect}
                value={activeStandard}
                onChange={(e) => handleFilterChange(setActiveStandard, e.target.value || undefined)}
              >
                <option value="">{t('search.filters.allStandards')}</option>
                {standards.map((std) => (
                  <option key={std} value={std}>{std}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 活动筛选器标签显示 */}
        {activeFilterCount > 0 && (
          <div className={styles.activeFiltersBar}>
            <span className={styles.activeFiltersLabel}>
              {t('search.activeFilters')}:
            </span>
            <div className={styles.activeFilterTags}>
              {activeCategory && (
                <button
                  className={styles.activeFilterTag}
                  onClick={() => handleFilterChange(setActiveCategory, undefined)}
                >
                  {categoryLabel(activeCategory, i18n.language)}
                  <span className={styles.removeFilter}>✕</span>
                </button>
              )}
              {activeStatus && (
                <button
                  className={styles.activeFilterTag}
                  onClick={() => handleFilterChange(setActiveStatus, undefined)}
                >
                  {t(`search.status.${activeStatus}`)}
                  <span className={styles.removeFilter}>✕</span>
                </button>
              )}
              {activeIssuer && (
                <button
                  className={styles.activeFilterTag}
                  onClick={() => handleFilterChange(setActiveIssuer, undefined)}
                >
                  {activeIssuer}
                  <span className={styles.removeFilter}>✕</span>
                </button>
              )}
              {activeStandard && (
                <button
                  className={styles.activeFilterTag}
                  onClick={() => handleFilterChange(setActiveStandard, undefined)}
                >
                  {activeStandard}
                  <span className={styles.removeFilter}>✕</span>
                </button>
              )}
              <button className={styles.clearAllFiltersBtn} onClick={clearAllFilters}>
                {t('search.clearAllFilters')}
              </button>
            </div>
          </div>
        )}

        {/* 结果信息栏：数量 + 模式切换 + 排序 */}
        <div className={styles.resultInfo}>
          <div className={styles.resultLeft}>
            <span className={styles.resultCount}>
              {error ? (
                <>{t('common.loadFailed')}</>
              ) : searchMode === 'company' ? (
                // 企业模式：显示企业总数（使用 totalResults 而不是数组长度）
                <Trans i18nKey="search.companyResultCount" values={{ count: totalResults }} components={{ strong: <strong /> }} />
              ) : searchMode === 'product' ? (
                // 产品模式：只显示产品数量
                <Trans i18nKey="search.productResultCount" values={{ count: totalResults }} components={{ strong: <strong /> }} />
              ) : searchMode === 'document' ? (
                // 资料模式：只显示资料数量
                <Trans i18nKey="search.documentResultCount" values={{ count: totalResults }} components={{ strong: <strong /> }} />
              ) : matchedCompanies.length > 0 && totalResults === 0 ? (
                // 综合模式：只有企业
                <>{t('search.matchedCompanyResult', { count: matchedCompanies.length })}</>
              ) : matchedCompanies.length > 0 && totalResults > 0 ? (
                // 综合模式：企业+证书
                <>{t('search.mixedResult', { total: matchedCompanies.length + totalResults })} <em>{t('search.mixedResultDetail', { companyCount: matchedCompanies.length, docCount: totalResults })}</em></>
              ) : (
                // 综合模式：只有证书
                <Trans i18nKey="search.resultCount" values={{ count: totalResults }} components={{ strong: <strong /> }} />
              )}
            </span>
          </div>

          {/* 搜索模式切换 */}
          <SearchModeRail
            currentMode={searchMode}
            onModeChange={handleModeChange}
            counts={{
              all: totalResults + matchedCompanies.length,
              product: searchMode === 'product' ? totalResults : undefined,
              document: searchMode === 'document' ? totalResults : undefined,
              company: matchedCompanies.length,
            }}
          />

          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 资料类型轨道（仅在资料模式显示） */}
        <DocumentTypeRail
          currentType={documentType}
          onTypeChange={handleDocumentTypeChange}
          show={searchMode === 'document'}
        />

        {/* 错误提示 */}
        {error && (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>{t('common.loadFailed')}</h3>
            <p className={styles.emptyText}>{error}</p>
            <button className={styles.emptyClearBtn} onClick={fetchResults}>{t('search.retry')}</button>
          </div>
        )}

        {/* 公司卡片 */}
        {!error && matchedCompanies.length > 0 && (
          <div className={styles.companyCards}>
            {matchedCompanies.map((company) => (
              <Link
                to={`/companies/${company.id}`}
                key={`company-${company.id}`}
                className={styles.companyCard}
              >
                <div className={styles.companyIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18" />
                    <path d="M5 21V7l8-4v18" />
                    <path d="M19 21V11l-6-4" />
                    <path d="M9 9v.01" />
                    <path d="M9 12v.01" />
                    <path d="M9 15v.01" />
                    <path d="M9 18v.01" />
                  </svg>
                </div>
                <div className={styles.companyInfo}>
                  <h3 className={styles.companyName}>{highlightText(localizedField(company, 'name', i18n.language))}</h3>
                  {company.nameEn && company.nameEn !== localizedField(company, 'name', i18n.language) && (
                    <p className={styles.companyNameEn}>{company.nameEn}</p>
                  )}
                </div>
                <div className={styles.companyBadge}>
                  <span className={styles.companyCertCount}>{t('search.productCount', { count: company.productCount || 0 })}</span>
                  <span className={styles.companyDocCount}>{t('search.documentCount', { count: company.documentCount || company.certCount || 0 })}</span>
                  <span className={styles.companyViewBtn}>{t('search.viewCompany')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 结果列表 */}
        {!error && results.length > 0 ? (
          <>
            <div className={styles.resultList}>
              {results.map((item) => {
                // 产品模式：渲染产品卡片
                if (searchMode === 'product') {
                  return (
                    <Link
                      to={`/products/${item.id}`}
                      key={`product-${item.id}`}
                      className={styles.certCard}
                    >
                      <div className={styles.certBody}>
                        <div className={styles.certContent}>
                          <div className={styles.certHeader}>
                            <div className={styles.certMeta}>
                              <h3 className={styles.certCompany}>{highlightText(item.name)}</h3>
                              <p className={styles.certProduct}>
                                {item.model && `${item.model} · `}{item.companyName}
                              </p>
                            </div>
                            <StatusBadge status={item.status} />
                          </div>

                          <div className={styles.certDetails}>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>{t('search.productCategory')}</span>
                              <span className={styles.detailValue}>{item.categoryPath || t('search.uncategorized')}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>{t('search.relatedDocuments')}</span>
                              <span className={styles.detailValue}>
                                {item.certificateCount || 0} {t('search.certificates')} · {item.documentCount || 0} {t('search.documents')}
                              </span>
                            </div>
                            {item.description && (
                              <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                                <span className={styles.detailLabel}>{t('search.productDescription')}</span>
                                <span className={styles.detailValue}>
                                  {item.description.length > 100 ? `${item.description.slice(0, 100)}...` : item.description}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className={styles.certFooter}>
                            <span className={styles.certIssuer}>
                              {t('search.createdAt')}: {new Date(item.createdAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'zh-CN')}
                            </span>
                            <span className={styles.viewDetail}>{t('search.viewProduct')} →</span>
                          </div>
                        </div>

                        {/* 产品图片 */}
                        {item.imageUrl ? (
                          <div className={styles.certThumb}>
                            <LazyImage src={item.imageUrl} alt={item.name} />
                          </div>
                        ) : (
                          <div className={styles.certThumb} style={{ background: '#f7fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e0' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                }

                // 证书/文档模式：渲染证书卡片
                return (
                  <Link
                    to={item.productId ? `/products/${item.productId}` : `/documents/${item.id}`}
                    key={item.id}
                    className={styles.certCard}
                  >
                    <div className={styles.certBody}>
                      {/* 信息区域 */}
                      <div className={styles.certContent}>
                        <div className={styles.certHeader}>
                          <div className={styles.certMeta}>
                            <h3 className={styles.certCompany}>{highlightText(item.companyName)}</h3>
                            <p className={styles.certProduct}>{highlightText(item.productName)}</p>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>

                        <div className={styles.certDetails}>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>{t('certificate.certNo')}</span>
                            <span className={styles.detailValue}>{highlightText(item.certNo)}</span>
                          </div>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>{t('certificate.model')}</span>
                            <span className={styles.detailValue}>{highlightText(item.model)}</span>
                          </div>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>{t('certificate.standard')}</span>
                            <span className={styles.detailValue}>{item.standard}</span>
                          </div>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>{t('certificate.expiryDate')}</span>
                            <span className={styles.detailValue}>{item.expiryDate}</span>
                          </div>
                        </div>

                        <div className={styles.certFooter}>
                          <span className={styles.certIssuer}>{t('certificate.issuer')}: {item.issuer}</span>
                          <span className={styles.viewDetail}>{t('certificate.view')} →</span>
                        </div>
                      </div>

                      {/* 缩略图 */}
                      {item.thumbnailUrl && (
                        <div className={styles.certThumb}>
                          <LazyImage src={item.thumbnailUrl} alt={item.productName} />
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* 分页 */}
            {renderPagination()}
          </>
        ) : !error && !loading && matchedCompanies.length === 0 ? (
          <div className={styles.emptyState}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
              <path d="M8 11h6" />
            </svg>
            <h3 className={styles.emptyTitle}>{t('search.noResults')}</h3>
            <p className={styles.emptyText}>{t('search.tryDifferent')}</p>
            {activeFilterCount > 0 ? (
              <button className={styles.emptyClearBtn} onClick={clearAllFilters}>
                {t('search.clearAllFilters')}
              </button>
            ) : (
              <div className={styles.emptySearchTips}>
                <p className={styles.emptyTipsTitle}>💡 {t('search.searchTips')}:</p>
                <ul className={styles.emptyTipsList}>
                  <li>{t('search.placeholderHint')}</li>
                  <li>{t('search.searchTipsContent')}</li>
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
