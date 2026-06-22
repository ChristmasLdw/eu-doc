/**
 * EU-DOC v2.0 - 产品详情页面
 *
 * 功能:
 * - 显示产品详细信息
 * - 显示产品关联的所有文档
 * - 显示产品标签
 * - 支持返回列表
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './ProductDetailPage.module.css';

function ProductDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      }
    } catch (err) {
      console.error('获取产品文档失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/products');
  };

  const handleViewDocument = (docId) => {
    navigate(`/certificate/${docId}`);
  };

  const getDocumentTypeName = (type) => {
    const typeMap = {
      'certificate': '证书',
      'declaration_of_conformity': 'DoC声明',
      'manual': '说明书',
      'test_report': '测试报告',
      'other': '其他'
    };
    return typeMap[type] || type;
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

          {product.category_name && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>产品分类</span>
              <span className={styles.infoValue}>{product.category_name}</span>
            </div>
          )}

          {product.description && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>产品描述</span>
              <span className={styles.infoValue}>{product.description}</span>
            </div>
          )}

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>创建时间</span>
            <span className={styles.infoValue}>
              {new Date(product.created_at).toLocaleString('zh-CN')}
            </span>
          </div>

          {product.created_by_name && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>创建人</span>
              <span className={styles.infoValue}>{product.created_by_name}</span>
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

      {/* 文档列表 */}
      <div className={styles.documentsSection}>
        <h2 className={styles.sectionTitle}>
          产品文档 ({documents.length})
        </h2>

        {documents.length === 0 ? (
          <div className={styles.emptyDocuments}>
            <p>📄 该产品暂无文档</p>
          </div>
        ) : (
          <div className={styles.documentsList}>
            {documents.map(doc => (
              <div
                key={doc.id}
                className={styles.documentCard}
                onClick={() => handleViewDocument(doc.id)}
              >
                <div className={styles.docIcon}>
                  {doc.document_type === 'certificate' ? '📜' : '📄'}
                </div>
                <div className={styles.docInfo}>
                  <div className={styles.docTitle}>{doc.title}</div>
                  <div className={styles.docMeta}>
                    <span className={styles.docType}>
                      {getDocumentTypeName(doc.document_type)}
                    </span>
                    {doc.cert_no && (
                      <span className={styles.docCertNo}>
                        证书编号: {doc.cert_no}
                      </span>
                    )}
                    <span className={styles.docDate}>
                      {new Date(doc.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
                <div className={styles.docArrow}>→</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductDetailPage;
