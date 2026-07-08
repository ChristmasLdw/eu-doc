/**
 * EU-DOC 首页 - 证书搜索入口
 * 版本: 2.0.0
 *
 * 变更记录 (2.0.0):
 * - 添加多语言支持
 * - 所有文案使用 t() 函数
 * - 适配主题切换
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { categories } from '../data/mockData';
import { getSearchSuggestions } from '../services/api';
import { categoryLabel } from '../utils/languageContent';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchBoxRef = useRef(null);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const keyword = searchQuery.trim();
    if (!keyword) {
      setSuggestions([]);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      getSearchSuggestions(keyword, 12)
        .then((items) => {
          if (!cancelled) setSuggestions(items);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, 60);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

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
            <span className={styles.categoriesLabel}>{t('home.featuredCategories')}</span>
            <div className={styles.categoryList}>
              {featuredCategories.map((cat) => (
                <button
                  key={cat}
                  className={styles.categoryTag}
                  onClick={() => handleCategoryClick(cat)}
                >
                  {categoryLabel(cat, i18n.language)}
                </button>
              ))}
              <button className={`${styles.categoryTag} ${styles.categoryMoreTag}`} onClick={() => handleCategoryClick('more')}>{t('home.moreCategories')}</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
