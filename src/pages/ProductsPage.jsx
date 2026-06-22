/**
 * EU-DOC v2.0 - 产品列表页面
 *
 * 功能:
 * - 显示所有产品列表
 * - 支持搜索、筛选、分页
 * - 显示每个产品的文档数量
 * - 点击产品查看详情
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './ProductsPage.module.css';

function ProductsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });

  // 从URL获取查询参数
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const companyId = searchParams.get('companyId') || '';
  const categoryId = searchParams.get('categoryId') || '';

  // 获取产品列表
  useEffect(() => {
    fetchProducts();
  }, [page, search, companyId, categoryId]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
      });

      if (search) params.append('search', search);
      if (companyId) params.append('companyId', companyId);
      if (categoryId) params.append('categoryId', categoryId);

      const response = await fetch(`/eu-doc/api/v2/products?${params}`);
      const data = await response.json();

      if (data.success) {
        setProducts(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.message || '加载产品失败');
      }
    } catch (err) {
      console.error('获取产品列表失败:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 搜索处理
  const handleSearch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const searchValue = formData.get('search');

    const newParams = new URLSearchParams(searchParams);
    if (searchValue) {
      newParams.set('search', searchValue);
    } else {
      newParams.delete('search');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // 清除搜索
  const handleClearSearch = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // 翻页
  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
    window.scrollTo(0, 0);
  };

  // 查看产品详情
  const handleViewProduct = (productId) => {
    navigate(`/products/${productId}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>产品管理</h1>
        <p className={styles.subtitle}>
          共 {pagination.total} 个产品
        </p>
      </div>

      {/* 搜索栏 */}
      <div className={styles.searchSection}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            name="search"
            placeholder="搜索产品名称、型号..."
            defaultValue={search}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            🔍 搜索
          </button>
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className={styles.clearButton}
            >
              ✕ 清除
            </button>
          )}
        </form>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>加载中...</p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className={styles.error}>
          <p>⚠️ {error}</p>
          <button onClick={fetchProducts} className={styles.retryButton}>
            重试
          </button>
        </div>
      )}

      {/* 产品列表 */}
      {!loading && !error && (
        <>
          {products.length === 0 ? (
            <div className={styles.empty}>
              <p>😔 没有找到产品</p>
              {search && (
                <button onClick={handleClearSearch} className={styles.clearButton}>
                  清除搜索条件
                </button>
              )}
            </div>
          ) : (
            <div className={styles.productGrid}>
              {products.map(product => (
                <div
                  key={product.id}
                  className={styles.productCard}
                  onClick={() => handleViewProduct(product.id)}
                >
                  <div className={styles.productHeader}>
                    <h3 className={styles.productName}>{product.name}</h3>
                    {product.model && (
                      <span className={styles.productModel}>{product.model}</span>
                    )}
                  </div>

                  <div className={styles.productInfo}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>企业：</span>
                      <span className={styles.infoValue}>{product.company_name}</span>
                    </div>

                    {product.category_name && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>分类：</span>
                        <span className={styles.infoValue}>{product.category_name}</span>
                      </div>
                    )}

                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>文档数：</span>
                      <span className={styles.docCount}>
                        {product.document_count || 0}
                      </span>
                    </div>

                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>证书数：</span>
                      <span className={styles.certCount}>
                        {product.certificate_count || 0}
                      </span>
                    </div>
                  </div>

                  <div className={styles.productFooter}>
                    <span className={styles.productDate}>
                      创建于 {new Date(product.created_at).toLocaleDateString('zh-CN')}
                    </span>
                    <span className={styles.viewButton}>查看详情 →</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className={styles.pageButton}
              >
                ← 上一页
              </button>

              <div className={styles.pageInfo}>
                第 {page} / {pagination.totalPages} 页
              </div>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === pagination.totalPages}
                className={styles.pageButton}
              >
                下一页 →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProductsPage;
