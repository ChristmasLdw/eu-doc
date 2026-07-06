/**
 * EU-DOC 后台管理 - 文档上传页面
 * 给指定产品上传证书、DoC、说明书等文档
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import styles from './UploadPage.module.css';

export default function DocumentUploadPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [product, setProduct] = useState(null);
  const [file, setFile] = useState(null);

  const [formData, setFormData] = useState({
    documentType: 'certificate',
    title: '',
    language: 'en',
    certNo: '',
    standard: '',
    issuer: '',
    issueDate: '',
    expiryDate: '',
  });

  const [confirmations, setConfirmations] = useState({
    confirmedAuthentic: false,
    confirmedAuthorized: false,
    acceptedDisclaimer: false,
  });

  useEffect(() => {
    if (productId) fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/eu-doc/api/v2/products/${productId}`);
      const data = await res.json();
      if (data.success) {
        setProduct(data.data);
        setFormData(prev => ({ ...prev, title: data.data.name }));
      }
    } catch (err) {
      console.error('获取产品详情失败:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('文件大小不能超过10MB');
        return;
      }
      setFile(selectedFile);
      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: selectedFile.name.replace(/\.[^/.]+$/, '') }));
      }
      setError('');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('请选择要上传的文件');
      return;
    }
    if (!formData.title) {
      setError('请填写文档标题');
      return;
    }
    if (!confirmations.confirmedAuthentic || !confirmations.confirmedAuthorized || !confirmations.acceptedDisclaimer) {
      setError('请确认所有声明事项后再上传');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('file', file);
      submitData.append('productId', productId);
      Object.keys(formData).forEach(key => {
        if (formData[key]) submitData.append(key, formData[key]);
      });
      // 添加确认标记
      submitData.append('confirmedAuthentic', confirmations.confirmedAuthentic ? '1' : '');
      submitData.append('confirmedAuthorized', confirmations.confirmedAuthorized ? '1' : '');
      submitData.append('acceptedDisclaimer', confirmations.acceptedDisclaimer ? '1' : '');

      const token = localStorage.getItem('admin_token');
      const res = await fetch('/eu-doc/api/v2/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: submitData
      });

      const result = await res.json();

      if (result.success) {
        alert('文档上传成功！');
        navigate('/admin/products');
      } else {
        setError(result.message || '上传失败');
      }
    } catch (err) {
      console.error('上传文档错误:', err);
      setError('上传失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>上传文档</h1>
        <p className={styles.subtitle}>
          {product ? `为产品 "${product.name}" 上传文档` : '上传文档'}
        </p>
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
        {/* 文件上传 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>1. 选择文件</h2>
          <div className={styles.uploadArea}>
            <input
              type="file"
              id="fileUpload"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
              onChange={handleFileChange}
              className={styles.fileInput}
            />
            <label htmlFor="fileUpload" className={styles.uploadLabel}>
              {file ? (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileSize}>{(file.size / 1024).toFixed(2)} KB</span>
                  <span className={styles.changeFile}>点击更换文件</span>
                </>
              ) : (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className={styles.uploadText}>点击上传资料</span>
                  <span className={styles.uploadHint}>支持 PDF、PNG、JPG、WebP、Word，最大10MB</span>
                  <span className={styles.uploadHint}>仅上传适合对外展示的产品资料，不要上传商业敏感内容</span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* 文档信息 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>2. 填写文档信息</h2>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                文档类型 <span className={styles.required}>*</span>
              </label>
              <select
                name="documentType"
                value={formData.documentType}
                onChange={handleInputChange}
                className={styles.input}
              >
                <option value="certificate">证书</option>
                <option value="declaration_of_conformity">DoC 声明</option>
                <option value="manual">说明书</option>
                <option value="test_report">检测报告</option>
                <option value="other">其他</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                文档标题 <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="文档标题"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>语言</label>
              <select
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                className={styles.input}
              >
                <option value="en">英文</option>
                <option value="zh">中文</option>
                <option value="de">德文</option>
                <option value="fr">法文</option>
              </select>
            </div>

            {formData.documentType === 'certificate' && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>证书编号</label>
                  <input
                    type="text"
                    name="certNo"
                    value={formData.certNo}
                    onChange={handleInputChange}
                    placeholder="例如：20_100_52_6160"
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
                    name="issueDate"
                    value={formData.issueDate}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>有效期至</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* 上传确认 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>3. 上传确认</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={confirmations.confirmedAuthentic}
                onChange={(e) => setConfirmations(prev => ({ ...prev, confirmedAuthentic: e.target.checked }))}
                style={{ marginTop: '4px' }}
              />
              <span>我确认此文档真实有效</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={confirmations.confirmedAuthorized}
                onChange={(e) => setConfirmations(prev => ({ ...prev, confirmedAuthorized: e.target.checked }))}
                style={{ marginTop: '4px' }}
              />
              <span>我确认本人有权代表该企业上传此文档</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={confirmations.acceptedDisclaimer}
                onChange={(e) => setConfirmations(prev => ({ ...prev, acceptedDisclaimer: e.target.checked }))}
                style={{ marginTop: '4px' }}
              />
              <span>
                我已阅读并同意
                <Link to="/disclaimer" target="_blank" style={{ color: '#667eea', margin: '0 4px' }}>免责声明</Link>
                和
                <Link to="/upload-commitment" target="_blank" style={{ color: '#667eea', margin: '0 4px' }}>上传承诺书</Link>
                ，理解虚假资料由上传方承担全部法律责任
              </span>
            </label>
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
            {loading ? '上传中...' : '上传文档'}
          </button>
        </div>
      </form>
    </div>
  );
}
