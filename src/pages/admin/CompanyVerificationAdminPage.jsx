/**
 * EU-DOC 后台管理 - 企业认证审核页面
 * 管理员查看和审核企业认证申请
 */

import { useState, useEffect } from 'react';
import styles from './CompanyVerificationAdminPage.module.css';

export default function CompanyVerificationAdminPage() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending / all
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetchVerifications();
  }, [filter]);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/eu-doc/api/v2/companies/verifications?status=${filter === 'all' ? '' : filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setVerifications(data.data);
      }
    } catch (err) {
      console.error('获取认证列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (companyId, action) => {
    if (!reviewNote.trim() && action === 'rejected') {
      alert('拒绝时必须填写拒绝原因');
      return;
    }

    setReviewing(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/eu-doc/api/v2/companies/${companyId}/verification`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action, // 'approve' or 'reject'
          note: reviewNote.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(action === 'approve' ? '认证已通过' : '认证已拒绝');
        setSelectedVerification(null);
        setReviewNote('');
        fetchVerifications();
      } else {
        alert(data.message || '操作失败');
      }
    } catch (err) {
      alert('操作失败，请稍后重试');
    } finally {
      setReviewing(false);
    }
  };

  const openModal = (verification) => {
    setSelectedVerification(verification);
    setReviewNote('');
  };

  const closeModal = () => {
    setSelectedVerification(null);
    setReviewNote('');
  };

  const getStatusBadge = (status) => {
    const badges = {
      unverified: { text: '未认证', color: '#a0aec0' },
      pending: { text: '待审核', color: '#ed8936' },
      verified: { text: '已认证', color: '#48bb78' },
      rejected: { text: '已拒绝', color: '#f56565' },
    };
    const badge = badges[status] || badges.unverified;
    return <span className={styles.badge} style={{ background: badge.color }}>{badge.text}</span>;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>企业认证审核</h1>
          <p className={styles.subtitle}>审核企业提交的认证资料</p>
        </div>
      </div>

      {/* 筛选器 */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${filter === 'pending' ? styles.filterActive : ''}`}
          onClick={() => setFilter('pending')}
        >
          待审核
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.filterActive : ''}`}
          onClick={() => setFilter('all')}
        >
          全部
        </button>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : verifications.length === 0 ? (
        <div className={styles.empty}>暂无认证申请</div>
      ) : (
        <div className={styles.list}>
          {verifications.map((item) => (
            <div key={item.company_id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.companyName}>{item.company_name}</h3>
                  <p className={styles.companyInfo}>申请时间: {new Date(item.created_at).toLocaleString('zh-CN')}</p>
                </div>
                {getStatusBadge(item.verification_status)}
              </div>

              <div className={styles.cardBody}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>营业执照号:</span>
                  <span className={styles.infoValue}>{item.business_license_no || '未填写'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>联系人:</span>
                  <span className={styles.infoValue}>{item.contact_person || '未填写'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>联系邮箱:</span>
                  <span className={styles.infoValue}>{item.contact_email || '未填写'}</span>
                </div>
              </div>

              <div className={styles.cardActions}>
                <button
                  className={styles.viewBtn}
                  onClick={() => openModal(item)}
                >
                  查看资料
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 审核弹窗 */}
      {selectedVerification && (
        <div className={styles.modal} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>审核企业认证 - {selectedVerification.company_name}</h2>
              <button className={styles.closeBtn} onClick={closeModal}>×</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.section}>
                <h3>企业信息</h3>
                <div className={styles.infoGrid}>
                  <div>
                    <span className={styles.infoLabel}>企业名称:</span>
                    <span>{selectedVerification.company_name}</span>
                  </div>
                  <div>
                    <span className={styles.infoLabel}>营业执照号:</span>
                    <span>{selectedVerification.business_license_no || '未填写'}</span>
                  </div>
                  <div>
                    <span className={styles.infoLabel}>联系人:</span>
                    <span>{selectedVerification.contact_person || '未填写'}</span>
                  </div>
                  <div>
                    <span className={styles.infoLabel}>联系邮箱:</span>
                    <span>{selectedVerification.contact_email || '未填写'}</span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3>认证文件</h3>
                <p className={styles.hint}>文件已上传到服务器，需要管理员下载查看</p>
              </div>

              {selectedVerification.verification_status === 'pending' && (
                <div className={styles.section}>
                  <h3>审核意见</h3>
                  <textarea
                    className={styles.textarea}
                    placeholder="填写审核意见（拒绝时必填）..."
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={4}
                  />
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              {selectedVerification.verification_status === 'pending' && (
                <>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => handleReview(selectedVerification.company_id, 'reject')}
                    disabled={reviewing}
                  >
                    拒绝
                  </button>
                  <button
                    className={styles.approveBtn}
                    onClick={() => handleReview(selectedVerification.company_id, 'approve')}
                    disabled={reviewing}
                  >
                    {reviewing ? '处理中...' : '通过'}
                  </button>
                </>
              )}
              <button className={styles.cancelBtn} onClick={closeModal}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
