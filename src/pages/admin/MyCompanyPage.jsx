/**
 * EU-DOC 后台管理 - 我的企业页面
 */

import { useState, useEffect } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import styles from './UploadPage.module.css';

export default function MyCompanyPage() {
  const { admin } = useAdmin();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    website: '',
  });

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      // 获取用户的企业列表
      const res = await fetch('/eu-doc/api/v2/company-members?company_id=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success && data.data.length > 0) {
        // 获取企业详情
        const companyId = data.data[0].company_id || 1;
        const companyRes = await fetch(`/eu-doc/api/companies/${companyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const companyData = await companyRes.json();
        
        if (companyData.success) {
          setCompany(companyData.data);
          setFormData({
            name: companyData.data.name || '',
            name_en: companyData.data.name_en || '',
            contact_person: companyData.data.contact_person || '',
            contact_email: companyData.data.contact_email || '',
            contact_phone: companyData.data.contact_phone || '',
            address: companyData.data.address || '',
            website: companyData.data.website || '',
          });
        }
      } else {
        // 如果没有企业，显示创建提示
        setCompany(null);
      }
    } catch (err) {
      console.error('获取企业信息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateCompany = async () => {
    if (!formData.name) {
      setError('企业名称为必填项');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/eu-doc/api/v2/company-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('企业创建成功');
        fetchCompany();
      } else {
        setError(data.message || '创建失败');
      }
    } catch (err) {
      console.error('创建企业失败:', err);
      setError('创建失败');
    }
  };

  const handleUpdateCompany = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/eu-doc/api/companies/${company.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('企业信息更新成功');
        setEditing(false);
        fetchCompany();
      } else {
        setError(data.message || '更新失败');
      }
    } catch (err) {
      console.error('更新企业失败:', err);
      setError('更新失败');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>加载中...</div>;
  }

  // 如果没有企业，显示创建表单
  if (!company) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>创建企业</h1>
          <p className={styles.subtitle}>您还没有企业，请先创建一个</p>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}
        {success && <div className={styles.successBox}>{success}</div>}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>企业信息</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>企业名称 *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="输入企业名称"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>英文名称</label>
              <input
                type="text"
                name="name_en"
                value={formData.name_en}
                onChange={handleInputChange}
                placeholder="英文名称（可选）"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>联系人</label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleInputChange}
                placeholder="联系人姓名"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>联系邮箱</label>
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleInputChange}
                placeholder="contact@company.com"
                className={styles.input}
              />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button onClick={handleCreateCompany} className={styles.submitBtn}>
            创建企业
          </button>
        </div>
      </div>
    );
  }

  // 显示企业信息
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>我的企业</h1>
        <p className={styles.subtitle}>管理企业信息</p>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}
      {success && <div className={styles.successBox}>{success}</div>}

      <div className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>企业信息</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className={styles.editBtn}>
              编辑
            </button>
          )}
        </div>

        {editing ? (
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>企业名称 *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>英文名称</label>
              <input
                type="text"
                name="name_en"
                value={formData.name_en}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>联系人</label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>联系邮箱</label>
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>联系电话</label>
              <input
                type="text"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>网站</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.label}>地址</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ minWidth: '100px', color: 'var(--text-secondary)' }}>企业名称</span>
              <span>{company.name}</span>
            </div>
            {company.name_en && (
              <div style={{ display: 'flex', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ minWidth: '100px', color: 'var(--text-secondary)' }}>英文名称</span>
                <span>{company.name_en}</span>
              </div>
            )}
            {company.contact_person && (
              <div style={{ display: 'flex', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ minWidth: '100px', color: 'var(--text-secondary)' }}>联系人</span>
                <span>{company.contact_person}</span>
              </div>
            )}
            {company.contact_email && (
              <div style={{ display: 'flex', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ minWidth: '100px', color: 'var(--text-secondary)' }}>联系邮箱</span>
                <span>{company.contact_email}</span>
              </div>
            )}
            <div style={{ display: 'flex', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ minWidth: '100px', color: 'var(--text-secondary)' }}>产品数量</span>
              <span>{company.certificates?.length || 0}</span>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <div className={styles.actions}>
          <button onClick={() => setEditing(false)} className={styles.cancelBtn}>
            取消
          </button>
          <button onClick={handleUpdateCompany} className={styles.submitBtn}>
            保存修改
          </button>
        </div>
      )}
    </div>
  );
}
