/**
 * EU-DOC 后台管理 - 产品创建页面
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UploadPage.module.css';

export default function ProductCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [complianceCategories, setComplianceCategories] = useState([]);

  const [formData, setFormData] = useState({
    companyId: '',
    name: '',
    nameEn: '',
    model: '',
    description: '',
    descriptionEn: '',
    categoryPrimaryId: '',
    complianceCategoryIds: [],
    dimensions: '',
    weight: '',
    material: '',
    usageScenario: '',
    color: '',
    packageContents: '',
    warranty: '',
    originCountry: '',
  });

  useEffect(() => {
    fetchCompanies();
    fetchCategories();
  }, []);

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
      const complianceRes = await fetch('/eu-doc/api/v2/categories?taxonomyType=compliance');
      const complianceData = await complianceRes.json();
      if (complianceData.success) setComplianceCategories(complianceData.data);
    } catch (err) {
      console.error('获取分类列表失败:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleComplianceChange = (e) => {
    const selected = Array.from(e.target.selectedOptions).map((option) => Number(option.value)).filter(Boolean);
    setFormData(prev => ({ ...prev, complianceCategoryIds: selected }));
  };

  const categoryOptions = useMemo(() => {
    const byId = new Map(categories.map((category) => [String(category.id), category]));
    return categories.map((category) => {
      const parent = category.parent_id ? byId.get(String(category.parent_id)) : null;
      const grand = parent?.parent_id ? byId.get(String(parent.parent_id)) : null;
      return {
        ...category,
        path: [grand?.name, parent?.name, category.name].filter(Boolean).join(' / ') || category.name,
      };
    });
  }, [categories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.companyId || !formData.name) {
      setError('请填写企业名称和产品名称');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/eu-doc/api/v2/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const result = await res.json();

      if (result.success) {
        alert('产品创建成功！');
        navigate(`/admin/products`);
      } else {
        setError(result.message || '创建失败');
      }
    } catch (err) {
      console.error('创建产品错误:', err);
      setError('创建失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>创建产品</h1>
        <p className={styles.subtitle}>创建新产品后可以上传证书、DoC、说明书等产品资料</p>
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
                name="companyId"
                value={formData.companyId}
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
                name="nameEn"
                value={formData.nameEn}
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
              <label className={styles.label}>C端产品分类</label>
              <select
                name="categoryPrimaryId"
                value={formData.categoryPrimaryId}
                onChange={handleInputChange}
                className={styles.input}
              >
                <option value="">请选择产品用途分类（可选）</option>
                {categoryOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.path}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>审核/合规分类</label>
              <select
                multiple
                value={formData.complianceCategoryIds.map(String)}
                onChange={handleComplianceChange}
                className={styles.input}
                style={{ minHeight: 120 }}
              >
                {complianceCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>产品尺寸</label>
              <input type="text" name="dimensions" value={formData.dimensions} onChange={handleInputChange} placeholder="例如：280 × 220 × 180 mm" className={styles.input} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>重量</label>
              <input type="text" name="weight" value={formData.weight} onChange={handleInputChange} placeholder="例如：520 g" className={styles.input} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>材质</label>
              <input type="text" name="material" value={formData.material} onChange={handleInputChange} placeholder="例如：ABS 外壳 / EPS 内衬" className={styles.input} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>适用场景</label>
              <input type="text" name="usageScenario" value={formData.usageScenario} onChange={handleInputChange} placeholder="例如：马术训练、骑乘防护" className={styles.input} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>颜色/外观</label>
              <input type="text" name="color" value={formData.color} onChange={handleInputChange} placeholder="例如：黑色、白色、哑光" className={styles.input} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>产地/生产地</label>
              <input type="text" name="originCountry" value={formData.originCountry} onChange={handleInputChange} placeholder="例如：China / EU" className={styles.input} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>保修/服务</label>
              <input type="text" name="warranty" value={formData.warranty} onChange={handleInputChange} placeholder="例如：12个月有限保修" className={styles.input} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>包装内容</label>
              <input type="text" name="packageContents" value={formData.packageContents} onChange={handleInputChange} placeholder="例如：头盔、说明书、收纳袋" className={styles.input} />
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
                name="descriptionEn"
                value={formData.descriptionEn}
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
            onClick={() => navigate('/admin')}
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
            {loading ? '创建中...' : '创建产品'}
          </button>
        </div>
      </form>
    </div>
  );
}
