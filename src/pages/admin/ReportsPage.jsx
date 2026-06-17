/**
 * EU-DOC 管理后台 - 错误报告管理页面
 * 版本: 1.0.0
 *
 * 功能:
 * - 查看所有用户提交的证书错误报告
 * - 按状态筛选报告
 * - 处理报告（标记为处理中/已解决/已拒绝）
 * - 添加管理员回复
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getReports, updateReportStatus } from '../../services/api';
import styles from './ReportsPage.module.css';

export default function ReportsPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [adminResponse, setAdminResponse] = useState('');
  const [updating, setUpdating] = useState(false);

  // 加载报告列表
  const loadReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const response = await getReports(params);
      setReports(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [filterStatus]);

  // 查看报告详情
  const handleViewReport = (report) => {
    setSelectedReport(report);
    setNewStatus(report.status);
    setAdminResponse(report.adminResponse || '');
    setShowDetailModal(true);
  };

  // 更新报告状态
  const handleUpdateStatus = async () => {
    if (!selectedReport || !newStatus) return;

    setUpdating(true);
    try {
      await updateReportStatus(selectedReport.id, newStatus, adminResponse);
      alert('状态更新成功');
      setShowDetailModal(false);
      loadReports();
    } catch (err) {
      alert('更新失败：' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // 获取状态标签样式
  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: '待处理', color: 'orange' },
      processing: { label: '处理中', color: 'blue' },
      resolved: { label: '已解决', color: 'green' },
      rejected: { label: '已拒绝', color: 'red' },
    };
    const badge = badges[status] || badges.pending;
    return <span className={`${styles.statusBadge} ${styles[badge.color]}`}>{badge.label}</span>;
  };

  // 获取报告类型标签
  const getReportTypeLabel = (type) => {
    const labels = {
      wrong_info: '信息有误',
      outdated_info: '信息过时',
      duplicate_entry: '重复录入',
      other: '其他问题',
    };
    return labels[type] || type;
  };

  // 格式化日期
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  if (loading && reports.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>加载中...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>错误报告管理</h1>
          <p className={styles.subtitle}>查看和处理用户提交的证书信息问题</p>
        </div>

        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="processing">处理中</option>
            <option value="resolved">已解决</option>
            <option value="rejected">已拒绝</option>
          </select>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          <p>加载失败：{error}</p>
        </div>
      )}

      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>待处理</div>
          <div className={styles.statValue}>
            {reports.filter((r) => r.status === 'pending').length}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>处理中</div>
          <div className={styles.statValue}>
            {reports.filter((r) => r.status === 'processing').length}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>已解决</div>
          <div className={styles.statValue}>
            {reports.filter((r) => r.status === 'resolved').length}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>已拒绝</div>
          <div className={styles.statValue}>
            {reports.filter((r) => r.status === 'rejected').length}
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>证书信息</th>
              <th>问题类型</th>
              <th>报告人</th>
              <th>状态</th>
              <th>提交时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.emptyRow}>
                  暂无报告记录
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.id}</td>
                  <td>
                    <div className={styles.certInfo}>
                      <div className={styles.certNo}>{report.certNo}</div>
                      <div className={styles.certName}>{report.productName}</div>
                      <div className={styles.companyName}>{report.companyName}</div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.typeLabel}>{getReportTypeLabel(report.reportType)}</span>
                  </td>
                  <td>
                    <div className={styles.reporterInfo}>
                      {report.reporterName || '匿名用户'}
                      {report.reporterEmail && (
                        <div className={styles.reporterEmail}>{report.reporterEmail}</div>
                      )}
                    </div>
                  </td>
                  <td>{getStatusBadge(report.status)}</td>
                  <td>{formatDate(report.createdAt)}</td>
                  <td>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleViewReport(report)}
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 详情模态框 */}
      {showDetailModal && selectedReport && (
        <div className={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>报告详情 #{selectedReport.id}</h3>
              <button className={styles.modalClose} onClick={() => setShowDetailModal(false)}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailSection}>
                <h4>证书信息</h4>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>证书编号</span>
                    <span className={styles.detailValue}>{selectedReport.certNo}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>产品名称</span>
                    <span className={styles.detailValue}>{selectedReport.productName}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>企业名称</span>
                    <span className={styles.detailValue}>{selectedReport.companyName}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>问题类型</span>
                    <span className={styles.detailValue}>
                      {getReportTypeLabel(selectedReport.reportType)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedReport.description && (
                <div className={styles.detailSection}>
                  <h4>问题描述</h4>
                  <p className={styles.description}>{selectedReport.description}</p>
                </div>
              )}

              <div className={styles.detailSection}>
                <h4>报告人信息</h4>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>姓名</span>
                    <span className={styles.detailValue}>
                      {selectedReport.reporterName || '未提供'}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>邮箱</span>
                    <span className={styles.detailValue}>
                      {selectedReport.reporterEmail || '未提供'}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>提交时间</span>
                    <span className={styles.detailValue}>
                      {formatDate(selectedReport.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.detailSection}>
                <h4>处理状态</h4>
                <select
                  className={styles.statusSelect}
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="pending">待处理</option>
                  <option value="processing">处理中</option>
                  <option value="resolved">已解决</option>
                  <option value="rejected">已拒绝</option>
                </select>
              </div>

              <div className={styles.detailSection}>
                <h4>管理员回复</h4>
                <textarea
                  className={styles.responseTextarea}
                  placeholder="添加处理说明或回复内容..."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows="4"
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setShowDetailModal(false)}
                  disabled={updating}
                >
                  取消
                </button>
                <button
                  className={styles.saveButton}
                  onClick={handleUpdateStatus}
                  disabled={updating}
                >
                  {updating ? '保存中...' : '保存更改'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
