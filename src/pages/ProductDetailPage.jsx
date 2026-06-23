/**
 * EU-DOC v2.0 - 产品详情页面
 *
 * 功能:
 * - 显示产品详细信息
 * - 在页面内直接查看所有合规资料（证书、DoC、说明书）
 * - 三个 tab 分别展示不同类型的文档
 * - 支持文件预览和下载
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './ProductDetailPage.module.css';

function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('certificate');
  const [selectedCert, setSelectedCert] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  useEffect(() => {
    fetchProductDetail();
    fetchProductDocuments();
  }, [id]);

  const fetchProductDetail = async () => {
    try {
      const response = await fetch(`/eu-doc/api/v2/products/${id}`);
      const data = await response.json();

      if (data.success) {
        setProduct(data.data);
      } else {
        setError(data.message || '加载产品失败');
      }
    } catch (err) {
      console.error('获取产品详情失败:', err);
      setError('网络错误，请稍后重试');
    }
  };

  const fetchProductDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/eu-doc/api/v2/products/${id}/documents`);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.data);
        // 自动选择第一个证书
        const firstCert = data.data.find(d => d.document_type === 'certificate');
        if (firstCert) {
          setSelectedCert(firstCert);
        }
      }
    } catch (err) {
      console.error('获取产品文档失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 获取证书的详细元数据
  const getCertificateMetadata = async (certId) => {
    try {
      const response = await fetch(`/eu-doc/api/certificates/${certId}`);
      const data = await response.json();
      if (data.success) {
        // 映射字段名：将下划线命名转为驼峰命名
        const metadata = data.data;
        return {
          ...metadata,
          certNo: metadata.cert_no,
          issueDate: metadata.issue_date,
          expiryDate: metadata.expiry_date,
          filePath: metadata.file_path,
          thumbnailPath: metadata.thumbnail_path,
          reviewStatus: metadata.review_status,
          companyName: metadata.company_name,
          companyNameEn: metadata.company_name_en,
        };
      }
    } catch (err) {
      console.error('获取证书元数据失败:', err);
    }
    return null;
  };

  useEffect(() => {
    if (selectedCert && selectedCert.id && activeTab === 'certificate') {
      // 只在证书 Tab 激活且证书 ID 存在时获取元数据
      getCertificateMetadata(selectedCert.id).then(metadata => {
        if (metadata) {
          setSelectedCert(prev => {
            // 保留原有的 file_path，优先使用新获取的 filePath
            return {
              ...prev,
              ...metadata,
              filePath: metadata.filePath || prev.file_path || prev.filePath
            };
          });
        }
      });
    }
  }, [selectedCert?.id, activeTab]);

  const handleBack = () => {
    navigate('/products');
  };

  const getDocumentsByType = (type) => {
    return documents.filter(doc => doc.document_type === type);
  };

  const isImageFile = (filePath) => {
    if (!filePath) return false;
    const ext = filePath.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  };

  const isPdfFile = (filePath) => {
    if (!filePath) return false;
    return filePath.toLowerCase().endsWith('.pdf');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 渲染证书 tab
  const renderCertificateTab = () => {
    const certificates = getDocumentsByType('certificate');

    if (certificates.length === 0) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📜</div>
          <p>暂无资质证书</p>
        </div>
      );
    }

    return (
      <div className={styles.certTabContent}>
        {/* 顶部：证书选择 Tab */}
        {certificates.length > 0 && (
          <div className={styles.certTabs}>
            {certificates.map(cert => (
              <button
                key={cert.id}
                className={`${styles.certTab} ${selectedCert?.id === cert.id ? styles.certTabActive : ''}`}
                onClick={() => setSelectedCert(cert)}
              >
                📜 {cert.title || cert.cert_no || `证书 ${cert.id}`}
              </button>
            ))}
          </div>
        )}

        {/* 左右分栏：左侧证书信息，右侧预览 */}
        <div className={styles.certDetailContainer}>
          {selectedCert ? (
            <>
              {/* 左侧：证书信息 */}
              <div className={styles.certDetailLeft}>
                <h3 className={styles.certDetailTitle}>证书信息</h3>

                {/* 基本信息 */}
                <div className={styles.infoCard}>
                  <div className={styles.cardHeader}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span>基本信息</span>
                  </div>
                  <div className={styles.cardBody}>
                    {selectedCert.certNo && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>证书编号</span>
                        <span className={styles.infoValue}>{selectedCert.certNo}</span>
                      </div>
                    )}
                    {selectedCert.standard && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>标准</span>
                        <span className={styles.infoValue}>{selectedCert.standard}</span>
                      </div>
                    )}
                    {selectedCert.issuer && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>发证机构</span>
                        <span className={styles.infoValue}>{selectedCert.issuer}</span>
                      </div>
                    )}
                    {selectedCert.category && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>产品类别</span>
                        <span className={styles.infoValue}>{selectedCert.category}</span>
                      </div>
                    )}
                    {selectedCert.model && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>适用型号</span>
                        <div className={styles.modelGrid}>
                          {selectedCert.model.split(/[,，]\s*/).map((modelItem, index) => (
                            <div key={index} className={styles.modelTag}>
                              {modelItem.trim()}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 有效期信息 */}
                <div className={styles.infoCard}>
                  <div className={styles.cardHeader}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>有效期</span>
                  </div>
                  <div className={styles.cardBody}>
                    {selectedCert.issueDate && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>发证日期</span>
                        <span className={styles.infoValue}>{selectedCert.issueDate}</span>
                      </div>
                    )}
                    {selectedCert.expiryDate && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>到期日期</span>
                        <span className={styles.infoValue}>{selectedCert.expiryDate}</span>
                      </div>
                    )}
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>审核状态</span>
                      <span className={styles.infoValue}>
                        <span className={`${styles.statusBadge} ${styles[selectedCert.reviewStatus || 'pending']}`}>
                          {selectedCert.reviewStatus === 'approved' ? '✓ 已审核' :
                           selectedCert.reviewStatus === 'rejected' ? '✗ 已拒绝' : '⏳ 待审核'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className={styles.certActions}>
                  <button
                    className={styles.certActionBtnSecondary}
                    onClick={() => navigate(`/certificate/${selectedCert.id}`)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    打开完整详情页
                  </button>
                </div>
              </div>

              {/* 右侧：文件预览 */}
              <div className={styles.certDetailRight}>
                <h3 className={styles.certDetailTitle}>文件预览</h3>
                {selectedCert.filePath ? (
                  <div className={styles.previewContainer}>
                    {isImageFile(selectedCert.filePath) ? (
                      <img
                        src={`/eu-doc${selectedCert.filePath}`}
                        alt={selectedCert.title}
                        className={styles.previewImage}
                        onClick={() => window.open(`/eu-doc${selectedCert.filePath}`, '_blank')}
                      />
                    ) : isPdfFile(selectedCert.filePath) ? (
                      <iframe
                        src={`/eu-doc${selectedCert.filePath}`}
                        className={styles.previewPdf}
                        title={selectedCert.title}
                        onClick={() => window.open(`/eu-doc${selectedCert.filePath}`, '_blank')}
                      />
                    ) : (
                      <div className={styles.previewPlaceholder}>
                        <div className={styles.previewIcon}>📄</div>
                        <p>不支持预览此文件格式</p>
                        <a
                          href={`/eu-doc${selectedCert.filePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.previewLink}
                        >
                          点击查看原文件
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.previewPlaceholder}>
                    <div className={styles.previewIcon}>📄</div>
                    <p>该证书暂无文件</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>请选择一个证书</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染 DoC tab
  const renderDocTab = () => {
    const docs = getDocumentsByType('declaration_of_conformity');

    if (docs.length === 0) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <p>暂无 DoC 声明文件</p>
          <p className={styles.emptyHint}>DoC (Declaration of Conformity) 即符合性声明文件</p>
        </div>
      );
    }

    // 按语言分组
    const docsByLanguage = docs.reduce((acc, doc) => {
      const lang = doc.language || 'en';
      if (!acc[lang]) acc[lang] = [];
      acc[lang].push(doc);
      return acc;
    }, {});

    const languages = Object.keys(docsByLanguage);
    const currentDoc = docsByLanguage[selectedLanguage]?.[0] || docs[0];

    return (
      <div className={styles.docTabContent}>
        {languages.length > 1 && (
          <div className={styles.languageSwitcher}>
            {languages.map(lang => (
              <button
                key={lang}
                className={`${styles.langBtn} ${selectedLanguage === lang ? styles.langBtnActive : ''}`}
                onClick={() => setSelectedLanguage(lang)}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        <div className={styles.docPreview}>
          {currentDoc?.file_path ? (
            <>
              {isImageFile(currentDoc.file_path) ? (
                <img
                  src={`/eu-doc${currentDoc.file_path}`}
                  alt={currentDoc.title}
                  className={styles.docPreviewImage}
                  onClick={() => window.open(`/eu-doc${currentDoc.file_path}`, '_blank')}
                />
              ) : isPdfFile(currentDoc.file_path) ? (
                <iframe
                  src={`/eu-doc${currentDoc.file_path}`}
                  className={styles.docPreviewPdf}
                  title={currentDoc.title}
                />
              ) : (
                <div className={styles.docPreviewPlaceholder}>
                  <div className={styles.docPreviewIcon}>📋</div>
                  <p>{currentDoc.title}</p>
                  <a
                    href={`/eu-doc${currentDoc.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.docPreviewLink}
                  >
                    点击查看原文件
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className={styles.docPreviewPlaceholder}>
              <div className={styles.docPreviewIcon}>📋</div>
              <p>该文档暂无文件</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染说明书 tab
  const renderManualTab = () => {
    const manuals = getDocumentsByType('manual');

    if (manuals.length === 0) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📖</div>
          <p>暂无使用说明书</p>
          <p className={styles.emptyHint}>产品使用说明书将在此处展示</p>
        </div>
      );
    }

    // 按语言或版本分组
    const manualsByLang = manuals.reduce((acc, doc) => {
      const lang = doc.language || doc.version || 'default';
      if (!acc[lang]) acc[lang] = [];
      acc[lang].push(doc);
      return acc;
    }, {});

    const versions = Object.keys(manualsByLang);
    const currentManual = manualsByLang[selectedLanguage]?.[0] || manuals[0];

    return (
      <div className={styles.manualTabContent}>
        {versions.length > 1 && (
          <div className={styles.versionSwitcher}>
            {versions.map(ver => (
              <button
                key={ver}
                className={`${styles.verBtn} ${selectedLanguage === ver ? styles.verBtnActive : ''}`}
                onClick={() => setSelectedLanguage(ver)}
              >
                {ver.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        <div className={styles.manualPreview}>
          {currentManual?.file_path ? (
            <>
              {isImageFile(currentManual.file_path) ? (
                <img
                  src={`/eu-doc${currentManual.file_path}`}
                  alt={currentManual.title}
                  className={styles.manualPreviewImage}
                  onClick={() => window.open(`/eu-doc${currentManual.file_path}`, '_blank')}
                />
              ) : isPdfFile(currentManual.file_path) ? (
                <iframe
                  src={`/eu-doc${currentManual.file_path}`}
                  className={styles.manualPreviewPdf}
                  title={currentManual.title}
                />
              ) : (
                <div className={styles.manualPreviewPlaceholder}>
                  <div className={styles.manualPreviewIcon}>📖</div>
                  <p>{currentManual.title}</p>
                  <a
                    href={`/eu-doc${currentManual.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.manualPreviewLink}
                  >
                    点击查看原文件
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className={styles.manualPreviewPlaceholder}>
              <div className={styles.manualPreviewIcon}>📖</div>
              <p>该说明书暂无文件</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>⚠️ {error}</p>
        <button onClick={handleBack} className={styles.backButton}>
          返回列表
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.error}>
        <p>产品不存在</p>
        <button onClick={handleBack} className={styles.backButton}>
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 返回按钮 */}
      <button onClick={handleBack} className={styles.backButton}>
        ← 返回产品列表
      </button>

      {/* 产品信息卡片 */}
      <div className={styles.productCard}>
        <div className={styles.productHeader}>
          <div>
            <h1 className={styles.productName}>{product.name}</h1>
            {product.name_en && (
              <div className={styles.productNameEn}>{product.name_en}</div>
            )}
            {product.model && (
              <div className={styles.productModel}>型号: {product.model}</div>
            )}
          </div>
          <div className={styles.statusBadge}>
            {product.status === 'active' ? '✓ 有效' : '✗ 无效'}
          </div>
        </div>

        <div className={styles.productInfo}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>所属企业</span>
            <span className={styles.infoValue}>{product.company_name}</span>
          </div>

          {product.company_name_en && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>企业英文名</span>
              <span className={styles.infoValue}>{product.company_name_en}</span>
            </div>
          )}
        </div>

        {/* 标签 */}
        {product.tags && product.tags.length > 0 && (
          <div className={styles.tagsSection}>
            <h3 className={styles.sectionTitle}>产品标签</h3>
            <div className={styles.tags}>
              {product.tags.map(tag => (
                <span key={tag.id} className={styles.tag}>
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 资料中心 */}
      <div className={styles.resourceCenter}>
        <h2 className={styles.resourceTitle}>资料中心</h2>

        {/* Tab 导航 */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'certificate' ? styles.tabActive : ''}`}
            onClick={() => {
              setActiveTab('certificate');
              const firstCert = getDocumentsByType('certificate')[0];
              if (firstCert) setSelectedCert(firstCert);
            }}
          >
            📜 资质证书 ({getDocumentsByType('certificate').length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'doc' ? styles.tabActive : ''}`}
            onClick={() => {
              setActiveTab('doc');
              setSelectedLanguage('en');
            }}
          >
            📋 DoC 声明文件 ({getDocumentsByType('declaration_of_conformity').length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'manual' ? styles.tabActive : ''}`}
            onClick={() => {
              setActiveTab('manual');
              setSelectedLanguage('en');
            }}
          >
            📖 使用说明书 ({getDocumentsByType('manual').length})
          </button>
        </div>

        {/* Tab 内容 */}
        <div className={styles.tabContent}>
          {activeTab === 'certificate' && renderCertificateTab()}
          {activeTab === 'doc' && renderDocTab()}
          {activeTab === 'manual' && renderManualTab()}
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
