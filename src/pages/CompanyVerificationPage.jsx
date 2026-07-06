/**
 * EU-DOC 前台 - 企业认证申请页面
 * 用户提交企业认证资料
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import styles from './CompanyVerificationPage.module.css';

export default function CompanyVerificationPage() {
  const navigate = useNavigate();
  const { admin } = useAdmin();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [myCompanies, setMyCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [files, setFiles] = useState({
    businessLicense: null,
    authorizationLetter: null,
  });

  useEffect(() => {
    if (!admin) {
      navigate('/admin/login');
      return;
    }
    fetchMyCompanies();
  }, [admin]);

  const fetchMyCompanies = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/eu-doc/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.user.companies) {
        setMyCompanies(data.user.companies);
      }
    } catch (err) {
      console.error('获取企业列表失败:', err);
    }
  };

  const handleFileChange = (field, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('文件大小不能超过5MB');
        return;
      }
      setFiles(prev => ({ ...prev, [field]: file }));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedCompany) {
      setError('请选择要认证的企业');
      return;
    }

    if (!files.businessLicense) {
      setError('请上传营业执照');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('businessLicense', files.businessLicense);
      if (files.authorizationLetter) {
        formData.append('authorizationLetter', files.authorizationLetter);
      }

      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/eu-doc/api/v2/companies/${selectedCompany}/verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert('认证申请提交成功，等待管理员审核');
        navigate('/admin/company');
      } else {
        setError(data.message || '提交失败');
      }
    } catch (err) {
      setError('提交失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>企业认证申请</h1>
        <p className={styles.subtitle}>提交企业认证资料，获得认证标识和更多权益</p>
        <p className={styles.subtitle}>认证通过前，企业页面和产品资料不会自动公开；企业可在后台自行控制资料展示状态。</p>

        <div className={styles.benefits}>
          <h3>认证企业权益</h3>
          <ul>
            <li>✓ 企业认证标识展示</li>
            <li>✓ 产品资料优先审核</li>
            <li>✓ 更多产品和资料上传配额</li>
            <li>✓ 提升企业可信度</li>
          </ul>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>
              选择企业 <span className={styles.required}>*</span>
            </label>
            <select
              className={styles.select}
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              required
            >
              <option value="">请选择要认证的企业</option>
              {myCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              营业执照 <span className={styles.required}>*</span>
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleFileChange('businessLicense', e)}
              className={styles.fileInput}
              required
            />
            {files.businessLicense && (
              <p className={styles.fileName}>已选择: {files.businessLicense.name}</p>
            )}
            <p className={styles.hint}>支持 JPG、PNG、PDF 格式，不超过 5MB</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>授权书（可选）</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleFileChange('authorizationLetter', e)}
              className={styles.fileInput}
            />
            {files.authorizationLetter && (
              <p className={styles.fileName}>已选择: {files.authorizationLetter.name}</p>
            )}
            <p className={styles.hint}>如非企业法人申请，请上传企业授权书</p>
          </div>

          {error && (
            <div className={styles.error}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={styles.cancelBtn}
              disabled={loading}
            >
              取消
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? '提交中...' : '提交认证申请'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
