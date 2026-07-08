/**
 * EU-DOC 后台管理 - 上传确认记录管理
 * 查看所有产品资料上传时的确认记录
 */

import { useState, useEffect } from 'react';
import styles from './UploadConfirmationsPage.module.css';

export default function UploadConfirmationsPage() {
  const [confirmations, setConfirmations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    pageSize: 20,
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchConfirmations();
  }, [filters]);

  const fetchConfirmations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const queryParams = new URLSearchParams({
        page: filters.page,
        pageSize: filters.pageSize,
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/eu-doc/api/v2/upload-confirmations?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setConfirmations(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('获取上传确认记录失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters({ ...filters, page: 1 });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>上传确认记录</h1>
          <p className={styles.subtitle}>查看所有产品资料上传时的确认声明记录</p>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className={styles.toolbar}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="搜索资料标题、用户邮箱..."
            className={styles.searchInput}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <button type="submit" className={styles.searchBtn}>搜索</button>
        </form>
      </div>

      {/* 数据表格 */}
      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : confirmations.length === 0 ? (
        <div className={styles.empty}>暂无上传确认记录</div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>资料标题</th>
                  <th>上传者</th>
                  <th>企业</th>
                  <th>真实性确认</th>
                  <th>授权确认</th>
                  <th>免责声明</th>
                  <th>IP 地址</th>
                  <th>上传时间</th>
                </tr>
              </thead>
              <tbody>
                {confirmations.map((record) => (
                  <tr key={record.id}>
                    <td>{record.document_title || `资料 #${record.document_id}`}</td>
                    <td>{record.user_email || record.user_display_name || '-'}</td>
                    <td>{record.company_name || '-'}</td>
                    <td>
                      <span className={record.confirmed_authentic ? styles.checkYes : styles.checkNo}>
                        {record.confirmed_authentic ? '✓' : '✗'}
                      </span>
                    </td>
                    <td>
                      <span className={record.confirmed_authorized ? styles.checkYes : styles.checkNo}>
                        {record.confirmed_authorized ? '✓' : '✗'}
                      </span>
                    </td>
                    <td>
                      <span className={record.accepted_disclaimer ? styles.checkYes : styles.checkNo}>
                        {record.accepted_disclaimer ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className={styles.ipAddress}>{record.ip_address || '-'}</td>
                    <td className={styles.date}>
                      {new Date(record.created_at).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              >
                上一页
              </button>
              <span className={styles.pageInfo}>
                第 {pagination.page} / {pagination.totalPages} 页（共 {pagination.total} 条）
              </span>
              <button
                className={styles.pageBtn}
                disabled={filters.page >= pagination.totalPages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
