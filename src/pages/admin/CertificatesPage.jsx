/**
 * EU-DOC 后台管理 - 证书管理页
 * 版本: 1.0.3
 *
 * 变更记录 (1.0.3):
 * - 添加完整的多语言支持
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
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../../contexts/AdminContext';
import * as api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import FileUpload from '../../components/FileUpload';
import styles from './CertificatesPage.module.css';

// 每页条数
const PAGE_SIZE = 10;

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
  const { t } = useTranslation();

  // 状态选项
  const STATUS_OPTIONS = [
    { value: '', label: t('admin.certificatesPage.allStatus') },
    { value: 'active', label: t('search.status.active') },
    { value: 'expired', label: t('search.status.expired') },
    { value: 'revoked', label: t('search.status.revoked') },
  ];

  // 审核状态选项
  const REVIEW_STATUS_OPTIONS = [
    { value: '', label: t('admin.certificatesPage.allReviewStatus') },
    { value: 'pending', label: t('certificate.pending') },
    { value: 'approved', label: t('certificate.approved') },
    { value: 'rejected', label: t('admin.certificatesPage.reject') },
  ];

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
  const [editingCert, setEditingCert] = useState(null);
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

  // 文件上传状态
  const [uploadingCertId, setUploadingCertId] = useState(null);

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
      const sortMapping = {
        'issue-desc': { sortBy: 'issue_date', sortOrder: 'DESC' },
        'issue-asc': { sortBy: 'issue_date', sortOrder: 'ASC' },
        'expiry-asc': { sortBy: 'expiry_date', sortOrder: 'ASC' },
        'expiry-desc': { sortBy: 'expiry_date', sortOrder: 'DESC' },
      };
      const sort = sortMapping[sortOrder] || { sortBy: 'created_at', sortOrder: 'DESC' };

      const params = {
        page,
        pageSize: PAGE_SIZE,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        ...sort,
        reviewStatus: reviewStatusFilter || undefined,
      };

      // 普通用户默认只看自己上传的证书
      if (!isAdmin) {
        params.myUploads = 'true';
      }

      const result = await api.getCertificates(params);
      setCertificates(result.data || []);
      setTotal(result.pagination?.total ?? (result.data || []).length);
    } catch (err) {
      console.error('获取证书列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, categoryFilter, sortOrder, reviewStatusFilter, isAdmin]);

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

    if (!formData.certNo.trim() || !formData.productName.trim()) {
      setFormError(t('admin.certificatesPage.requiredField'));
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
      fetchCertificates();
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
      fetchCertificates();
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
      fetchCertificates();
    } catch (err) {
      console.error('审核失败:', err);
    } finally {
      setReviewLoading(false);
    }
  };

  // 文件上传处理
  const handleFileUpload = async (certId, file) => {
    setUploadingCertId(certId);
    try {
      await api.uploadCertificateFile(certId, file);
      // 上传成功后刷新证书列表
      await fetchCertificates();
      return { success: true };
    } catch (err) {
      console.error('文件上传失败:', err);
      throw new Error(t('upload.uploadFailed'));
    } finally {
      setUploadingCertId(null);
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
      pending: { label: t('certificate.pending'), color: '#facc15', bg: 'rgba(234, 179, 8, 0.1)' },
      approved: { label: t('certificate.approved'), color: '#4ade80', bg: 'rgba(34, 197, 94, 0.1)' },
      rejected: { label: t('admin.certificatesPage.reject'), color: '#f87171', bg: 'rgba(239, 68, 68, 0.1)' },
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
        <h1 className={styles.pageTitle}>
          {isAdmin ? t('admin.certificatesPage.title') : t('admin.certificatesPage.myUploads')}
        </h1>
        <button className={styles.addBtn} onClick={handleAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('admin.certificatesPage.addNew')}
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
            placeholder={t('admin.certificatesPage.search')}
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
            placeholder={t('admin.certificatesPage.allCategories')}
            value={categoryFilter}
            onChange={(e) => handleFilterChange(setCategoryFilter, e.target.value)}
          />

          <select
            className={styles.filterSelect}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="issue-desc">{t('admin.certificatesPage.sortByIssueDesc')}</option>
            <option value="issue-asc">{t('admin.certificatesPage.sortByIssueAsc')}</option>
            <option value="expiry-asc">{t('admin.certificatesPage.sortByExpiryAsc')}</option>
            <option value="expiry-desc">{t('admin.certificatesPage.sortByExpiryDesc')}</option>
          </select>
        </div>
      </div>

      {/* 表格 */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('admin.certificatesPage.certNo')}</th>
              <th>{t('admin.certificatesPage.productName')}</th>
              <th>{t('admin.certificatesPage.company')}</th>
              <th>{t('admin.certificatesPage.status')}</th>
              {isAdmin && <th>{t('admin.certificatesPage.reviewStatus')}</th>}
              <th>{t('admin.certificatesPage.expiryDate')}</th>
              <th>{t('admin.certificatesPage.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className={styles.emptyCell}>{t('admin.certificatesPage.loading')}</td>
              </tr>
            ) : certificates.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className={styles.emptyCell}>{t('admin.certificatesPage.noResults')}</td>
              </tr>
            ) : (
              certificates.map((cert) => (
                <tr key={cert.id}>
                  <td data-label={t('admin.certificatesPage.certNo')} className={styles.certNo}>{cert.certNo}</td>
                  <td data-label={t('admin.certificatesPage.productName')}>{cert.productName}</td>
                  <td data-label={t('admin.certificatesPage.company')} className={styles.companyCell}>{cert.companyName}</td>
                  <td data-label={t('admin.certificatesPage.status')}><StatusBadge status={cert.status} /></td>
                  {isAdmin && <td data-label={t('admin.certificatesPage.reviewStatus')}>{renderReviewBadge(cert.reviewStatus)}</td>}
                  <td data-label={t('admin.certificatesPage.expiryDate')} className={styles.dateCell}>{cert.expiryDate ? cert.expiryDate.split('T')[0] : '-'}</td>
                  <td data-label={t('admin.certificatesPage.actions')} className={styles.actionCell}>
                    <div className={styles.actions}>
                      <button className={styles.editBtn} onClick={() => handleEdit(cert)}>{t('admin.certificatesPage.edit')}</button>
                      <button className={styles.deleteBtn} onClick={() => setDeleteTarget(cert)}>{t('admin.certificatesPage.delete')}</button>
                      {isAdmin && cert.reviewStatus === 'pending' && (
                        <>
                          <button className={styles.approveBtn} onClick={() => handleOpenReview(cert, 'approved')}>{t('admin.certificatesPage.approve')}</button>
                          <button className={styles.rejectBtn} onClick={() => handleOpenReview(cert, 'rejected')}>{t('admin.certificatesPage.reject')}</button>
                        </>
                      )}
                    </div>
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
            {t('admin.certificatesPage.prevPage')}
          </button>
          <span className={styles.pageInfo}>{page} / {totalPages}</span>
          <button
            className={styles.pageBtn}
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t('admin.certificatesPage.nextPage')}
          </button>
        </div>
      )}

      {/* 新增/编辑模态框 */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingCert ? t('admin.certificatesPage.editTitle') : t('admin.certificatesPage.addTitle')}</h2>
              <button className={styles.closeBtn} onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>{t('admin.certificatesPage.formCertNo')} *</label>
                  <input type="text" value={formData.certNo} onChange={(e) => updateFormField('certNo', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>{t('admin.certificatesPage.formProductName')} *</label>
                  <input type="text" value={formData.productName} onChange={(e) => updateFormField('productName', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>{t('admin.certificatesPage.formModel')}</label>
                  <input type="text" value={formData.model} onChange={(e) => updateFormField('model', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>{t('admin.certificatesPage.formCompany')}</label>
                  <input type="text" value={formData.companyName} onChange={(e) => updateFormField('companyName', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>{t('admin.certificatesPage.formCategory')}</label>
                  <input type="text" value={formData.category} onChange={(e) => updateFormField('category', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>{t('admin.certificatesPage.formStandard')}</label>
                  <input type="text" value={formData.standard} onChange={(e) => updateFormField('standard', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>{t('admin.certificatesPage.formIssuer')}</label>
                  <input type="text" value={formData.issuer} onChange={(e) => updateFormField('issuer', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>{t('admin.certificatesPage.formStatus')}</label>
                  <select value={formData.status} onChange={(e) => updateFormField('status', e.target.value)}>
                    <option value="active">{t('search.status.active')}</option>
                    <option value="expired">{t('search.status.expired')}</option>
                    <option value="revoked">{t('search.status.revoked')}</option>
                  </select>
                </div>
                <div className={styles.formField}>
                  <label>{t('admin.certificatesPage.formIssueDate')}</label>
                  <input type="date" value={formData.issueDate} onChange={(e) => updateFormField('issueDate', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>{t('admin.certificatesPage.formExpiryDate')}</label>
                  <input type="date" value={formData.expiryDate} onChange={(e) => updateFormField('expiryDate', e.target.value)} />
                </div>
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label>{t('admin.certificatesPage.formDescription')}</label>
                  <textarea value={formData.description} onChange={(e) => updateFormField('description', e.target.value)} rows={3} />
                </div>

                {/* 文件上传区域 */}
                {editingCert && (
                  <div className={`${styles.formField} ${styles.fullWidth}`}>
                    <label>{t('admin.certificatesPage.certFile')}</label>
                    <FileUpload
                      accept=".pdf"
                      maxSize={20 * 1024 * 1024}
                      onUpload={(file) => handleFileUpload(editingCert.id, file)}
                      existingFile={editingCert.fileUrl ? { url: editingCert.fileUrl, type: 'pdf' } : null}
                    />
                  </div>
                )}
              </div>

              {formError && <div className={styles.formError}>{formError}</div>}

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
                <button type="submit" className={styles.submitBtn} disabled={formLoading}>
                  {formLoading ? t('common.loading') : t('common.save')}
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
            <h3>{t('admin.certificatesPage.deleteConfirmTitle')}</h3>
            <p>{t('admin.certificatesPage.deleteConfirmText')} <strong>{deleteTarget.certNo}</strong>?</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</button>
              <button className={styles.dangerBtn} onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? t('admin.certificatesPage.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 审核模态框 */}
      {reviewTarget && (
        <div className={styles.modalOverlay} onClick={() => setReviewTarget(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3>{t('admin.certificatesPage.reviewTitle')}</h3>
            <p>
              {t('admin.certificatesPage.certNo')}: <strong>{reviewTarget.certNo}</strong>
              <br />
              {t('admin.certificatesPage.productName')}: <strong>{reviewTarget.productName}</strong>
            </p>
            <div className={styles.reviewRemarkField}>
              <label>{t('admin.certificatesPage.reviewRemark')}</label>
              <textarea
                value={reviewRemark}
                onChange={(e) => setReviewRemark(e.target.value)}
                rows={3}
              />
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setReviewTarget(null)}>{t('common.cancel')}</button>
              <button
                className={reviewStatus === 'approved' ? styles.approveBtnFull : styles.dangerBtn}
                onClick={handleReview}
                disabled={reviewLoading}
              >
                {reviewLoading ? t('admin.certificatesPage.reviewing') : (reviewStatus === 'approved' ? t('admin.certificatesPage.reviewApprove') : t('admin.certificatesPage.reviewReject'))}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
