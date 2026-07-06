import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ShareModal from '../components/ShareModal';
import * as api from '../services/api';
import { getPublicStatusLabel } from '../utils/publicStatus';
import styles from './DocumentDetailPage.module.css';

const DOCUMENT_TYPE_LABELS = {
  certificate: '资质证书',
  declaration_of_conformity: 'DoC 声明',
  declaration: 'DoC 声明',
  manual: '使用说明书',
  test_report: '检测报告',
  report: '检测报告',
  other: '其他资料',
};

function normalizeDocType(doc = {}) {
  const type = doc.document_type || doc.documentType || 'other';
  if (type === 'declaration') return 'declaration_of_conformity';
  if (type === 'report') return 'test_report';
  return type;
}

function documentTypeLabel(doc = {}) {
  const type = normalizeDocType(doc);
  return DOCUMENT_TYPE_LABELS[type] || DOCUMENT_TYPE_LABELS.other;
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

function formatDate(value) {
  if (!value) return '未记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未记录';
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}


function documentCode(doc = {}) {
  const item = doc || {};
  const meta = item.certificate_metadata || item.certificateMetadata || {};
  return meta.cert_no || item.cert_no || item.certNo || item.document_no || item.documentNo || item.version || item.file_no || item.fileNo || `EU-D-${String(item.id || '').padStart(6, '0')}`;
}

function formatSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) return '未记录';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
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
        if (!response.success) throw new Error(response.message || '资料不存在');
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
        if (!cancelled) setError(err.message || '加载资料失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDocument();
    return () => { cancelled = true; };
  }, [id]);

  const fileUrl = useMemo(() => getFileUrl(documentData), [documentData]);
  const thumbUrl = useMemo(() => getThumbUrl(documentData), [documentData]);
  const certMeta = documentData?.certificate_metadata || documentData?.certificateMetadata || {};
  const typeLabel = documentTypeLabel(documentData || {});
  const title = documentData?.title || certMeta?.cert_no || documentData?.cert_no || `${typeLabel} ${id}`;
  const currentDocType = normalizeDocType(documentData || {});
  const documentPublicStatus = getPublicStatusLabel(documentData, 'document');

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
    if (normalizeDocType(doc) === 'certificate') return metaNo || doc.title || `证书 #${doc.id}`;
    return [lang, doc.title || `资料 #${doc.id}`].filter(Boolean).join(' · ');
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
    api.recordHistory('文件', numericId, title, companyName, '查看资料').catch(() => {});
  }, [documentData, id, title]);

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
    return <div className={styles.statePage}><div className={styles.spinner} /><p>正在加载资料详情...</p></div>;
  }

  if (error || !documentData) {
    return (
      <div className={styles.statePage}>
        <p>{error || '资料不存在'}</p>
        <button onClick={() => navigate(-1)}>返回</button>
      </div>
    );
  }

  const facts = [
    { label: '资料类型', value: typeLabel },
    { label: '所属产品', value: documentData.product_name || documentData.productName },
    { label: '适用型号', value: documentData.product_model || documentData.productModel },
    { label: '所属公司', value: documentData.company_name || documentData.companyName },
    { label: '语言', value: documentData.language ? String(documentData.language).toUpperCase() : '未记录' },
    { label: '文件大小', value: formatSize(documentData.file_size || documentData.fileSize) },
    { label: '上传时间', value: formatDate(documentData.created_at || documentData.createdAt) },
    { label: '更新时间', value: formatDate(documentData.updated_at || documentData.updatedAt) },
    { label: '公开状态', value: documentPublicStatus },
  ];

  const certificateFacts = normalizeDocType(documentData) === 'certificate' ? [
    { label: '证书编号', value: certMeta.cert_no || documentData.cert_no },
    { label: '认证标准', value: certMeta.standard || documentData.standard },
    { label: '发证机构', value: certMeta.issuer || documentData.issuer },
    { label: '签发日期', value: formatDate(certMeta.issue_date || documentData.issue_date) },
    { label: '有效期至', value: formatDate(certMeta.expiry_date || documentData.expiry_date) },
  ].filter((item) => item.value && item.value !== '未记录') : [];

  return (
    <div className={styles.documentDetailPage}>
      <main className={styles.documentShell}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>← 返回</button>

        <section className={styles.documentHero}>
          <div>
            <span className={styles.typeBadge}>{typeLabel}</span>
            <h1>{title}</h1>
            <p>这是单份产品资料的直达页面，适合审核、分享、验证和下载。产品完整资料请返回产品详情页查看。</p>
          </div>
          <div className={styles.heroActions}>
            {fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer">打开原文件</a>}
            <button onClick={handleFavorite}>{isFavorited ? '★ 已收藏' : '☆ 收藏'}</button>
            <button onClick={copyLink}>分享资料</button>
          </div>
        </section>

        <section className={styles.documentLayout}>
          <aside className={styles.infoPanel}>
            {sameTypeDocs.length > 1 && (
              <div className={`${styles.infoCard} ${styles.switchCard}`}>
                <h2>{typeLabel}切换</h2>
                <div className={styles.switchBlock}>
                  <p>{currentDocType === 'certificate' ? '同一产品的其他证书类型' : '同一资料的其他语言版本'}</p>
                  <div className={styles.switchList}>
                    {sameTypeDocs.map((doc) => (
                      <Link
                        key={doc.id}
                        to={`/documents/${doc.id}`}
                        className={`${styles.switchItem} ${String(doc.id) === String(id) ? styles.switchItemActive : ''}`}
                      >
                        <span>{switchLabel(doc)}</span>
                        <small>{String(doc.id) === String(id) ? '当前' : '切换'}</small>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className={styles.infoCard}>
              <h2>资料信息</h2>
              <div className={styles.factList}>
                {facts.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value || '未记录'}</strong></div>)}
              </div>
            </div>

            {certificateFacts.length > 0 && (
              <div className={styles.infoCard}>
                <h2>证书信息</h2>
                <div className={styles.factList}>
                  {certificateFacts.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
                </div>
              </div>
            )}

            <div className={styles.infoCard}>
              <h2>关联入口</h2>
              <div className={styles.linkList}>
                {documentData.product_id && <Link to={`/products/${documentData.product_id}`}>查看产品详情</Link>}
                {documentData.company_id && <Link to={`/companies/${documentData.company_id}`}>查看公司详情</Link>}
              </div>
            </div>
          </aside>

          <div className={styles.previewPanel}>
            {fileUrl ? (
              isImage(fileUrl) ? <img src={fileUrl} alt={title} />
                : isPdf(fileUrl) ? <iframe src={fileUrl} title={title} />
                  : thumbUrl ? <img src={thumbUrl} alt={title} />
                    : <div className={styles.previewFallback}><strong>资料预览</strong><p>该格式暂不支持内嵌预览，可打开原文件查看。</p></div>
            ) : (
              <div className={styles.previewFallback}><strong>暂无资料</strong><p>该资料记录存在，但没有可访问的资料本体。</p></div>
            )}
          </div>
        </section>
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          typeLabel={`${typeLabel}分享`}
          title={title}
          subtitle={`查看 ${documentData.product_name || documentData.productName || '对应产品'} 的公开资料详情。`}
          url={`${window.location.origin}/eu-doc/documents/${id}`}
          meta={[typeLabel, documentData.language ? String(documentData.language).toUpperCase() : '', documentPublicStatus]}
          context={{
            kind: 'document',
            companyName: documentData.company_name || documentData.companyName,
            productName: documentData.product_name || documentData.productName,
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
