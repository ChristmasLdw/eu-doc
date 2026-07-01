/**
 * EU-DOC 后台管理 - 文档管理页面
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CertificatesPage.module.css';

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });

  useEffect(() => {
    fetchDocuments();
  }, [pagination.page, search, filterType, filterStatus]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (search) params.append('search', search);
      if (filterType) params.append('documentType', filterType);
      if (filterStatus) params.append('reviewStatus', filterStatus);

      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/eu-doc/api/v2/documents?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        setDocuments(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('获取文档列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`确定要删除文档 "${title}" 吗？`)) return;

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/eu-doc/api/v2/documents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        alert('删除成功');
        fetchDocuments();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (err) {
      console.error('删除文档失败:', err);
      alert('删除失败');
    }
  };

  const handleReview = async (id, status) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/eu-doc/api/v2/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reviewStatus: status })
      });
      const data = await res.json();

      if (data.success) {
        fetchDocuments();
      } else {
        alert(data.message || '操作失败');
      }
    } catch (err) {
      console.error('审核失败:', err);
      alert('操作失败');
    }
  };

  const getTypeName = (type) => {
    const typeMap = {
      'certificate': '证书',
      'declaration_of_conformity': 'DoC',
      'manual': '说明书',
      'test_report': '检测报告',
      'other': '其他'
    };
    return typeMap[type] || type;
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'approved': '已通过',
      'pending': '待审核',
      'rejected': '已拒绝'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'approved': '#4ade80',
      'pending': '#facc15',
      'rejected': '#f87171'
    };
    return colorMap[status] || '#9ca3af';
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>文档管理</h1>
      </div>

      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <div className={styles.searchForm}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="搜索文档标题..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filters}>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            className={styles.filterSelect}
          >
            <option value="">全部类型</option>
            <option value="certificate">证书</option>
            <option value="declaration_of_conformity">DoC</option>
            <option value="manual">说明书</option>
            <option value="test_report">检测报告</option>
            <option value="other">其他</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            className={styles.filterSelect}
          >
            <option value="">全部状态</option>
            <option value="approved">已通过</option>
            <option value="pending">待审核</option>
            <option value="rejected">已拒绝</option>
          </select>
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>加载中...</div>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>暂无文档</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>文档标题</th>
                <th>类型</th>
                <th>产品</th>
                <th>企业</th>
                <th>状态</th>
                <th>上传时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id}>
                  <td>{doc.id}</td>
                  <td>{doc.title}</td>
                  <td>{getTypeName(doc.document_type)}</td>
                  <td className={styles.companyCell}>{doc.product_name || '-'}</td>
                  <td className={styles.companyCell}>{doc.company_name || '-'}</td>
                  <td>
                    <span style={{ color: getStatusColor(doc.review_status) }}>
                      {getStatusLabel(doc.review_status)}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(doc.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {doc.review_status === 'pending' && (
                        <>
                          <button
                            className={styles.approveBtn}
                            onClick={() => handleReview(doc.id, 'approved')}
                          >
                            通过
                          </button>
                          <button
                            className={styles.rejectBtn}
                            onClick={() => handleReview(doc.id, 'rejected')}
                          >
                            拒绝
                          </button>
                        </>
                      )}
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(doc.id, doc.title)}
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
