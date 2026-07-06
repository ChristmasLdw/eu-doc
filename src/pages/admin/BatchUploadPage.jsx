/**
 * EU-DOC 后台管理 - 批量上传页面
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UploadPage.module.css';

export default function BatchUploadPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/eu-doc/api/v2/products?pageSize=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch (err) {
      console.error('获取产品列表失败:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`文件 ${file.name} 超过10MB限制`);
        return false;
      }
      return true;
    });
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!selectedProduct) {
      setError('请选择产品');
      return;
    }
    if (files.length === 0) {
      setError('请选择文件');
      return;
    }

    setUploading(true);
    setError('');
    setResults([]);

    const token = localStorage.getItem('admin_token');
    const uploadResults = [];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('productId', selectedProduct);
        formData.append('documentType', 'certificate');
        formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
        formData.append('language', 'en');
        formData.append('confirmedAuthentic', '1');
        formData.append('confirmedAuthorized', '1');
        formData.append('acceptedDisclaimer', '1');

        const res = await fetch('/eu-doc/api/v2/documents', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        const result = await res.json();
        uploadResults.push({
          file: file.name,
          success: result.success,
          message: result.success ? '上传成功' : result.message
        });
      } catch (err) {
        uploadResults.push({
          file: file.name,
          success: false,
          message: '上传失败'
        });
      }
    }

    setResults(uploadResults);
    setUploading(false);

    // 清空已上传的文件
    if (uploadResults.every(r => r.success)) {
      setFiles([]);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>批量上传</h1>
        <p className={styles.subtitle}>选择产品后批量上传多个文档</p>
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

      {/* 选择产品 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>1. 选择产品</h2>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className={styles.input}
        >
          <option value="">请选择产品</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* 选择文件 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>2. 选择文件</h2>
        <div className={styles.uploadArea}>
          <input
            type="file"
            id="batchUpload"
            multiple
            onChange={handleFileChange}
            className={styles.fileInput}
          />
          <label htmlFor="batchUpload" className={styles.uploadLabel}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className={styles.uploadText}>点击选择多份资料</span>
            <span className={styles.uploadHint}>支持 PDF、JPG、PNG 格式，单文件最大10MB</span>
            <span className={styles.uploadHint}>仅上传适合对外展示的产品资料，不要上传图纸、报价、供应商等商业敏感内容</span>
          </label>
        </div>

        {/* 文件列表 */}
        {files.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              已选择 {files.length} 份资料
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {files.map((file, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f87171',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 上传按钮 */}
      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => navigate('/admin/products')}
          className={styles.cancelBtn}
          disabled={uploading}
        >
          取消
        </button>
        <button
          onClick={handleUpload}
          className={styles.submitBtn}
          disabled={uploading || files.length === 0}
        >
          {uploading ? '上传中...' : `上传 ${files.length} 份资料`}
        </button>
      </div>

      {/* 上传结果 */}
      {results.length > 0 && (
        <div className={styles.section} style={{ marginTop: '24px' }}>
          <h2 className={styles.sectionTitle}>上传结果</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {results.map((result, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                background: result.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <span style={{ color: result.success ? '#4ade80' : '#f87171' }}>
                  {result.success ? '✓' : '✗'}
                </span>
                <span style={{ flex: 1, fontSize: '14px' }}>{result.file}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{result.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
