import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLanguageCode } from '../i18n/languages';
import ShareModal from '../components/ShareModal';
import * as api from '../services/api';
import { documentDisplayTitle, documentTypeLabel, formatPublicDate, usesEnglishFallback, localizedField, publicStatusLabel } from '../utils/languageContent';
import styles from './DocumentDetailPage.module.css';

function normalizeDocType(doc = {}) {
  const type = doc.document_type || doc.documentType || 'other';
  const normalized = type === 'declaration' ? 'declaration_of_conformity' : type;
  return ['certificate', 'declaration_of_conformity', 'manual'].includes(normalized) ? normalized : 'other';
}

function getFileUrl(doc = {}) {
  const item = doc || {};
  const path = item.file_url || item.fileUrl || item.file_path || item.filePath || '';
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

function isImage(url = '', mimeType = '') {
  if (String(mimeType).startsWith('image/')) return true;
  const clean = String(url).split('?')[0].toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].some((ext) => clean.endsWith(ext));
}

function isPdf(url = '', mimeType = '') {
  if (String(mimeType).toLowerCase() === 'application/pdf') return true;
  const cleanUrl = String(url).split('?')[0].toLowerCase();
  // API 文件路径格式：/api/v2/documents/{id}/file，默认假设是 PDF
  if (cleanUrl.includes('/api/v2/documents/') && cleanUrl.includes('/file')) return true;
  return cleanUrl.endsWith('.pdf');
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
  const language = getLanguageCode(i18n.resolvedLanguage);
  const isEn = usesEnglishFallback(language);
  const ui = {
    back: isEn ? 'Back' : '返回',
    loading: isEn ? 'Loading document details...' : '正在加载资料详情...',
    notFound: isEn ? 'Document not found' : '资料不存在',
    loadFailed: isEn ? 'Failed to load document' : '加载资料失败',
    openFile: isEn ? 'Open original file' : '打开原文件',
    downloadFile: isEn ? 'Download file' : '下载文件',
    favorited: isEn ? '★ Favorited' : '★ 已收藏',
    favorite: isEn ? '☆ Favorite' : '☆ 收藏',
    share: isEn ? 'Share document' : '分享资料',
    reportIssue: isEn ? 'Report a document issue' : '报告资料问题',
    sourceNotice: isEn ? 'This document was uploaded by the company, which is responsible for its authenticity. EU-DOC does not endorse its authenticity, validity, or product compliance.' : '资料由企业上传并对内容真实性负责。EU-DOC 不对资料真实性、有效性或产品合规性作出背书。',
    reportTitle: isEn ? 'Report a document issue' : '报告资料问题',
    reportIntro: isEn ? 'Choose the closest issue type. Contact details are optional and are used only if follow-up is needed.' : '请选择最接近的问题类型。联系方式选填，仅在需要进一步核实时使用。',
    issueType: isEn ? 'Issue type' : '问题类型',
    chooseIssue: isEn ? 'Choose an issue type' : '请选择问题类型',
    issueOutdated: isEn ? 'Document is outdated' : '资料过期',
    issueMismatch: isEn ? 'Product or model mismatch' : '产品或型号不符',
    issueUnavailable: isEn ? 'File cannot be opened' : '文件无法打开',
    issueContent: isEn ? 'Content is incorrect' : '内容错误',
    issueOther: isEn ? 'Other issue' : '其他问题',
    description: isEn ? 'Description (optional)' : '问题描述（选填）',
    descriptionPlaceholder: isEn ? 'Add details that may help us verify the issue' : '补充有助于核验问题的具体情况',
    reporterName: isEn ? 'Name (optional)' : '姓名（选填）',
    reporterEmail: isEn ? 'Email (optional)' : '邮箱（选填）',
    cancel: isEn ? 'Cancel' : '取消',
    submitReport: isEn ? 'Submit report' : '提交报告',
    submittingReport: isEn ? 'Submitting...' : '正在提交...',
    reportSuccess: isEn ? 'Thank you. Your report has been submitted for review.' : '感谢反馈，问题报告已提交核验。',
    reportFailed: isEn ? 'Could not submit the report. Please try again.' : '报告提交失败，请稍后重试。',
    close: isEn ? 'Close' : '关闭',
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
  if (language === 'de') Object.assign(ui, {
    back: 'Zurück',
    loading: 'Dokumentdetails werden geladen...',
    notFound: 'Dokument nicht gefunden',
    loadFailed: 'Dokument konnte nicht geladen werden',
    openFile: 'Originaldatei öffnen',
    downloadFile: 'Datei herunterladen',
    favorited: '★ Favorisiert',
    favorite: '☆ Favorisieren',
    share: 'Dokument teilen',
    reportIssue: 'Dokumentproblem melden',
    sourceNotice: 'Dieses Dokument wurde vom Unternehmen hochgeladen, das für seine Echtheit verantwortlich ist. EU-DOC übernimmt keine Gewähr für Echtheit, Gültigkeit oder Produktkonformität.',
    reportTitle: 'Dokumentproblem melden',
    reportIntro: 'Wählen Sie die passendste Problemart. Kontaktdaten sind optional und werden nur für Rückfragen verwendet.',
    issueType: 'Problemart',
    chooseIssue: 'Problemart auswählen',
    issueOutdated: 'Dokument ist veraltet',
    issueMismatch: 'Produkt oder Modell stimmt nicht überein',
    issueUnavailable: 'Datei lässt sich nicht öffnen',
    issueContent: 'Inhalt ist fehlerhaft',
    issueOther: 'Sonstiges Problem',
    description: 'Beschreibung (optional)',
    descriptionPlaceholder: 'Ergänzen Sie Angaben, die bei der Prüfung helfen',
    reporterName: 'Name (optional)',
    reporterEmail: 'E-Mail (optional)',
    cancel: 'Abbrechen',
    submitReport: 'Meldung senden',
    submittingReport: 'Wird gesendet...',
    reportSuccess: 'Vielen Dank. Ihre Meldung wurde zur Prüfung übermittelt.',
    reportFailed: 'Die Meldung konnte nicht gesendet werden. Bitte versuchen Sie es erneut.',
    close: 'Schließen',
    switchTitle: ' wechseln',
    otherCertificates: 'Weitere Zertifikate für dasselbe Produkt',
    otherLanguages: 'Andere Sprachversionen desselben Dokumenttyps',
    current: 'Aktuell',
    switch: 'Wechseln',
    info: 'Dokumentinformationen',
    certInfo: 'Zertifikatsinformationen',
    related: 'Zugehörige Seiten',
    viewProduct: 'Produktdetails ansehen',
    viewCompany: 'Unternehmensdetails ansehen',
    preview: 'Dokumentvorschau',
    previewFallback: 'Dieses Format kann nicht direkt angezeigt werden. Öffnen Sie die Originaldatei.',
    noFile: 'Keine Datei verfügbar',
    noFileDesc: 'Der Dokumenteintrag ist vorhanden, aber es ist keine zugängliche Datei hinterlegt.',
    shareTypeSuffix: ' teilen',
    shareSubtitle: 'Öffentliche Dokumentdetails zu diesem Produkt ansehen.',
    noRecord: 'Nicht angegeben',
    documentFallback: 'Dokument',
    documentType: 'Dokumenttyp',
    product: 'Produkt',
    applicableModel: 'Gültiges Modell',
    company: 'Unternehmen',
    language: 'Sprache',
    fileSize: 'Dateigröße',
    uploaded: 'Hochgeladen',
    updated: 'Aktualisiert',
    publicStatus: 'Öffentlicher Status',
    certificateNo: 'Zertifikatsnummer',
    standard: 'Norm',
    issuer: 'Ausstellende Stelle',
    issueDate: 'Ausstellungsdatum',
    validUntil: 'Gültig bis',
  });
  const [documentData, setDocumentData] = useState(null);
  const [relatedDocs, setRelatedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportForm, setReportForm] = useState({ reportType: '', description: '', reporterName: '', reporterEmail: '' });
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportError, setReportError] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);

  useEffect(() => {
    if (!reportOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !reportSubmitting) setReportOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reportOpen, reportSubmitting]);

  useEffect(() => {
    let cancelled = false;
    async function loadDocument() {
      setLoading(true);
      setError('');
      try {
        const lang = encodeURIComponent(i18n.resolvedLanguage || i18n.language || 'zh');
        const response = await fetch(`/eu-doc/api/v2/documents/${id}?lang=${lang}`).then((res) => res.json());
        if (!response.success) throw new Error(ui.notFound);
        if (cancelled) return;
        setDocumentData(response.data);

        const productId = response.data?.product_id || response.data?.productId;
        if (productId) {
          const docsResponse = await fetch(`/eu-doc/api/v2/products/${productId}/documents?lang=${lang}`).then((res) => res.json());
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
  }, [id, i18n.language, i18n.resolvedLanguage, ui.notFound, ui.loadFailed]);

  const fileUrl = useMemo(() => getFileUrl(documentData), [documentData]);
  const downloadUrl = fileUrl ? `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}download=1` : '';
  const thumbUrl = useMemo(() => getThumbUrl(documentData), [documentData]);
  const certMeta = documentData?.certificate_metadata || documentData?.certificateMetadata || {};
  const typeLabel = documentTypeLabel(documentData || {}, i18n.language);
  const title = documentDisplayTitle(documentData || {}, i18n.language) || certMeta?.cert_no || documentData?.cert_no || `${typeLabel} ${id}`;
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
    if (normalizeDocType(doc) === 'certificate') return metaNo || documentDisplayTitle(doc, i18n.language) || `${documentTypeLabel(doc, i18n.language, 'short')} #${doc.id}`;
    return [lang, documentDisplayTitle(doc, i18n.language) || `${language === 'de' ? ui.documentFallback : isEn ? 'Document' : '资料'} #${doc.id}`].filter(Boolean).join(' · ');
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

  const openReport = () => {
    setReportForm({ reportType: '', description: '', reporterName: '', reporterEmail: '' });
    setReportSubmitted(false);
    setReportError('');
    setReportOpen(true);
  };

  const closeReport = () => {
    if (!reportSubmitting) setReportOpen(false);
  };

  const handleReportSubmit = async (event) => {
    event.preventDefault();
    setReportSubmitting(true);
    setReportError('');
    try {
      await api.submitDocumentReport(
        Number(id),
        reportForm.reportType,
        reportForm.description,
        reportForm.reporterEmail,
        reportForm.reporterName
      );
      setReportSubmitted(true);
    } catch (err) {
      setReportError(err.message || ui.reportFailed);
    } finally {
      setReportSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.statePage}><div className={styles.spinner} /><p>{ui.loading}</p></div>;
  }

  if (error || !documentData) {
    return (
      <div className={styles.statePage}>
        <p>{error || ui.notFound}</p>
        <button onClick={() => navigate(-1)}>{ui.back}</button>
      </div>
    );
  }

  const productName = localizedField({ name: documentData.product_name || documentData.productName, name_en: documentData.product_name_en || documentData.productNameEn }, 'name', i18n.language);
  const companyName = localizedField({ name: documentData.company_name || documentData.companyName, name_en: documentData.company_name_en || documentData.companyNameEn }, 'name', i18n.language);
  const heroFacts = [...new Set([
    productName,
    documentData.product_model || documentData.productModel,
    documentData.language ? String(documentData.language).toUpperCase() : null,
    documentPublicStatus,
  ].filter(Boolean))];
  const facts = [
    { label: language === 'de' ? ui.documentType : isEn ? 'Document type' : '资料类型', value: typeLabel },
    { label: language === 'de' ? ui.product : isEn ? 'Product' : '所属产品', value: productName },
    { label: language === 'de' ? ui.applicableModel : isEn ? 'Applicable model' : '适用型号', value: documentData.product_model || documentData.productModel },
    { label: language === 'de' ? ui.company : isEn ? 'Company' : '所属公司', value: companyName },
    { label: language === 'de' ? ui.language : isEn ? 'Language' : '语言', value: documentData.language ? String(documentData.language).toUpperCase() : ui.noRecord },
    { label: language === 'de' ? ui.fileSize : isEn ? 'File size' : '文件大小', value: formatSize(documentData.file_size || documentData.fileSize) || ui.noRecord },
    { label: language === 'de' ? ui.uploaded : isEn ? 'Uploaded' : '上传时间', value: formatDate(documentData.created_at || documentData.createdAt, i18n.language) },
    { label: language === 'de' ? ui.updated : isEn ? 'Updated' : '更新时间', value: formatDate(documentData.updated_at || documentData.updatedAt, i18n.language) },
    { label: language === 'de' ? ui.publicStatus : isEn ? 'Public status' : '公开状态', value: documentPublicStatus },
  ];

  const certificateFacts = normalizeDocType(documentData) === 'certificate' ? [
    { label: language === 'de' ? ui.certificateNo : isEn ? 'Certificate No.' : '证书编号', value: certMeta.cert_no || documentData.cert_no },
    { label: language === 'de' ? ui.standard : isEn ? 'Standard' : '认证标准', value: certMeta.standard || documentData.standard },
    { label: language === 'de' ? ui.issuer : isEn ? 'Issuer' : '发证机构', value: certMeta.issuer || documentData.issuer },
    { label: language === 'de' ? ui.issueDate : isEn ? 'Issue date' : '签发日期', value: formatDate(certMeta.issue_date || documentData.issue_date, i18n.language) },
    { label: language === 'de' ? ui.validUntil : isEn ? 'Valid until' : '有效期至', value: formatDate(certMeta.expiry_date || documentData.expiry_date, i18n.language) },
  ].filter((item) => item.value && item.value !== ui.noRecord) : [];

  return (
    <div className={styles.documentDetailPage}>
      <main className={styles.documentShell}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>← {ui.back}</button>

        <section className={styles.documentHero}>
          <div>
            <span className={styles.typeBadge}>{typeLabel}</span>
            <h1>{title}</h1>
            {heroFacts.length > 0 && <p>{heroFacts.join(' · ')}</p>}
          </div>
          <div className={styles.heroActions}>
            {fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer">{ui.openFile}</a>}
            {downloadUrl && <a href={downloadUrl} download>{ui.downloadFile}</a>}
            <button onClick={copyLink}>{ui.share}</button>
            <button onClick={handleFavorite}>{isFavorited ? ui.favorited : ui.favorite}</button>
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
              <div className={styles.reportBlock}>
                <p>{ui.sourceNotice}</p>
                <button type="button" onClick={openReport}>{ui.reportIssue}</button>
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
              isImage(fileUrl, documentData.mime_type || documentData.mimeType) ? <img src={fileUrl} alt={title} />
                : isPdf(fileUrl, documentData.mime_type || documentData.mimeType) ? <iframe src={fileUrl} title={title} />
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
        {reportOpen && (
          <div className={styles.reportOverlay} onMouseDown={(event) => event.target === event.currentTarget && closeReport()}>
            <section className={styles.reportDialog} role="dialog" aria-modal="true" aria-labelledby="document-report-title">
              <div className={styles.reportHeader}>
                <div>
                  <span>{typeLabel}</span>
                  <h2 id="document-report-title">{ui.reportTitle}</h2>
                </div>
                <button type="button" onClick={closeReport} aria-label={ui.close} disabled={reportSubmitting}>×</button>
              </div>

              {reportSubmitted ? (
                <div className={styles.reportSuccess}>
                  <strong>✓</strong>
                  <p>{ui.reportSuccess}</p>
                  <button type="button" onClick={closeReport}>{ui.close}</button>
                </div>
              ) : (
                <form className={styles.reportForm} onSubmit={handleReportSubmit}>
                  <p className={styles.reportIntro}>{ui.reportIntro}</p>
                  <label>
                    <span>{ui.issueType}</span>
                    <select
                      required
                      autoFocus
                      value={reportForm.reportType}
                      onChange={(event) => setReportForm((current) => ({ ...current, reportType: event.target.value }))}
                    >
                      <option value="">{ui.chooseIssue}</option>
                      <option value="outdated_info">{ui.issueOutdated}</option>
                      <option value="product_mismatch">{ui.issueMismatch}</option>
                      <option value="file_unavailable">{ui.issueUnavailable}</option>
                      <option value="wrong_info">{ui.issueContent}</option>
                      <option value="other">{ui.issueOther}</option>
                    </select>
                  </label>
                  <label>
                    <span>{ui.description}</span>
                    <textarea
                      rows="4"
                      maxLength="2000"
                      placeholder={ui.descriptionPlaceholder}
                      value={reportForm.description}
                      onChange={(event) => setReportForm((current) => ({ ...current, description: event.target.value }))}
                    />
                  </label>
                  <div className={styles.reportContactGrid}>
                    <label>
                      <span>{ui.reporterName}</span>
                      <input
                        maxLength="80"
                        value={reportForm.reporterName}
                        onChange={(event) => setReportForm((current) => ({ ...current, reporterName: event.target.value }))}
                      />
                    </label>
                    <label>
                      <span>{ui.reporterEmail}</span>
                      <input
                        type="email"
                        maxLength="254"
                        value={reportForm.reporterEmail}
                        onChange={(event) => setReportForm((current) => ({ ...current, reporterEmail: event.target.value }))}
                      />
                    </label>
                  </div>
                  {reportError && <p className={styles.reportError} role="alert">{reportError}</p>}
                  <div className={styles.reportActions}>
                    <button type="button" onClick={closeReport} disabled={reportSubmitting}>{ui.cancel}</button>
                    <button type="submit" disabled={reportSubmitting}>{reportSubmitting ? ui.submittingReport : ui.submitReport}</button>
                  </div>
                </form>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
