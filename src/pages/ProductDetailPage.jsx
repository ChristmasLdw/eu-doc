import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as api from '../services/api';
import styles from './ProductDetailPage.module.css';

const RESOURCE_TYPES = [
  { key: 'certificate', label: '资质证书', hint: '证明产品经过合规测试', tone: 'blue' },
  { key: 'declaration_of_conformity', label: 'DoC声明', hint: '企业符合性声明与语言版本', tone: 'green' },
  { key: 'manual', label: '使用说明书', hint: '安装、使用、维护和安全说明', tone: 'amber' },
];

function normalizeDocType(doc) {
  const type = doc.document_type || doc.documentType || 'other';
  return type === 'declaration' ? 'declaration_of_conformity' : type;
}

function docFilePath(doc) {
  return doc.file_path || doc.filePath || '';
}

function docThumbPath(doc) {
  return doc.thumbnail_path || doc.thumbnailPath || '';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function isImageFile(filePath) {
  const ext = String(filePath || '').split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [product, setProduct] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedType, setExpandedType] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [productResponse, documentsResponse] = await Promise.all([
          fetch(`/eu-doc/api/v2/products/${id}`).then((res) => res.json()),
          fetch(`/eu-doc/api/v2/products/${id}/documents`).then((res) => res.json()),
        ]);
        if (!productResponse.success) throw new Error(productResponse.message || t('productDetail.loadFailed'));
        if (cancelled) return;
        setProduct(productResponse.data);
        const activeDocs = (documentsResponse.data || []).filter((doc) => (doc.status || 'active') !== 'deleted');
        setDocuments(activeDocs);
        const firstFilledType = RESOURCE_TYPES.find((type) => activeDocs.some((doc) => normalizeDocType(doc) === type.key));
        setExpandedType(firstFilledType?.key || '');
      } catch (err) {
        if (!cancelled) setError(err.message || t('productDetail.networkError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [id, t]);

  useEffect(() => {
    if (!product) return;
    api.checkFavorite('产品', parseInt(id, 10))
      .then((result) => {
        if (result?.isFavorited) {
          setIsFavorited(true);
          setFavoriteId(result.favoriteId);
        }
      })
      .catch(() => {});
  }, [product, id]);

  const groupedResources = useMemo(() => RESOURCE_TYPES.map((type) => {
    const docs = documents.filter((doc) => normalizeDocType(doc) === type.key);
    const languages = [...new Set(docs.map((doc) => doc.language).filter(Boolean))];
    return { ...type, docs, languages };
  }), [documents]);

  const completedCount = groupedResources.filter((item) => item.docs.length > 0).length;
  const completeness = Math.round((completedCount / RESOURCE_TYPES.length) * 100);
  const latestUpdate = documents.map((doc) => doc.updated_at || doc.updatedAt || doc.created_at || doc.createdAt).filter(Boolean).sort().at(-1);

  const handleFavorite = async () => {
    if (!product) return;
    try {
      if (isFavorited && favoriteId) {
        await api.deleteFavorite(favoriteId);
        setIsFavorited(false);
        setFavoriteId(null);
      } else {
        const result = await api.addFavorite('产品', parseInt(id, 10), product.name, product.company_name || '', `${product.model || ''} - ${product.category_name || ''}`.trim());
        setIsFavorited(true);
        if (result?.id) setFavoriteId(result.id);
      }
    } catch (err) {
      alert(err.message || '收藏操作失败');
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/eu-doc/products/${id}`;
    if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).then(() => alert(t('productDetail.linkCopied')));
    else alert(`${t('productDetail.share')}：${shareUrl}`);
  };

  const openDocument = (doc) => {
    if (normalizeDocType(doc) === 'certificate') navigate(`/certificate/${doc.id}`);
    else if (docFilePath(doc)) window.open(`/eu-doc${docFilePath(doc)}`, '_blank');
  };

  if (loading) {
    return <div className={styles.loading}><div className={styles.spinner}></div><p>{t('productDetail.loading')}</p></div>;
  }

  if (error || !product) {
    return (
      <div className={styles.error}>
        <p>{error || t('productDetail.productNotFound')}</p>
        <button onClick={() => navigate(-1)} className={styles.backButton}>{t('common.back')}</button>
      </div>
    );
  }

  return (
    <div className={styles.productDetailPage}>
      <div className={styles.detailContainer}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>← 返回</button>

        <section className={styles.heroCard}>
          <div className={styles.heroMain}>
            <span className={styles.eyebrow}>产品合规资料包</span>
            <h1>{product.name}</h1>
            {product.name_en && <p className={styles.heroSub}>{product.name_en}</p>}
            <div className={styles.heroMeta}>
              {product.model && <span>型号：{product.model}</span>}
              {product.category_name && <span>分类：{product.category_name}</span>}
              {product.company_name && <Link to={`/company/${product.company_id}`}>公司：{product.company_name}</Link>}
            </div>
          </div>
          <div className={styles.heroActions}>
            <button onClick={handleFavorite}>{isFavorited ? '★ 已收藏' : '☆ 收藏'}</button>
            <button onClick={handleShare}>分享</button>
          </div>
        </section>

        <section className={styles.overviewGrid}>
          <div className={styles.complianceCard}>
            <div className={styles.complianceHead}>
              <div>
                <span>资料完整度</span>
                <strong>{completeness}%</strong>
              </div>
              <em>{completedCount}/{RESOURCE_TYPES.length} 类资料</em>
            </div>
            <div className={styles.complianceTrack}><span style={{ width: `${completeness}%` }} /></div>
            <p>{completeness === 100 ? '该产品主要合规资料已完整公开。' : '仍有资料类型未公开，建议联系企业补充。'}</p>
          </div>
          <div className={styles.factCard}><span>公开文件</span><strong>{documents.length}</strong><p>证书、DoC、说明书等</p></div>
          <div className={styles.factCard}><span>最近更新</span><strong>{formatDate(latestUpdate)}</strong><p>以公开资料时间为准</p></div>
        </section>

        <section className={styles.resourcePanel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>资料总览</h2>
              <p>先确认资料是否齐全，需要查看细节时再打开具体文件。</p>
            </div>
          </div>

          <div className={styles.resourceList}>
            {groupedResources.map((group) => {
              const expanded = expandedType === group.key;
              return (
                <article key={group.key} className={`${styles.resourceGroup} ${styles[`tone_${group.tone}`]} ${group.docs.length ? '' : styles.resourceMissing}`}>
                  <button className={styles.resourceSummary} onClick={() => group.docs.length && setExpandedType(expanded ? '' : group.key)}>
                    <div>
                      <span>{group.label}</span>
                      <p>{group.docs.length ? `${group.docs.length} 份文件${group.languages.length ? ` · ${group.languages.map((lang) => lang.toUpperCase()).join(' / ')}` : ''}` : group.hint}</p>
                    </div>
                    <strong>{group.docs.length || '+'}</strong>
                  </button>

                  {expanded && group.docs.length > 0 && (
                    <div className={styles.fileList}>
                      {group.docs.map((doc) => {
                        const filePath = docFilePath(doc);
                        const thumbPath = docThumbPath(doc);
                        return (
                          <button key={doc.id} className={styles.fileCard} onClick={() => openDocument(doc)}>
                            <div className={styles.filePreview}>
                              {thumbPath ? <img src={`/eu-doc${thumbPath}`} alt={doc.title} /> : isImageFile(filePath) ? <img src={`/eu-doc${filePath}`} alt={doc.title} /> : <span>{normalizeDocType(doc) === 'certificate' ? 'CERT' : normalizeDocType(doc) === 'manual' ? 'MAN' : 'DOC'}</span>}
                            </div>
                            <div className={styles.fileInfo}>
                              <h3>{doc.title || doc.cert_no || `文件 ${doc.id}`}</h3>
                              <p>{doc.language ? doc.language.toUpperCase() : '未设置语言'} · {doc.review_status === 'approved' || doc.reviewStatus === 'approved' ? '已审核' : '待审核'}</p>
                            </div>
                            <em>{normalizeDocType(doc) === 'certificate' ? '查看详情' : '打开文件'} →</em>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
