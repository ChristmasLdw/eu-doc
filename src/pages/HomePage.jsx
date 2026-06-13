/**
 * EU-DOC 首页 - 证书搜索入口
 * 版本: 2.0.0
 *
 * 变更记录 (2.0.0):
 * - 添加多语言支持
 * - 所有文案使用 t() 函数
 * - 适配主题切换
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { categories } from '../data/mockData';
import { getStats, getCertificates, getCompanies } from '../services/api';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchBoxRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // 统计数据（从 API 获取）
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // 公司列表
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  // 搜索建议数据源
  const [suggestionData, setSuggestionData] = useState([]);

  // 组件挂载时获取数据
  useEffect(() => {
    // 获取统计数据
    getStats()
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));

    // 获取公司列表
    getCompanies({ pageSize: 20 })
      .then((result) => {
        if (result && Array.isArray(result.data)) {
          setCompanies(result.data);
        }
      })
      .catch(() => {})
      .finally(() => setCompaniesLoading(false));

    // 获取搜索建议数据源（按id升序，优先显示有缩略图的早期证书）
    getCertificates({ pageSize: 100, sortBy: 'id', sortOrder: 'ASC' })
      .then((result) => {
        if (result && Array.isArray(result.data)) {
          setSuggestionData(result.data);
        }
      })
      .catch(() => {});
  }, []);

  // 搜索建议
  const suggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    const seen = new Set();
    const results = [];
    suggestionData.forEach((cert) => {
      const fields = [
        { type: 'product', value: cert.productName },
        { type: 'model', value: cert.model },
        { type: 'company', value: cert.companyName },
        { type: 'certNo', value: cert.certNo },
      ];
      fields.forEach(({ type, value }) => {
        if (value && value.toLowerCase().includes(q) && !seen.has(value)) {
          seen.add(value);
          results.push({ type, value });
        }
      });
      if (results.length >= 20) return;
    });
    const typeOrder = { company: 0, product: 1, model: 2, certNo: 3 };
    results.sort((a, b) => {
      if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
      return a.value.localeCompare(b.value, 'zh-CN', { numeric: true });
    });
    return results;
  }, [searchQuery, suggestionData]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSuggestionClick = (value) => {
    setSearchQuery(value);
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  const handleCategoryClick = (category) => {
    navigate(`/search?category=${encodeURIComponent(category)}`);
  };

  // 获取建议类型的显示文本
  const getSuggestionTypeLabel = (type) => {
    const labels = {
      product: t('certificate.productName'),
      model: t('certificate.model'),
      company: t('certificate.company'),
      certNo: t('certificate.certNo')
    };
    return labels[type] || type;
  };

  return (
    <div className={styles.page}>
      {/* 主搜索区域 */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>{t('home.title')}</h1>
            <p className={styles.subtitle}>{t('home.subtitle')}</p>
          </div>

          <form className={styles.searchForm} onSubmit={handleSearch}>
            <div className={styles.searchBox} ref={searchBoxRef}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder={t('home.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              <button type="submit" className={styles.searchButton}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <span>{t('home.searchButton')}</span>
              </button>

              {showSuggestions && suggestions.length > 0 && (
                <div className={styles.suggestions}>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      className={`${styles.suggestionItem} ${styles[`type_${s.type}`]}`}
                      onClick={() => handleSuggestionClick(s.value)}
                      type="button"
                    >
                      <span className={styles.suggestionType} data-type={s.type}>
                        {getSuggestionTypeLabel(s.type)}
                      </span>
                      <span className={styles.suggestionValue}>{s.value}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>

          {/* 快捷分类入口 */}
          <div className={styles.categories}>
            <span className={styles.categoriesLabel}>{t('search.filters.category')}：</span>
            <div className={styles.categoryList}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={styles.categoryTag}
                  onClick={() => handleCategoryClick(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 已入驻企业板块 */}
      <section className={styles.companiesSection}>
        <div className={styles.companiesContainer}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('company.certificates')}</h2>
            <p className={styles.sectionSubtitle}>{t('home.subtitle')}</p>
          </div>

          {companiesLoading ? (
            <div className={styles.loading}>{t('common.loading')}</div>
          ) : companies.length > 0 ? (
            <div className={styles.companyGrid}>
              {companies.map((company) => (
                <Link
                  key={company.id}
                  to={`/company/${company.id}`}
                  className={styles.companyCard}
                >
                  <div className={styles.companyIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21h18" />
                      <path d="M5 21V7l8-4v18" />
                      <path d="M19 21V11l-6-4" />
                      <path d="M9 9v.01" />
                      <path d="M9 12v.01" />
                      <path d="M9 15v.01" />
                      <path d="M9 18v.01" />
                    </svg>
                  </div>
                  <h3 className={styles.companyName}>{company.name}</h3>
                  <div className={styles.companyCertCount}>
                    <span className={styles.certCount}>{company.certCount || 0}</span>
                    <span className={styles.certLabel}>{t('company.certificates')}</span>
                  </div>
                  <div className={styles.companyArrow}>→</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>{t('search.noResults')}</div>
          )}
        </div>
      </section>

      {/* 统计信息区域 */}
      <section className={styles.statsSection}>
        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {statsLoading ? '--' : (stats?.total ?? '--')}
            </div>
            <div className={styles.statLabel}>{t('home.stats.certificates')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {statsLoading ? '--' : (stats?.active ?? '--')}
            </div>
            <div className={styles.statLabel}>{t('search.status.active')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {statsLoading ? '--' : (stats?.companies ?? '--')}
            </div>
            <div className={styles.statLabel}>{t('home.stats.companies')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {statsLoading ? '--' : (stats?.searches ?? '--')}
            </div>
            <div className={styles.statLabel}>{t('home.stats.searches')}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
