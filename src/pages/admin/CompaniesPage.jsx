/**
 * EU-DOC 后台管理 - 企业管理页
 * 版本: 1.0.2
 *
 * 变更记录 (1.0.2):
 * - 添加完整的多语言支持
 *
 * 设计意图:
 * - 企业的 CRUD 管理界面
 * - 列表展示 + 新增/编辑模态框 + 删除确认
 * - 结构与证书管理页保持一致，降低维护成本
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as api from '../../services/api';
import styles from './CompaniesPage.module.css';

// 空的企业表单
const emptyForm = {
  name: '',
  country: '',
  address: '',
  contact: '',
  phone: '',
  email: '',
  website: '',
};

export default function CompaniesPage() {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // 模态框状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 获取企业列表
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCompanies();
      setCompanies(data.data || data.companies || data);
    } catch (err) {
      console.error('获取企业列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // 打开新增模态框
  const handleAdd = () => {
    setEditingCompany(null);
    setFormData(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  // 打开编辑模态框
  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      country: company.country || '',
      address: company.address || '',
      contact: company.contact || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError(t('admin.companiesPage.requiredField'));
      return;
    }

    setFormLoading(true);
    try {
      if (editingCompany) {
        await api.updateCompany(editingCompany.id, formData);
      } else {
        await api.createCompany(formData);
      }
      setModalOpen(false);
      fetchCompanies();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // 删除企业
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteCompany(deleteTarget.id);
      setDeleteTarget(null);
      fetchCompanies();
    } catch (err) {
      console.error('删除失败:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('admin.companiesPage.title')}</h1>
        <button className={styles.addBtn} onClick={handleAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('admin.companiesPage.addNew')}
        </button>
      </div>

      {/* 表格 */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('admin.companiesPage.companyName')}</th>
              <th>{t('admin.companiesPage.country')}</th>
              <th>{t('admin.companiesPage.contact')}</th>
              <th>{t('admin.companiesPage.phone')}</th>
              <th>{t('admin.companiesPage.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className={styles.emptyCell}>{t('admin.companiesPage.loading')}</td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan="5" className={styles.emptyCell}>{t('admin.companiesPage.noResults')}</td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr key={company.id}>
                  <td data-label={t('admin.companiesPage.name')} className={styles.nameCell}>{company.name}</td>
                  <td data-label={t('admin.companiesPage.country')}>{company.country || '-'}</td>
                  <td data-label={t('admin.companiesPage.contact')}>{company.contact || '-'}</td>
                  <td data-label={t('admin.companiesPage.contactInfo')} className={styles.contactCell}>
                    {company.phone || company.email || '-'}
                  </td>
                  <td data-label={t('admin.companiesPage.actions')} className={styles.actionCell}>
                    <button className={styles.editBtn} onClick={() => handleEdit(company)}>{t('admin.companiesPage.edit')}</button>
                    <button className={styles.deleteBtn} onClick={() => setDeleteTarget(company)}>{t('admin.companiesPage.delete')}</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 新增/编辑模态框 */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingCompany ? t('admin.companiesPage.editTitle') : t('admin.companiesPage.addTitle')}</h2>
              <button className={styles.closeBtn} onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label>{t('admin.companiesPage.formName')} *</label>
                  <input type="text" value={formData.name} onChange={(e) => updateFormField('name', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>{t('admin.companiesPage.formCountry')}</label>
                  <input type="text" value={formData.country} onChange={(e) => updateFormField('country', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>{t('admin.companiesPage.formContact')}</label>
                  <input type="text" value={formData.contact} onChange={(e) => updateFormField('contact', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>{t('admin.companiesPage.formPhone')}</label>
                  <input type="text" value={formData.phone} onChange={(e) => updateFormField('phone', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>{t('admin.companiesPage.formEmail')}</label>
                  <input type="email" value={formData.email} onChange={(e) => updateFormField('email', e.target.value)} />
                </div>
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label>{t('admin.companiesPage.formAddress')}</label>
                  <input type="text" value={formData.address} onChange={(e) => updateFormField('address', e.target.value)} />
                </div>
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label>{t('admin.companiesPage.formWebsite')}</label>
                  <input type="url" value={formData.website} onChange={(e) => updateFormField('website', e.target.value)} />
                </div>
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
            <h3>{t('admin.companiesPage.deleteConfirmTitle')}</h3>
            <p>{t('admin.companiesPage.deleteConfirmText')} <strong>{deleteTarget.name}</strong>?</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</button>
              <button className={styles.dangerBtn} onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? t('admin.companiesPage.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
