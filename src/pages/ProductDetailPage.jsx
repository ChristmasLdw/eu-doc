import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as api from '../services/api';
import ShareModal from '../components/ShareModal';
import { getPublicStatusLabel } from '../utils/publicStatus';
import styles from './ProductDetailPage.module.css';

const RESOURCE_TYPES = [
  { key: 'certificate', label: '资质证书', shortLabel: '证书', hint: 'CE、UKCA、检测认证等', tone: 'blue' },
  { key: 'declaration_of_conformity', label: 'DoC 声明', shortLabel: 'DoC', hint: '符合性声明、责任主体与语言版本', tone: 'indigo' },
  { key: 'manual', label: '使用说明书', shortLabel: '说明书', hint: '安装、使用、维护和安全说明', tone: 'cyan' },
  { key: 'test_report', label: '检测报告', shortLabel: '报告', hint: '实验室测试和技术验证文件', tone: 'slate' },
];

const TYPE_LABELS = RESOURCE_TYPES.reduce((map, item) => ({ ...map, [item.key]: item.label }), {});

function normalizeDocType(doc) {
  const type = doc.document_type || doc.documentType || 'other';
  if (type === 'declaration') return 'declaration_of_conformity';
  if (type === 'report') return 'test_report';
  return type;
}

function docFilePath(doc) {
  return doc.file_path || doc.filePath || '';
}

function docThumbPath(doc) {
  return doc.thumbnail_path || doc.thumbnailPath || '';
}

function toAssetUrl(path = '') {
  if (!path) return '';
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  if (path.startsWith('/eu-doc/')) return path;
  if (path.startsWith('/documents/')) return `/eu-doc/uploads${path}`;
  return `/eu-doc${path}`;
}

