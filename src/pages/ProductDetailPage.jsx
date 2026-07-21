import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as api from '../services/api';
import ShareModal from '../components/ShareModal';
import {
  documentTypeLabel,
  formatPublicDate,
  isEnglishLanguage,
  localizedField,
  publicStatusLabel,
  valueOrPending as localizedPending,
} from '../utils/languageContent';
import styles from './ProductDetailPage.module.css';

const RESOURCE_TYPES = [
  { key: 'certificate', tone: 'blue' },
  { key: 'declaration_of_conformity', tone: 'indigo' },
  { key: 'manual', tone: 'cyan' },
  { key: 'test_report', tone: 'slate' },
];

function normalizeDocType(doc) {
  const type = doc.document_type || doc.documentType || 'other';
  if (type === 'declaration') return 'declaration_of_conformity';
  if (type === 'report') return 'test_report';
  return type;
}

function docFilePath(doc) {
  return doc.file_url || doc.fileUrl || doc.file_path || doc.filePath || '';
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

function formatDate(dateStr, language) {
  return formatPublicDate(dateStr, language, '-');
}

function compactDate(dateStr, language) {
  return formatPublicDate(dateStr, language);
}

function isImageFile(filePath, mimeType = '') {
  if (String(mimeType).startsWith('image/')) return true;
  const ext = String(filePath || '').split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
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
  const { t, i18n } = useTranslation();
  const isEn = isEnglishLanguage(i18n.language);
  const ui = {
    back: isEn ? 'Back' : '返回',
    center: isEn ? 'Product Document Center' : '产品资料中心',
    intro: isEn ? 'This page presents product basics, applicable models, compliance documents, and manuals so users can confirm the product and open each document detail page.' : '该页面集中展示产品基础信息、适用型号、合规资料和说明文档，方便用户确认产品并进入对应资料详情页。',
    productCode: isEn ? 'Product ID' : '产品编号',
    publicDocs: isEn ? 'public documents' : '份公开资料',
    productImagePending: isEn ? 'Product image not provided' : '产品图片待企业补充',
    favorited: isEn ? '★ Favorited' : '★ 已收藏',
    favorite: isEn ? '☆ Favorite' : '☆ 收藏',
    shareProduct: isEn ? 'Share product' : '分享产品',
    sourceTitle: isEn ? 'Source notice' : '资料来源说明',
    sourceText: isEn ? 'Documents on this page are uploaded by the company, which is responsible for their authenticity. EU-DOC provides display and management tools only and is not a certification body.' : '本页资料由企业上传并对真实性负责。EU-DOC 提供展示与管理工具，不作为认证机构，不对资料真实性、有效性或产品合规性作出背书。',
    productInfo: isEn ? 'Product information' : '产品信息',
    productInfoDesc: isEn ? 'Helps users confirm whether this is the product they are looking for.' : '用于让 C 端用户确认是不是自己要找的产品。',
    modelSection: isEn ? 'Applicable models' : '适用型号',
    modelDesc: isEn ? 'These documents apply to the following models.' : '该产品资料覆盖以下具体型号。',
    resourceCenter: isEn ? 'Document center' : '资料中心',
    resourceDesc: isEn ? 'The product page is an overview. Open a document to view its dedicated detail page.' : '产品页只做资料总览；点击具体资料后进入独立资料详情页。',
    view: isEn ? 'View' : '查看',
    notPublic: isEn ? 'Not public yet' : '暂未公开',
    enterDetail: isEn ? 'Open document details →' : '进入资料详情 →',
    quickView: isEn ? 'Quick access' : '快捷查看',
    quickDesc: isEn ? 'For reviewers who need quick access to DoC, certificates, or manuals.' : '适合审核人员快速进入 DoC、证书或说明书。',
    related: isEn ? 'Related products from this company' : '同公司相关产品',
    relatedDesc: isEn ? 'Continue browsing other public product documents from this company.' : '继续查看该企业公开的其他产品资料。',
    modelPending: isEn ? 'Model not provided' : '型号待补充',
    shareType: isEn ? 'Product share' : '产品分享',
    shareSubtitle: isEn ? 'View product basics, applicable models, public documents, and document details.' : '查看产品基础信息、适用型号、公开资料和资料详情。',
    noLanguage: isEn ? 'Language not set' : '未设置语言',
  };

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
    api.recordHistory('产品', parseInt(id, 10), localizedField(product, 'name', i18n.language), localizedField({ name: product.company_name || product.companyName, name_en: product.company_name_en || product.companyNameEn }, 'name', i18n.language), isEn ? 'View product' : '查看产品').catch(() => {});
  }, [product, id, i18n.language, isEn]);

  const groupedResources = useMemo(() => RESOURCE_TYPES.map((type) => {
    const docs = documents.filter((doc) => normalizeDocType(doc) === type.key);
    const languages = [...new Set(docs.map((doc) => doc.language).filter(Boolean))];
    const hints = isEn
      ? { certificate: 'CE, UKCA, and certification documents', declaration_of_conformity: 'Declaration of conformity, responsible party, and language versions', manual: 'Installation, use, maintenance, and safety instructions', test_report: 'Laboratory testing and technical verification documents' }
      : { certificate: 'CE、UKCA、检测认证等', declaration_of_conformity: '符合性声明、责任主体与语言版本', manual: '安装、使用、维护和安全说明', test_report: '实验室测试和技术验证资料' };
    return { ...type, label: documentTypeLabel(type.key, i18n.language), shortLabel: documentTypeLabel(type.key, i18n.language, 'short'), hint: hints[type.key], docs, languages };
  }), [documents, i18n.language, isEn]);

  const latestUpdate = documents.map((doc) => doc.updated_at || doc.updatedAt || doc.created_at || doc.createdAt).filter(Boolean).sort().at(-1);
  const models = splitModels(product?.model);
  const imageUrl = productImagePath(product);
  const productPublicStatus = publicStatusLabel(product, 'product', i18n.language);
  const productName = localizedField(product, 'name', i18n.language);
  const productDescription = localizedField(product, 'description', i18n.language);
  const companyName = localizedField({ name: product?.company_name || product?.companyName, name_en: product?.company_name_en || product?.companyNameEn }, 'name', i18n.language);
  const categoryName = localizedField({ name: product?.category_name || product?.categoryName, name_en: product?.category_name_en || product?.categoryNameEn }, 'name', i18n.language);

  const detailItems = [
    { label: isEn ? 'Product ID' : '产品编号', value: productCode(product), required: true, group: 'identity' },
    { label: isEn ? 'Model' : '产品型号', value: product?.model, required: true, group: 'identity' },
    { label: isEn ? 'Company' : '所属公司', value: companyName, companyId: product?.company_id, required: true, group: 'identity' },
    { label: isEn ? 'Category' : '产品类别', value: categoryName, required: true, group: 'identity' },
    { label: isEn ? 'Dimensions' : '产品尺寸', value: product?.dimensions || product?.size, required: true, group: 'physical' },
    { label: isEn ? 'Weight' : '重量', value: product?.weight, required: true, group: 'physical' },
    { label: isEn ? 'Material' : '材质', value: product?.material, required: true, group: 'physical' },
    { label: isEn ? 'Use scenario' : '适用场景', value: product?.usage_scenario || product?.usageScenario, required: true, group: 'usage' },
    { label: isEn ? 'Color / Appearance' : '颜色/外观', value: product?.color, required: false, group: 'physical' },
    { label: isEn ? 'Package contents' : '包装内容', value: product?.package_contents || product?.packageContents, required: false, group: 'usage' },
    { label: isEn ? 'Warranty / Service' : '保修/服务', value: product?.warranty, required: false, group: 'usage' },
    { label: isEn ? 'Origin' : '产地/生产地', value: product?.origin_country || product?.originCountry, required: false, group: 'record' },
    { label: isEn ? 'Updated' : '资料更新', value: formatDate(latestUpdate, i18n.language), required: true, group: 'record' },
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
        <button onClick={() => navigate(-1)} className={styles.productBack}>← {ui.back}</button>

        <section className={styles.productHeroV3}>
          <div className={styles.heroCopyV3}>
            <span className={styles.eyebrowV3}>{ui.center}</span>
            <h1>{productName}</h1>
            {!isEn && product.name_en && <p className={styles.productEnglishName}>{product.name_en}</p>}
            <p className={styles.productIntro}>{productDescription || ui.intro}</p>
            <div className={styles.heroMetaV3}>
              <span>{ui.productCode}: {productCode(product)}</span>
              {categoryName && <span>{categoryName}</span>}
              {companyName && <Link to={`/companies/${product.company_id}`}>{companyName}</Link>}
              <span>{documents.length} {ui.publicDocs}</span>
              <span>{productPublicStatus}</span>
            </div>
          </div>
          <aside className={styles.productHeroAside}>
            <div className={styles.productVisual}>
              {imageUrl ? <img src={imageUrl} alt={productName} /> : <div><strong>PRODUCT</strong><span>{ui.productImagePending}</span></div>}
            </div>
            <div className={styles.heroActionRow}>
              <button onClick={handleFavorite}>{isFavorited ? ui.favorited : ui.favorite}</button>
              <button onClick={handleShare}>{ui.shareProduct}</button>
            </div>
          </aside>
        </section>

        <div className={styles.platformNoticeV3}>
          <strong>{ui.sourceTitle}</strong>
          <span>{ui.sourceText}</span>
        </div>

        <section className={styles.productContentGrid}>
          <div className={styles.leftColumnV3}>
            <section className={styles.infoPanelV3}>
              <div className={styles.sectionHeadV3}>
                <h2>{ui.productInfo}</h2>
                <p>{ui.productInfoDesc}</p>
              </div>
              <div className={styles.infoGridV3}>
                {detailItems.map((item) => (
                  <div key={item.label} className={item.value ? styles.infoItemV3 : styles.infoItemPendingV3}>
                    <span>{item.label}</span>
                    <strong>{item.companyId ? <Link to={`/companies/${item.companyId}`}>{localizedPending(item.value, i18n.language)}</Link> : localizedPending(item.value, i18n.language)}</strong>
                  </div>
                ))}
              </div>
            </section>

            {shouldShowModelSection && (
              <section className={styles.infoPanelV3}>
                <div className={styles.sectionHeadV3}>
                  <h2>{ui.modelSection}</h2>
                  <p>{ui.modelDesc}</p>
                </div>
                <div className={styles.modelListV3}>
                  {models.map((model) => <span key={model}>{model}</span>)}
                </div>
              </section>
            )}

            <section className={styles.infoPanelV3}>
              <div className={styles.sectionHeadV3}>
                <h2>{ui.resourceCenter}</h2>
                <p>{ui.resourceDesc}</p>
              </div>
              <div className={styles.resourceListV3}>
                {groupedResources.map((group) => {
                  const expanded = expandedTypes.includes(group.key);
                  return (
                    <article key={group.key} className={`${styles.resourceGroupV3} ${styles[`resource_${group.tone}`]} ${group.docs.length ? '' : styles.resourceMissingV3}`}>
                      <button className={styles.resourceSummaryV3} onClick={() => group.docs.length && setExpandedTypes((current) => current.includes(group.key) ? current.filter((key) => key !== group.key) : [...current, group.key])}>
                        <div>
                          <span>{group.label}</span>
                          <p>{group.docs.length ? `${group.docs.length} ${isEn ? 'documents' : '份资料'}${group.languages.length ? ` · ${group.languages.map((lang) => lang.toUpperCase()).join(' / ')}` : ''}` : group.hint}</p>
                        </div>
                        <strong>{group.docs.length ? ui.view : ui.notPublic}</strong>
                      </button>

                      {expanded && group.docs.length > 0 && (
                        <div className={styles.documentRowsV3}>
                          {group.docs.map((doc) => {
                            const filePath = docFilePath(doc);
                            const thumbPath = docThumbPath(doc);
                            return (
                              <button key={doc.id} className={styles.documentRowV3} onClick={() => openDocument(doc)}>
                                <div className={styles.documentThumbV3}>
                                  {thumbPath ? <img src={toAssetUrl(thumbPath)} alt={localizedField(doc, 'title', i18n.language) || doc.title} /> : isImageFile(filePath, doc.mime_type || doc.mimeType) ? <img src={toAssetUrl(filePath)} alt={localizedField(doc, 'title', i18n.language) || doc.title} /> : <span>{group.shortLabel}</span>}
                                </div>
                                <div>
                                  <h3>{localizedField(doc, 'title', i18n.language) || doc.cert_no || `${isEn ? 'Document' : '资料'} ${doc.id}`}</h3>
                                  <p>{documentTypeLabel(normalizeDocType(doc), i18n.language)} · {isEn ? 'No.' : '编号'}: {documentCode(doc)} · {doc.language ? doc.language.toUpperCase() : ui.noLanguage} · {compactDate(doc.updated_at || doc.updatedAt || doc.created_at || doc.createdAt, i18n.language)}</p>
                                </div>
                                <em>{ui.enterDetail}</em>
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
              <h2>{ui.quickView}</h2>
              <p>{ui.quickDesc}</p>
              <div className={styles.quickDocList}>
                {groupedResources.map((group) => {
                  const firstDoc = group.docs[0];
                  return firstDoc ? (
                    <button key={group.key} onClick={() => openDocument(firstDoc)}>
                      <span>{group.label}</span>
                      <strong>{ui.view}</strong>
                    </button>
                  ) : (
                    <div key={group.key} className={styles.emptyQuickDoc}>
                      <span>{group.label}</span>
                      <strong>{ui.notPublic}</strong>
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
              <h2>{ui.related}</h2>
              <p>{ui.relatedDesc}</p>
            </div>
            <div className={styles.relatedGridV3}>
              {relatedProducts.map((item) => (
                <Link key={item.id} to={`/products/${item.id}`} className={styles.relatedCardV3}>
                  <div className={styles.relatedImageV3}>
                    {productImagePath(item) ? <img src={productImagePath(item)} alt={localizedField(item, 'name', i18n.language)} /> : <span>PRODUCT</span>}
                  </div>
                  <div>
                    <h3>{localizedField(item, 'name', i18n.language)}</h3>
                    <p>{item.model || ui.modelPending}</p>
                    <em>{item.document_count || item.documentCount || 0} {ui.publicDocs}</em>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          typeLabel={ui.shareType}
          title={productName}
          subtitle={productDescription || ui.shareSubtitle}
          url={`${window.location.origin}/eu-doc/products/${id}`}
          meta={[productCode(product), companyName, productPublicStatus]}
          context={{
            kind: 'product',
            companyName,
            productName,
            documentCode: productCode(product),
          }}
        />
      </div>
    </div>
  );
}
