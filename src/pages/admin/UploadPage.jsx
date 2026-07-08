/**
 * EU-DOC 后台管理 - 证书上传页面
 * 版本: 1.0.0
 *
 * 功能：
 * - 支持PDF文件上传
 * - 手动填写证书信息
 * - 自动生成缩略图
 * - 提交后进入待审核状态
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../../contexts/AdminContext';
import styles from './UploadPage.module.css';

export default function UploadPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { admin } = useAdmin();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const [formData, setFormData] = useState({
    cert_no: '',
    company_name: '',
    product_name: '',
    category: '',
    model: '',
    standard: '',
    issuer: '',
    issue_date: '',
    expiry_date: '',
    source_url: '',
  });

  // 处理文件选择
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('请上传PDF格式的证书文件');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError('文件大小不能超过20MB');
        return;
      }
      setPdfFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  // 处理表单输入
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 验证必填字段
    if (!pdfFile) {
      setError('请上传证书PDF文件');
      return;
    }
    if (!formData.cert_no || !formData.company_name || !formData.product_name) {
      setError('请填写证书编号、企业名称和产品名称');
      return;
    }

    setLoading(true);

    try {
      // 创建FormData
      const data = new FormData();
      data.append('pdf', pdfFile);
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          data.append(key, formData[key]);
        }
      });

      // 提交到后端
      const response = await fetch('/eu-doc/api/certificates/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: data
      });

      const result = await response.json();

      if (result.success) {
        alert('证书上传成功！等待管理员审核');
        navigate('/admin/certificates');
      } else {
        setError(result.message || '上传失败');
      }
    } catch (err) {
      console.error('上传错误:', err);
      setError('上传失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>上传证书</h1>
        <p className={styles.subtitle}>上传CE认证证书，填写相关信息后提交审核</p>
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
        {/* PDF上传区域 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>1. 上传证书PDF</h2>
          <div className={styles.uploadArea}>
            <input
              type="file"
              id="pdfUpload"
              accept=".pdf"
              onChange={handleFileChange}
              className={styles.fileInput}
            />
            <label htmlFor="pdfUpload" className={styles.uploadLabel}>
              {pdfFile ? (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className={styles.fileName}>{pdfFile.name}</span>
                  <span className={styles.fileSize}>{(pdfFile.size / 1024).toFixed(2)} KB</span>
                  <span className={styles.changeFile}>点击更换文件</span>
                </>
              ) : (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className={styles.uploadText}>点击上传PDF证书文件</span>
                  <span className={styles.uploadHint}>支持PDF格式，最大20MB</span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* 证书基本信息 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>2. 填写证书信息</h2>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                证书编号 <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="cert_no"
                value={formData.cert_no}
                onChange={handleInputChange}
                placeholder="例如：20_100_52_6150"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                企业名称 <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleInputChange}
                placeholder="例如：Shaoxing RIF Sports Goods Co., Ltd"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                产品名称 <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="product_name"
                value={formData.product_name}
                onChange={handleInputChange}
                placeholder="例如：Equestrian Helmet"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>产品类别</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="例如：马术头盔"
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
                placeholder="例如：F40-409A"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>认证标准</label>
              <input
                type="text"
                name="standard"
                value={formData.standard}
                onChange={handleInputChange}
                placeholder="例如：CE EN 1384"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>发证机构</label>
              <input
                type="text"
                name="issuer"
                value={formData.issuer}
                onChange={handleInputChange}
                placeholder="例如：SGS"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>签发日期</label>
              <input
                type="date"
                name="issue_date"
                value={formData.issue_date}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>有效期至</label>
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>来源链接</label>
              <input
                type="url"
                name="source_url"
                value={formData.source_url}
                onChange={handleInputChange}
                placeholder="例如：http://www.eu-doc.com/0200020"
                className={styles.input}
              />
            </div>
          </div>
        </div>

        {/* 提交按钮 */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => navigate('/admin/certificates')}
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
            {loading ? '上传中...' : '提交审核'}
          </button>
        </div>
      </form>
    </div>
  );
}