function productImagePath(product = {}) {
  const item = product || {};
  const path = item.image_path || item.imagePath || item.image || '';
  if (!path) return '';
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  if (path.startsWith('/eu-doc/')) return path;
  return `/eu-doc${path}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function compactDate(dateStr) {
  if (!dateStr) return '未记录';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '未记录';
  return date.toLocaleDateString('zh-CN');
}

function isImageFile(filePath) {
  const ext = String(filePath || '').split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
}

function valueOrPending(value) {
  return value || '待企业补充';
}

function productCode(product = {}) {
  const item = product || {};
  return item.product_code || item.productCode || `EU-P-${String(item.id || '').padStart(6, '0')}`;
}

function documentCode(doc = {}) {
  const item = doc || {};
  return item.cert_no || item.certNo || item.document_no || item.documentNo || item.version || item.file_no || item.fileNo || `EU-D-${String(item.id || '').padStart(6, '0')}`;
}

function splitModels(model) {
  return String(model || '')
    .split(/[,，、;；/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [product, setProduct] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTypes, setExpandedTypes] = useState([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [productResponse, documentsResponse, relatedResponse] = await Promise.all([
          fetch(`/eu-doc/api/v2/products/${id}`).then((res) => res.json()),
          fetch(`/eu-doc/api/v2/products/${id}/documents`).then((res) => res.json()),
          fetch(`/eu-doc/api/v2/products/${id}/related`).then((res) => res.json()).catch(() => ({ success: false, data: [] })),
        ]);
        if (!productResponse.success) throw new Error(productResponse.message || t('productDetail.loadFailed'));
        if (cancelled) return;
        setProduct(productResponse.data);
        const activeDocs = (documentsResponse.data || []).filter((doc) => (doc.status || 'active') !== 'deleted');
        setDocuments(activeDocs);
        setRelatedProducts(relatedResponse.success ? (relatedResponse.data || []) : []);
        const firstFilledType = RESOURCE_TYPES.find((type) => activeDocs.some((doc) => normalizeDocType(doc) === type.key));
        setExpandedTypes(firstFilledType?.key ? [firstFilledType.key] : []);
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

  const latestUpdate = documents.map((doc) => doc.updated_at || doc.updatedAt || doc.created_at || doc.createdAt).filter(Boolean).sort().at(-1);
  const models = splitModels(product?.model);
  const imageUrl = productImagePath(product);
  const productPublicStatus = getPublicStatusLabel(product, 'product');

  const detailItems = [
    { label: '产品编号', value: productCode(product), required: true, group: 'identity' },
    { label: '产品型号', value: product?.model, required: true, group: 'identity' },
    { label: '所属公司', value: product?.company_name, companyId: product?.company_id, required: true, group: 'identity' },
    { label: '产品类别', value: product?.category_name, required: true, group: 'identity' },
    { label: '产品尺寸', value: product?.dimensions || product?.size, required: true, group: 'physical' },
    { label: '重量', value: product?.weight, required: true, group: 'physical' },
    { label: '材质', value: product?.material, required: true, group: 'physical' },
    { label: '适用场景', value: product?.usage_scenario || product?.usageScenario, required: true, group: 'usage' },
    { label: '资料更新', value: formatDate(latestUpdate), required: true, group: 'record' },
  ].filter((item) => item.required || item.value);
  const shouldShowModelSection = models.length > 1 && models.join(', ') !== String(product?.model || '').trim();

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
    setShareOpen(true);
  };

  const openDocument = (doc) => {
    navigate(`/documents/${doc.id}`);
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
      <div className={styles.productShell}>
        <button onClick={() => navigate(-1)} className={styles.productBack}>← 返回</button>

        <section className={styles.productHeroV3}>
          <div className={styles.heroCopyV3}>
            <span className={styles.eyebrowV3}>产品资料中心</span>
            <h1>{product.name}</h1>
            {product.name_en && <p className={styles.productEnglishName}>{product.name_en}</p>}
            <p className={styles.productIntro}>{product.description || '该页面集中展示产品基础信息、适用型号、合规资料和说明文档，方便用户确认产品并进入对应文件详情页。'}</p>
            <div className={styles.heroMetaV3}>
              <span>产品编号：{productCode(product)}</span>
              {product.category_name && <span>{product.category_name}</span>}
              {product.company_name && <Link to={`/companies/${product.company_id}`}>{product.company_name}</Link>}
              <span>{documents.length} 份公开资料</span>
              <span>{productPublicStatus}</span>
            </div>
          </div>
          <aside className={styles.productHeroAside}>
            <div className={styles.productVisual}>
              {imageUrl ? <img src={imageUrl} alt={product.name} /> : <div><strong>PRODUCT</strong><span>产品图片待企业补充</span></div>}
            </div>
            <div className={styles.heroActionRow}>
              <button onClick={handleFavorite}>{isFavorited ? '★ 已收藏' : '☆ 收藏'}</button>
              <button onClick={handleShare}>分享产品</button>
            </div>
          </aside>
        </section>

        <div className={styles.platformNoticeV3}>
          <strong>资料来源说明</strong>
          <span>本页资料由企业上传并对真实性负责。EU-DOC 提供展示与管理工具，不作为认证机构，不对文件真实性、有效性或产品合规性作出背书。</span>
        </div>

        <section className={styles.productContentGrid}>
          <div className={styles.leftColumnV3}>
            <section className={styles.infoPanelV3}>
              <div className={styles.sectionHeadV3}>
                <h2>产品信息</h2>
                <p>用于让 C 端用户确认是不是自己要找的产品。</p>
              </div>
              <div className={styles.infoGridV3}>
                {detailItems.map((item) => (
                  <div key={item.label} className={item.value ? styles.infoItemV3 : styles.infoItemPendingV3}>
                    <span>{item.label}</span>
                    <strong>{item.companyId ? <Link to={`/companies/${item.companyId}`}>{valueOrPending(item.value)}</Link> : valueOrPending(item.value)}</strong>
                  </div>
                ))}
              </div>
            </section>

            {shouldShowModelSection && (
              <section className={styles.infoPanelV3}>
                <div className={styles.sectionHeadV3}>
                  <h2>适用型号</h2>
                  <p>该产品资料覆盖以下具体型号。</p>
                </div>
                <div className={styles.modelListV3}>
                  {models.map((model) => <span key={model}>{model}</span>)}
                </div>
              </section>
            )}

            <section className={styles.infoPanelV3}>
              <div className={styles.sectionHeadV3}>
                <h2>资料中心</h2>
                <p>产品页只做资料总览；点击具体文件后进入独立文件详情页。</p>
              </div>
              <div className={styles.resourceListV3}>
                {groupedResources.map((group) => {
                  const expanded = expandedTypes.includes(group.key);
                  return (
                    <article key={group.key} className={`${styles.resourceGroupV3} ${styles[`resource_${group.tone}`]} ${group.docs.length ? '' : styles.resourceMissingV3}`}>
                      <button className={styles.resourceSummaryV3} onClick={() => group.docs.length && setExpandedTypes((current) => current.includes(group.key) ? current.filter((key) => key !== group.key) : [...current, group.key])}>
                        <div>
                          <span>{group.label}</span>
                          <p>{group.docs.length ? `${group.docs.length} 份文件${group.languages.length ? ` · ${group.languages.map((lang) => lang.toUpperCase()).join(' / ')}` : ''}` : group.hint}</p>
                        </div>
                        <strong>{group.docs.length ? '查看' : '暂未公开'}</strong>
                      </button>

                      {expanded && group.docs.length > 0 && (
                        <div className={styles.documentRowsV3}>
                          {group.docs.map((doc) => {
                            const filePath = docFilePath(doc);
                            const thumbPath = docThumbPath(doc);
                            return (
                              <button key={doc.id} className={styles.documentRowV3} onClick={() => openDocument(doc)}>
                                <div className={styles.documentThumbV3}>
                                  {thumbPath ? <img src={toAssetUrl(thumbPath)} alt={doc.title} /> : isImageFile(filePath) ? <img src={toAssetUrl(filePath)} alt={doc.title} /> : <span>{group.shortLabel}</span>}
                                </div>
                                <div>
                                  <h3>{doc.title || doc.cert_no || `文件 ${doc.id}`}</h3>
                                  <p>{TYPE_LABELS[normalizeDocType(doc)] || '其他文件'} · 编号：{documentCode(doc)} · {doc.language ? doc.language.toUpperCase() : '未设置语言'} · {compactDate(doc.updated_at || doc.updatedAt || doc.created_at || doc.createdAt)}</p>
                                </div>
                                <em>进入文件详情 →</em>
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

          <aside className={styles.rightColumnV3}>
            <section className={styles.sideCardV3}>
              <h2>快捷查看</h2>
              <p>适合审核人员快速进入 DoC、证书或说明书。</p>
              <div className={styles.quickDocList}>
                {groupedResources.map((group) => {
                  const firstDoc = group.docs[0];
                  return firstDoc ? (
                    <button key={group.key} onClick={() => openDocument(firstDoc)}>
                      <span>{group.label}</span>
                      <strong>查看</strong>
                    </button>
                  ) : (
                    <div key={group.key} className={styles.emptyQuickDoc}>
                      <span>{group.label}</span>
                      <strong>暂未公开</strong>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>
        </section>

        {relatedProducts.length > 0 && (
          <section className={styles.relatedPanelV3}>
            <div className={styles.sectionHeadV3}>
              <h2>同公司相关产品</h2>
              <p>继续查看该企业公开的其他产品资料。</p>
            </div>
            <div className={styles.relatedGridV3}>
              {relatedProducts.map((item) => (
                <Link key={item.id} to={`/products/${item.id}`} className={styles.relatedCardV3}>
                  <div className={styles.relatedImageV3}>
                    {productImagePath(item) ? <img src={productImagePath(item)} alt={item.name} /> : <span>PRODUCT</span>}
                  </div>
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.model || '型号待补充'}</p>
                    <em>{item.document_count || item.documentCount || 0} 份公开资料</em>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          typeLabel="产品分享"
          title={product.name}
          subtitle={product.description || '查看产品基础信息、适用型号、公开资料和文件详情。'}
          url={`${window.location.origin}/eu-doc/products/${id}`}
          meta={[productCode(product), product.company_name, productPublicStatus]}
        />
      </div>
    </div>
  );
}
