/**
 * EU-DOC 后台管理 - 产品管理页面
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CertificatesPage.module.css';

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchProducts();
    }
  }, [pagination.page, search, currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/eu-doc/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.admin);
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (search) params.append('search', search);

      // 非管理员只查看自己企业的产品
      if (currentUser && currentUser.role !== 'admin' && currentUser.company_name) {
        // 根据企业名称查找企业 ID
        const token = localStorage.getItem('admin_token');
        const companiesRes = await fetch(`/eu-doc/api/companies?search=${encodeURIComponent(currentUser.company_name)}&pageSize=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const companiesData = await companiesRes.json();
        if (companiesData.success && companiesData.data.length > 0) {
          params.append('companyId', companiesData.data[0].id);
        }
      }

      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/eu-doc/api/v2/products?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        setProducts(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('获取产品列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`确定要删除产品 "${name}" 吗？`)) return;

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/eu-doc/api/v2/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        alert('删除成功');
        fetchProducts();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (err) {
      console.error('删除产品失败:', err);
      alert('删除失败');
    }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>产品管理</h1>
        <button
          className={styles.addBtn}
          onClick={() => navigate('/admin/products/create')}
        >
          + 创建产品
        </button>
      </div>

      {/* 搜索 */}
      <div className={styles.toolbar}>
        <div className={styles.searchForm}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="搜索产品名称、型号..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>加载中...</div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>暂无产品</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>产品名称</th>
                <th>型号</th>
                <th>企业</th>
                <th>分类</th>
                <th>文档数</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>{p.model || '-'}</td>
                  <td className={styles.companyCell}>{p.company_name || '-'}</td>
                  <td>{p.category_name || '-'}</td>
                  <td>{p.document_count || 0}</td>
                  <td>
                    <span style={{ color: p.status === 'active' ? '#4ade80' : '#f87171' }}>
                      {p.status === 'active' ? '有效' : '停用'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.editBtn}
                        onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                      >
                        编辑
                      </button>
                      <button
                        className={styles.editBtn}
                        onClick={() => navigate(`/admin/products/${p.id}/upload`)}
                      >
                        上传文档
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(p.id, p.name)}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={pagination.page === 1}
            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
          >
            上一页
          </button>
          <span className={styles.pageInfo}>第 {pagination.page} / {pagination.totalPages} 页</span>
          <button
            className={styles.pageBtn}
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
