import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ShareModal from '../components/ShareModal';
import * as api from '../services/api';
import { documentTypeLabel, formatPublicDate, isEnglishLanguage, localizedField, publicStatusLabel } from '../utils/languageContent';
import styles from './DocumentDetailPage.module.css';

function normalizeDocType(doc = {}) {
  const type = doc.document_type || doc.documentType || 'other';
  if (type === 'declaration') return 'declaration_of_conformity';
  if (type === 'report') return 'test_report';
  return type;
}

function getFileUrl(doc = {}) {
  const item = doc || {};
  const path = item.file_path || item.filePath || '';
  if (!path) return '';
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  if (path.startsWith('/eu-doc/')) return path;
  if (path.startsWith('/documents/')) return `/eu-doc/uploads${path}`;
  return `/eu-doc${path}`;
}

function getThumbUrl(doc = {}) {
  const item = doc || {};
  const path = item.thumbnail_path || item.thumbnailPath || '';
  if (!path) return '';
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  if (path.startsWith('/eu-doc/')) return path;
  if (path.startsWith('/documents/')) return `/eu-doc/uploads${path}`;
  return `/eu-doc${path}`;
}

function isImage(url = '') {
  const clean = String(url).split('?')[0].toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].some((ext) => clean.endsWith(ext));
}

function isPdf(url = '') {
  return String(url).split('?')[0].toLowerCase().endsWith('.pdf');
}

function formatDate(value, language) {
  return formatPublicDate(value, language);
}


function documentCode(doc = {}) {
  const item = doc || {};
  const meta = item.certificate_metadata || item.certificateMetadata || {};
  return meta.cert_no || item.cert_no || item.certNo || item.document_no || item.documentNo || item.version || item.file_no || item.fileNo || `EU-D-${String(item.id || '').padStart(6, '0')}`;
}

function formatSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) return null;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEn = isEnglishLanguage(i18n.language);
  const ui = {
    back: isEn ? 'Back' : '返回',
    loading: isEn ? 'Loading document details...' : '正在加载资料详情...',
    notFound: isEn ? 'Document not found' : '资料不存在',
    loadFailed: isEn ? 'Failed to load document' : '加载资料失败',
    directPage: isEn ? 'This is a direct page for one public product document, suitable for review, sharing, verification, and download. Return to the product page for the full document set.' : '这是单份产品资料的直达页面，适合审核、分享、验证和下载。产品完整资料请返回产品详情页查看。',
    openFile: isEn ? 'Open original file' : '打开原文件',
    favorited: isEn ? '★ Favorited' : '★ 已收藏',
    favorite: isEn ? '☆ Favorite' : '☆ 收藏',
    share: isEn ? 'Share document' : '分享资料',
    switchTitle: isEn ? ' switch' : '切换',
    otherCertificates: isEn ? 'Other certificates for the same product' : '同一产品的其他证书类型',
    otherLanguages: isEn ? 'Other language versions of the same document type' : '同一资料的其他语言版本',
    current: isEn ? 'Current' : '当前',
    switch: isEn ? 'Switch' : '切换',
    info: isEn ? 'Document information' : '资料信息',
    certInfo: isEn ? 'Certificate information' : '证书信息',
    related: isEn ? 'Related links' : '关联入口',
    viewProduct: isEn ? 'View product details' : '查看产品详情',
    viewCompany: isEn ? 'View company details' : '查看公司详情',
    preview: isEn ? 'Document preview' : '资料预览',
    previewFallback: isEn ? 'This format cannot be previewed inline. Open the original file to view it.' : '该格式暂不支持内嵌预览，可打开原文件查看。',
    noFile: isEn ? 'No file' : '暂无资料',
    noFileDesc: isEn ? 'This document record exists, but no accessible file is attached.' : '该资料记录存在，但没有可访问的资料本体。',
    shareTypeSuffix: isEn ? ' share' : '分享',
    shareSubtitle: isEn ? 'View the public document details for this product.' : '查看公开资料详情。',
    noRecord: isEn ? 'Not recorded' : '未记录',
  };
  const [documentData, setDocumentData] = useState(null);
  const [relatedDocs, setRelatedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDocument() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/eu-doc/api/v2/documents/${id}`).then((res) => res.json());
        if (!response.success) throw new Error(response.message || ui.notFound);
        if (cancelled) return;
        setDocumentData(response.data);

        const productId = response.data?.product_id || response.data?.productId;
        if (productId) {
          const docsResponse = await fetch(`/eu-doc/api/v2/products/${productId}/documents`).then((res) => res.json());
          if (!cancelled && docsResponse.success) setRelatedDocs(docsResponse.data || []);
        } else {
          setRelatedDocs([]);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || ui.loadFailed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDocument();
    return () => { cancelled = true; };
  }, [id, ui.notFound, ui.loadFailed]);

  const fileUrl = useMemo(() => getFileUrl(documentData), [documentData]);
  const thumbUrl = useMemo(() => getThumbUrl(documentData), [documentData]);
  const certMeta = documentData?.certificate_metadata || documentData?.certificateMetadata || {};
  const typeLabel = documentTypeLabel(documentData || {}, i18n.language);
  const title = localizedField(documentData || {}, 'title', i18n.language) || certMeta?.cert_no || documentData?.cert_no || `${typeLabel} ${id}`;
  const currentDocType = normalizeDocType(documentData || {});
  const documentPublicStatus = publicStatusLabel(documentData, 'document', i18n.language);

  const groupedDocs = useMemo(() => {
    const groups = {};
    relatedDocs.forEach((doc) => {
      const type = normalizeDocType(doc);
      if (!groups[type]) groups[type] = [];
      groups[type].push(doc);
    });
    return groups;
  }, [relatedDocs]);

  const sameTypeDocs = groupedDocs[currentDocType] || [];

  const switchLabel = (doc) => {
    const metaNo = doc.cert_no || doc.certNo || doc.certificate_metadata?.cert_no;
    const lang = doc.language ? String(doc.language).toUpperCase() : '';
    if (normalizeDocType(doc) === 'certificate') return metaNo || localizedField(doc, 'title', i18n.language) || `${documentTypeLabel(doc, i18n.language, 'short')} #${doc.id}`;
    return [lang, localizedField(doc, 'title', i18n.language) || `${isEn ? 'Document' : '资料'} #${doc.id}`].filter(Boolean).join(' · ');
  };


  useEffect(() => {
    if (!documentData) return;
    const numericId = parseInt(id, 10);
    const companyName = documentData.company_name || documentData.companyName || '';
    api.checkFavorite('文件', numericId)
      .then((result) => {
        setIsFavorited(Boolean(result?.isFavorited));
        setFavoriteId(result?.favoriteId || null);
      })
      .catch(() => {});
    api.recordHistory('文件', numericId, title, companyName, isEn ? 'View document' : '查看资料').catch(() => {});
  }, [documentData, id, title, isEn]);

  const handleFavorite = async () => {
    if (!documentData) return;
    try {
      if (isFavorited && favoriteId) {
        await api.deleteFavorite(favoriteId);
        setIsFavorited(false);
        setFavoriteId(null);
      } else {
        const result = await api.addFavorite(
          '文件',
          parseInt(id, 10),
          title,
          typeLabel,
          [documentData.product_name || documentData.productName, documentData.company_name || documentData.companyName].filter(Boolean).join(' · ')
        );
        setIsFavorited(true);
        if (result?.id) setFavoriteId(result.id);
      }
    } catch (err) {
      alert(err.message || '收藏操作失败');
    }
  };

  const copyLink = () => {
    setShareOpen(true);
  };

  if (loading) {
    return <div className={styles.statePage}><div className={styles.spinner} /><p>{ui.loading}</p></div>;
  }

  if (error || !documentData) {
    return (
      <div className={styles.statePage}>
        <p>{error || '资料不存在'}</p>
        <button onClick={() => navigate(-1)}>{ui.back}</button>
      </div>
    );
  }

  const productName = localizedField({ name: documentData.product_name || documentData.productName, name_en: documentData.product_name_en || documentData.productNameEn }, 'name', i18n.language);
  const companyName = localizedField({ name: documentData.company_name || documentData.companyName, name_en: documentData.company_name_en || documentData.companyNameEn }, 'name', i18n.language);
  const facts = [
    { label: isEn ? 'Document type' : '资料类型', value: typeLabel },
    { label: isEn ? 'Product' : '所属产品', value: productName },
    { label: isEn ? 'Applicable model' : '适用型号', value: documentData.product_model || documentData.productModel },
    { label: isEn ? 'Company' : '所属公司', value: companyName },
    { label: isEn ? 'Language' : '语言', value: documentData.language ? String(documentData.language).toUpperCase() : ui.noRecord },
    { label: isEn ? 'File size' : '文件大小', value: formatSize(documentData.file_size || documentData.fileSize) || ui.noRecord },
    { label: isEn ? 'Uploaded' : '上传时间', value: formatDate(documentData.created_at || documentData.createdAt, i18n.language) },
    { label: isEn ? 'Updated' : '更新时间', value: formatDate(documentData.updated_at || documentData.updatedAt, i18n.language) },
    { label: isEn ? 'Public status' : '公开状态', value: documentPublicStatus },
  ];

  const certificateFacts = normalizeDocType(documentData) === 'certificate' ? [
    { label: isEn ? 'Certificate No.' : '证书编号', value: certMeta.cert_no || documentData.cert_no },
    { label: isEn ? 'Standard' : '认证标准', value: certMeta.standard || documentData.standard },
    { label: isEn ? 'Issuer' : '发证机构', value: certMeta.issuer || documentData.issuer },
    { label: isEn ? 'Issue date' : '签发日期', value: formatDate(certMeta.issue_date || documentData.issue_date, i18n.language) },
    { label: isEn ? 'Valid until' : '有效期至', value: formatDate(certMeta.expiry_date || documentData.expiry_date, i18n.language) },
  ].filter((item) => item.value && item.value !== ui.noRecord) : [];

  return (
    <div className={styles.documentDetailPage}>
      <main className={styles.documentShell}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>← {ui.back}</button>

        <section className={styles.documentHero}>
          <div>
            <span className={styles.typeBadge}>{typeLabel}</span>
            <h1>{title}</h1>
            <p>{ui.directPage}</p>
          </div>
          <div className={styles.heroActions}>
            {fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer">{ui.openFile}</a>}
            <button onClick={handleFavorite}>{isFavorited ? ui.favorited : ui.favorite}</button>
            <button onClick={copyLink}>{ui.share}</button>
          </div>
        </section>

        <section className={styles.documentLayout}>
          <aside className={styles.infoPanel}>
            {sameTypeDocs.length > 1 && (
              <div className={`${styles.infoCard} ${styles.switchCard}`}>
                <h2>{typeLabel}{ui.switchTitle}</h2>
                <div className={styles.switchBlock}>
                  <p>{currentDocType === 'certificate' ? ui.otherCertificates : ui.otherLanguages}</p>
                  <div className={styles.switchList}>
                    {sameTypeDocs.map((doc) => (
                      <Link
                        key={doc.id}
                        to={`/documents/${doc.id}`}
                        className={`${styles.switchItem} ${String(doc.id) === String(id) ? styles.switchItemActive : ''}`}
                      >
                        <span>{switchLabel(doc)}</span>
                        <small>{String(doc.id) === String(id) ? ui.current : ui.switch}</small>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className={styles.infoCard}>
              <h2>{ui.info}</h2>
              <div className={styles.factList}>
                {facts.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value || ui.noRecord}</strong></div>)}
              </div>
            </div>

            {certificateFacts.length > 0 && (
              <div className={styles.infoCard}>
                <h2>{ui.certInfo}</h2>
                <div className={styles.factList}>
                  {certificateFacts.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
                </div>
              </div>
            )}

            <div className={styles.infoCard}>
              <h2>{ui.related}</h2>
              <div className={styles.linkList}>
                {documentData.product_id && <Link to={`/products/${documentData.product_id}`}>{ui.viewProduct}</Link>}
                {documentData.company_id && <Link to={`/companies/${documentData.company_id}`}>{ui.viewCompany}</Link>}
              </div>
            </div>
          </aside>

          <div className={styles.previewPanel}>
            {fileUrl ? (
              isImage(fileUrl) ? <img src={fileUrl} alt={title} />
                : isPdf(fileUrl) ? <iframe src={fileUrl} title={title} />
                  : thumbUrl ? <img src={thumbUrl} alt={title} />
                    : <div className={styles.previewFallback}><strong>{ui.preview}</strong><p>{ui.previewFallback}</p></div>
            ) : (
              <div className={styles.previewFallback}><strong>{ui.noFile}</strong><p>{ui.noFileDesc}</p></div>
            )}
          </div>
        </section>
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          typeLabel={`${typeLabel}${ui.shareTypeSuffix}`}
          title={title}
          subtitle={`${ui.shareSubtitle}${productName ? ` ${productName}` : ''}`}
          url={`${window.location.origin}/eu-doc/documents/${id}`}
          meta={[typeLabel, documentData.language ? String(documentData.language).toUpperCase() : '', documentPublicStatus]}
          context={{
            kind: 'document',
            companyName,
            productName,
            documentTitle: title,
            documentType: typeLabel,
            documentCode: documentCode(documentData),
            language: documentData.language,
          }}
        />
      </main>
    </div>
  );
}
