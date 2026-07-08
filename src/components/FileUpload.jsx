/**
 * EU-DOC 文件上传组件
 * 支持拖拽上传、进度显示、文件预览
 */

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './FileUpload.module.css';

export default function FileUpload({
  accept = '.pdf',
  maxSize = 20 * 1024 * 1024, // 20MB
  onUpload,
  existingFile = null
}) {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(existingFile);
  const fileInputRef = useRef(null);

  // 验证文件
  const validateFile = (file) => {
    setError('');

    // 检查文件类型
    if (accept && !accept.split(',').some(type => {
      const trimmedType = type.trim();
      if (trimmedType === '.pdf') return file.type === 'application/pdf' || file.name.endsWith('.pdf');
      if (trimmedType === '.jpg' || trimmedType === '.jpeg') return file.type === 'image/jpeg';
      if (trimmedType === '.png') return file.type === 'image/png';
      return false;
    })) {
      setError(t('upload.invalidFileType', { accept }));
      return false;
    }

    // 检查文件大小
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      setError(t('upload.fileTooLarge', { maxSize: maxSizeMB }));
      return false;
    }

    return true;
  };

  // 处理文件选择
  const handleFileSelect = async (file) => {
    if (!validateFile(file)) return;

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // 调用上传回调
      const result = await onUpload(file);

      clearInterval(progressInterval);
      setProgress(100);

      // 设置预览
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview({ url: e.target.result, type: 'image' });
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        setPreview({ url: result?.url || URL.createObjectURL(file), type: 'pdf', name: file.name });
      }

      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);

    } catch (err) {
      setError(err.message || t('upload.uploadFailed'));
      setUploading(false);
      setProgress(0);
    }
  };

  // 文件输入变化
  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  // 拖拽事件
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  // 点击上传区域
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // 移除文件
  const handleRemove = () => {
    setPreview(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={styles.container}>
      {!preview ? (
        <div
          className={`${styles.uploadArea} ${dragOver ? styles.dragOver : ''} ${uploading ? styles.uploading : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className={styles.fileInput}
            disabled={uploading}
          />

          {uploading ? (
            <>
              <div className={styles.uploadIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className={styles.uploadText}>{t('upload.uploading')}</p>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              <p className={styles.progressText}>{progress}%</p>
            </>
          ) : (
            <>
              <div className={styles.uploadIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className={styles.uploadText}>
                {t('upload.dragOrClick')}
              </p>
              <p className={styles.uploadHint}>
                {t('upload.supportedFormats', {
                  formats: accept,
                  maxSize: `${(maxSize / (1024 * 1024)).toFixed(1)}MB`
                })}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className={styles.previewArea}>
          {preview.type === 'image' ? (
            <img src={preview.url} alt="Preview" className={styles.previewImage} />
          ) : (
            <div className={styles.pdfPreview}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <p>{preview.name || 'certificate.pdf'}</p>
            </div>
          )}
          <button className={styles.removeBtn} onClick={handleRemove}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {t('upload.remove')}
          </button>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
