/**
 * EU-DOC 前台 - 企业认证申请页面
 * 用户提交企业认证资料
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../contexts/AdminContext';
import styles from './CompanyVerificationPage.module.css';

export default function CompanyVerificationPage() {
  const navigate = useNavigate();
  const { admin } = useAdmin();
  const { t } = useTranslation();
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
      console.error(t('companyVerification.fetchCompaniesFailed'), err);
    }
  };

  const handleFileChange = (field, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError(t('companyVerification.fileTooLarge'));
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
      setError(t('companyVerification.companyRequired'));
      return;
    }

    if (!files.businessLicense) {
      setError(t('companyVerification.licenseRequired'));
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
      const response = await fetch(`/eu-doc/api/companies/${selectedCompany}/verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert(t('companyVerification.submitSuccess'));
        navigate('/admin/company');
      } else {
        setError(data.message || t('companyVerification.submitFailed'));
      }
    } catch (err) {
      setError(t('companyVerification.submitRetry'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>{t('companyVerification.title')}</h1>
        <p className={styles.subtitle}>{t('companyVerification.subtitle')}</p>
        <p className={styles.subtitle}>{t('companyVerification.visibilityHint')}</p>

        <div className={styles.benefits}>
          <h3>{t('companyVerification.benefitsTitle')}</h3>
          <ul>
            <li>✓ {t('companyVerification.benefitBadge')}</li>
            <li>✓ {t('companyVerification.benefitReview')}</li>
            <li>✓ {t('companyVerification.benefitQuota')}</li>
            <li>✓ {t('companyVerification.benefitTrust')}</li>
          </ul>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>
              {t('companyVerification.selectCompany')} <span className={styles.required}>*</span>
            </label>
            <select
              className={styles.select}
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              required
            >
              <option value="">{t('companyVerification.selectCompanyPlaceholder')}</option>
              {myCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              {t('companyVerification.businessLicense')} <span className={styles.required}>*</span>
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleFileChange('businessLicense', e)}
              className={styles.fileInput}
              required
            />
            {files.businessLicense && (
              <p className={styles.fileName}>{t('companyVerification.selectedFile', { name: files.businessLicense.name })}</p>
            )}
            <p className={styles.hint}>{t('companyVerification.licenseHint')}</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('companyVerification.authorizationLetter')}</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleFileChange('authorizationLetter', e)}
              className={styles.fileInput}
            />
            {files.authorizationLetter && (
              <p className={styles.fileName}>{t('companyVerification.selectedFile', { name: files.authorizationLetter.name })}</p>
            )}
            <p className={styles.hint}>{t('companyVerification.authorizationHint')}</p>
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
              {t('common.cancel')}
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? t('companyVerification.submitting') : t('companyVerification.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
