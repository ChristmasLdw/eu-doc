/**
 * EU-DOC 后台管理 - 产品编辑页面
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './UploadPage.module.css';

export default function ProductEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    company_id: '',
    name: '',
    name_en: '',
    model: '',
    description: '',
    description_en: '',
    category_primary_id: '',
    status: 'active',
  });

  useEffect(() => {
    fetchCompanies();
    fetchCategories();
    fetchProduct();
  }, [id]);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/eu-doc/api/companies?pageSize=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setCompanies(data.data);
    } catch (err) {
      console.error('获取企业列表失败:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/eu-doc/api/v2/categories');
      const data = await res.json();
      if (data.success) setCategories(data.data);
    } catch (err) {
      console.error('获取分类列表失败:', err);
    }
  };

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/eu-doc/api/v2/products/${id}`);
      const data = await res.json();
      if (data.success) {
        const p = data.data;
        setFormData({
          company_id: p.company_id || '',
          name: p.name || '',
          name_en: p.name_en || '',
          model: p.model || '',
          description: p.description || '',
          description_en: p.description_en || '',
          category_primary_id: p.category_primary_id || '',
          status: p.status || 'active',
        });
      } else {
        setError('产品不存在');
      }
    } catch (err) {
      console.error('获取产品详情失败:', err);
      setError('加载失败');
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name) {
      setError('请填写产品名称');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/eu-doc/api/v2/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const result = await res.json();

      if (result.success) {
        alert('产品更新成功！');
        navigate(`/admin/products`);
      } else {
        setError(result.message || '更新失败');
      }
    } catch (err) {
      console.error('更新产品错误:', err);
      setError('更新失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>加载中...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>编辑产品</h1>
        <p className={styles.subtitle}>修改产品信息</p>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>产品信息</h2>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                所属企业 <span className={styles.required}>*</span>
              </label>
              <select
                name="company_id"
                value={formData.company_id}
                onChange={handleInputChange}
                className={styles.input}
                required
              >
                <option value="">请选择企业</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                产品名称 <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="例如：Equestrian Helmet F10-102A"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>产品英文名称</label>
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
              <label className={styles.label}>产品型号</label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                placeholder="例如：F10-102A, F10-105A"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>产品分类</label>
              <select
                name="category_primary_id"
                value={formData.category_primary_id}
                onChange={handleInputChange}
                className={styles.input}
              >
                <option value="">请选择分类（可选）</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>状态</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className={styles.input}
              >
                <option value="active">有效</option>
                <option value="inactive">停用</option>
              </select>
            </div>

            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.label}>产品描述（中文）</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="产品中文描述（可选）"
                className={styles.input}
                rows="3"
              />
            </div>

            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.label}>产品描述（英文）</label>
              <textarea
                name="description_en"
                value={formData.description_en}
                onChange={handleInputChange}
                placeholder="Product description in English (optional)"
                className={styles.input}
                rows="3"
              />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className={styles.cancelBtn}
            disabled={loading}
          >
            取消
          </button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? '保存中...' : '保存修改'}
          </button>
        </div>
      </form>
    </div>
  );
}
