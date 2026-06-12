/**
 * EU-DOC 后台管理 - 证书管理页
 * 版本: 1.0.2
 *
 * 变更记录 (1.0.2):
 * - 新增审核状态筛选（pending/approved/rejected）
 * - 管理员可以看到所有证书（包括待审核的）
 * - 新增审核操作按钮（通过/拒绝）
 * - 新增审核模态框（可填写审核备注）
 * - 从 URL 参数读取 reviewStatus 初始筛选值
 *
 * 设计意图:
 * - 证书的 CRUD（增删改查）完整管理界面
 * - 搜索 + 状态/审核状态/分类筛选 + 排序
 * - 表格展示，支持分页
 * - 新增/编辑使用模态框表单
 * - 删除操作需二次确认
 * - 状态标签复用前台 StatusBadge 组件
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';
import * as api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import styles from './CertificatesPage.module.css';

// 每页条数
const PAGE_SIZE = 10;

// 状态选项
const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '有效' },
  { value: 'expired', label: '已过期' },
  { value: 'revoked', label: '已撤销' },
];

// 审核状态选项
const REVIEW_STATUS_OPTIONS = [
  { value: '', label: '全部审核状态' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已拒绝' },
];

// 空的证书表单（用于新增和重置）
const emptyForm = {
  certNo: '',
  productName: '',
  model: '',
  companyName: '',
  category: '',
  standard: '',
  issuer: '',
  issueDate: '',
  expiryDate: '',
  status: 'active',
  description: '',
};

export default function CertificatesPage() {
  // 列表数据状态
  const [certificates, setCertificates] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('issue-desc');

  // 模态框状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState(null); // null = 新增模式，有值 = 编辑模式
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // 删除确认状态
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 审核模态框状态
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [reviewRemark, setReviewRemark] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // 获取当前用户角色
  const { isAdmin } = useAdmin();

  // 从 URL 参数读取初始审核状态筛选
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const initialReviewStatus = searchParams.get('reviewStatus');
    if (initialReviewStatus) {
      setReviewStatusFilter(initialReviewStatus);
    }
  }, []);

  // 获取证书列表
  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    try {
      // 将前端排序值映射为后端 API 参数
      const sortMapping = {
        'issue-desc': { sortBy: 'issue_date', sortOrder: 'DESC' },
        'issue-asc': { sortBy: 'issue_date', sortOrder: 'ASC' },
        'expiry-asc': { sortBy: 'expiry_date', sortOrder: 'ASC' },
        'expiry-desc': { sortBy: 'expiry_date', sortOrder: 'DESC' },
      };
      const sort = sortMapping[sortOrder] || { sortBy: 'created_at', sortOrder: 'DESC' };

      const result = await api.getCertificates({
        page,
        pageSize: PAGE_SIZE,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        ...sort,
        reviewStatus: reviewStatusFilter || undefined,
      });
      setCertificates(result.data || []);
      setTotal(result.pagination?.total ?? (result.data || []).length);
    } catch (err) {
      console.error('获取证书列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, categoryFilter, sortOrder, reviewStatusFilter]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  // 筛选条件变化时重置到第 1 页
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  // 搜索
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  // 打开新增模态框
  const handleAdd = () => {
    setEditingCert(null);
    setFormData(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  // 打开编辑模态框
  const handleEdit = (cert) => {
    setEditingCert(cert);
    setFormData({
      certNo: cert.certNo || '',
      productName: cert.productName || '',
      model: cert.model || '',
      companyName: cert.companyName || '',
      category: cert.category || '',
      standard: cert.standard || '',
      issuer: cert.issuer || '',
      issueDate: cert.issueDate ? cert.issueDate.split('T')[0] : '',
      expiryDate: cert.expiryDate ? cert.expiryDate.split('T')[0] : '',
      status: cert.status || 'active',
      description: cert.description || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  // 提交表单（新增或编辑）
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // 基本校验
    if (!formData.certNo.trim() || !formData.productName.trim()) {
      setFormError('证书编号和产品名称为必填项');
      return;
    }

    setFormLoading(true);
    try {
      if (editingCert) {
        await api.updateCertificate(editingCert.id, formData);
      } else {
        await api.createCertificate(formData);
      }
      setModalOpen(false);
      fetchCertificates(); // 刷新列表
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // 删除证书
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteCertificate(deleteTarget.id);
      setDeleteTarget(null);
      fetchCertificates(); // 刷新列表
    } catch (err) {
      console.error('删除失败:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // 打开审核模态框
  const handleOpenReview = (cert, status) => {
    setReviewTarget(cert);
    setReviewStatus(status);
    setReviewRemark('');
  };

  // 提交审核
  const handleReview = async () => {
    if (!reviewTarget) return;
    setReviewLoading(true);
    try {
      await api.reviewCertificate(reviewTarget.id, reviewStatus, reviewRemark || undefined);
      setReviewTarget(null);
      fetchCertificates(); // 刷新列表
    } catch (err) {
      console.error('审核失败:', err);
    } finally {
      setReviewLoading(false);
    }
  };

  // 表单字段更新
  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // 渲染审核状态标签
  const renderReviewBadge = (status) => {
    const map = {
      pending: { label: '待审核', color: '#facc15', bg: 'rgba(234, 179, 8, 0.1)' },
      approved: { label: '已通过', color: '#4ade80', bg: 'rgba(34, 197, 94, 0.1)' },
      rejected: { label: '已拒绝', color: '#f87171', bg: 'rgba(239, 68, 68, 0.1)' },
    };
    const info = map[status] || map.pending;
    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        color: info.color,
        background: info.bg,
      }}>
        {info.label}
      </span>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>证书管理</h1>
        <button className={styles.addBtn} onClick={handleAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新增证书
        </button>
      </div>

      {/* 搜索和筛选栏 */}
      <div className={styles.toolbar}>
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="搜索证书编号、产品名称、企业..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* 审核状态筛选（管理员可见） */}
          {isAdmin && (
            <select
              className={styles.filterSelect}
              value={reviewStatusFilter}
              onChange={(e) => handleFilterChange(setReviewStatusFilter, e.target.value)}
            >
              {REVIEW_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}

          <input
            type="text"
            className={styles.filterInput}
            placeholder="分类筛选"
            value={categoryFilter}
            onChange={(e) => handleFilterChange(setCategoryFilter, e.target.value)}
          />

          <select
            className={styles.filterSelect}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="issue-desc">签发日期（新→旧）</option>
            <option value="issue-asc">签发日期（旧→新）</option>
            <option value="expiry-asc">有效期（近→远）</option>
            <option value="expiry-desc">有效期（远→近）</option>
          </select>
        </div>
      </div>

      {/* 表格 */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>证书编号</th>
              <th>产品名称</th>
              <th>企业</th>
              <th>状态</th>
              {isAdmin && <th>审核状态</th>}
              <th>有效期至</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className={styles.emptyCell}>加载中...</td>
              </tr>
            ) : certificates.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className={styles.emptyCell}>暂无数据</td>
              </tr>
            ) : (
              certificates.map((cert) => (
                <tr key={cert.id}>
                  <td className={styles.certNo}>{cert.certNo}</td>
                  <td>{cert.productName}</td>
                  <td className={styles.companyCell}>{cert.companyName}</td>
                  <td><StatusBadge status={cert.status} /></td>
                  {isAdmin && <td>{renderReviewBadge(cert.reviewStatus)}</td>}
                  <td className={styles.dateCell}>{cert.expiryDate ? cert.expiryDate.split('T')[0] : '-'}</td>
                  <td className={styles.actionCell}>
                    <button className={styles.editBtn} onClick={() => handleEdit(cert)}>编辑</button>
                    <button className={styles.deleteBtn} onClick={() => setDeleteTarget(cert)}>删除</button>
                    {/* 管理员审核按钮（仅对 pending 状态的证书显示） */}
                    {isAdmin && cert.reviewStatus === 'pending' && (
                      <>
                        <button className={styles.approveBtn} onClick={() => handleOpenReview(cert, 'approved')}>通过</button>
                        <button className={styles.rejectBtn} onClick={() => handleOpenReview(cert, 'rejected')}>拒绝</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            上一页
          </button>
          <span className={styles.pageInfo}>{page} / {totalPages}</span>
          <button
            className={styles.pageBtn}
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            下一页
          </button>
        </div>
      )}

      {/* 新增/编辑模态框 */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingCert ? '编辑证书' : '新增证书'}</h2>
              <button className={styles.closeBtn} onClick={() => setModalOpen(false)}>X</button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>证书编号 *</label>
                  <input type="text" value={formData.certNo} onChange={(e) => updateFormField('certNo', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>产品名称 *</label>
                  <input type="text" value={formData.productName} onChange={(e) => updateFormField('productName', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>型号</label>
                  <input type="text" value={formData.model} onChange={(e) => updateFormField('model', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>企业名称</label>
                  <input type="text" value={formData.companyName} onChange={(e) => updateFormField('companyName', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>产品分类</label>
                  <input type="text" value={formData.category} onChange={(e) => updateFormField('category', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>认证标准</label>
                  <input type="text" value={formData.standard} onChange={(e) => updateFormField('standard', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>发证机构</label>
                  <input type="text" value={formData.issuer} onChange={(e) => updateFormField('issuer', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>状态</label>
                  <select value={formData.status} onChange={(e) => updateFormField('status', e.target.value)}>
                    <option value="active">有效</option>
                    <option value="expired">已过期</option>
                    <option value="revoked">已撤销</option>
                  </select>
                </div>
                <div className={styles.formField}>
                  <label>签发日期</label>
                  <input type="date" value={formData.issueDate} onChange={(e) => updateFormField('issueDate', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>有效期至</label>
                  <input type="date" value={formData.expiryDate} onChange={(e) => updateFormField('expiryDate', e.target.value)} />
                </div>
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label>描述</label>
                  <textarea value={formData.description} onChange={(e) => updateFormField('description', e.target.value)} rows={3} />
                </div>
              </div>

              {formError && <div className={styles.formError}>{formError}</div>}

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setModalOpen(false)}>取消</button>
                <button type="submit" className={styles.submitBtn} disabled={formLoading}>
                  {formLoading ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3>确认删除</h3>
            <p>确定要删除证书 <strong>{deleteTarget.certNo}</strong> 吗？此操作不可撤销。</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)}>取消</button>
              <button className={styles.dangerBtn} onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 审核模态框 */}
      {reviewTarget && (
        <div className={styles.modalOverlay} onClick={() => setReviewTarget(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3>{reviewStatus === 'approved' ? '审核通过' : '拒绝证书'}</h3>
            <p>
              证书编号: <strong>{reviewTarget.certNo}</strong>
              <br />
              产品名称: <strong>{reviewTarget.productName}</strong>
            </p>
            <div className={styles.reviewRemarkField}>
              <label>审核备注（可选）</label>
              <textarea
                value={reviewRemark}
                onChange={(e) => setReviewRemark(e.target.value)}
                placeholder={reviewStatus === 'approved' ? '可填写审核意见...' : '请填写拒绝原因...'}
                rows={3}
              />
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setReviewTarget(null)}>取消</button>
              <button
                className={reviewStatus === 'approved' ? styles.approveBtnFull : styles.dangerBtn}
                onClick={handleReview}
                disabled={reviewLoading}
              >
                {reviewLoading ? '处理中...' : reviewStatus === 'approved' ? '确认通过' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
