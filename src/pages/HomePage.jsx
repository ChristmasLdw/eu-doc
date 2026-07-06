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
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { categories } from '../data/mockData';
import { getCertificates } from '../services/api';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchBoxRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // 搜索建议数据源
  const [suggestionData, setSuggestionData] = useState([]);

  // 组件挂载时获取数据
  useEffect(() => {
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
    if (category === 'more') {
      navigate('/search');
      return;
    }
    navigate(`/search?category=${encodeURIComponent(category)}`);
  };

  const featuredCategories = categories.slice(0, 4);

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
            <span className={styles.categoriesLabel}>常用方向</span>
            <div className={styles.categoryList}>
              {featuredCategories.map((cat) => (
                <button
                  key={cat}
                  className={styles.categoryTag}
                  onClick={() => handleCategoryClick(cat)}
                >
                  {cat}
                </button>
              ))}
              <button className={`${styles.categoryTag} ${styles.categoryMoreTag}`} onClick={() => handleCategoryClick('more')}>更多分类</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
