/**
 * EU-DOC 后台管理 - 仪表盘页
 * 版本: 1.1.0
 *
 * 变更记录 (1.1.0):
 * - 支持普通用户和管理员显示不同的仪表盘内容
 * - 普通用户显示个人证书统计和最近上传
 * - 管理员显示全局统计和认证标准分布
 *
 * 变更记录 (1.0.3):
 * - 添加完整的多语言支持
 *
 * 变更记录 (1.0.2):
 * - 待审核卡片可点击跳转到证书管理页（带 pending 筛选）
 *
 * 设计意图:
 * - 管理员：展示系统概览数据、认证标准分布、最近操作日志
 * - 普通用户：展示个人证书统计、最近上传的证书列表
 * - 页面加载时自动从后端获取数据
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../../contexts/AdminContext';
import * as api from '../../services/api';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { isAdmin } = useAdmin();
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        if (isAdmin) {
          // 管理员：获取全局统计和日志
          const statsPromise = api.getStats().then(data => setStats(data)).catch(() => {});
          const logsPromise = api.getRecentLogs().then(data => setLogs(data || [])).catch(() => {});
          await Promise.all([statsPromise, logsPromise]);
        } else {
          // 普通用户：获取个人统计
          const userStats = await api.getUserStats();
          setStats(userStats);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [isAdmin]);

  if (loading) {
    return <div className={styles.loading}>{t('admin.dashboardPage.loading')}</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  // 普通用户仪表盘
  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>{t('admin.dashboardPage.myDashboard')}</h1>

        {/* 用户统计卡片 */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statNumber}>{stats?.total || 0}</div>
              <div className={styles.statLabel}>{t('admin.dashboardPage.myTotalCerts')}</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statNumber}>{stats?.approved || 0}</div>
              <div className={styles.statLabel}>{t('admin.dashboardPage.approvedCerts')}</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#facc15' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statNumber}>{stats?.pending || 0}</div>
              <div className={styles.statLabel}>{t('admin.dashboardPage.myPendingReview')}</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statNumber}>{stats?.rejected || 0}</div>
              <div className={styles.statLabel}>{t('admin.dashboardPage.rejectedCerts')}</div>
            </div>
          </div>
        </div>

        {/* 最近上传的证书 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{t('admin.dashboardPage.myRecentUploads')}</h2>
            <Link to="/admin/certificates" className={styles.viewAll}>{t('search.viewAll')}</Link>
          </div>
          {stats?.recentUploads && stats.recentUploads.length > 0 ? (
            <div className={styles.certList}>
              {stats.recentUploads.map((cert) => (
                <Link key={cert.id} to={`/certificate/${cert.id}`} className={styles.certItem}>
                  <div className={styles.certInfo}>
                    <div className={styles.certName}>{cert.productName}</div>
                    <div className={styles.certMeta}>
                      <span className={styles.certNo}>{cert.certNo}</span>
                      <span className={styles.certDivider}>•</span>
                      <span className={styles.certCompany}>{cert.companyName || '-'}</span>
                    </div>
                  </div>
                  <div className={styles.certStatus}>
                    <span className={`${styles.badge} ${styles[cert.reviewStatus]}`}>
                      {t(`admin.dashboardPage.status.${cert.reviewStatus}`)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>{t('admin.dashboardPage.noUploads')}</div>
          )}
        </div>
      </div>
    );
  }

  // 管理员仪表盘（原有内容）
  // 认证标准分布数据（后端返回 standards 数组，转换为组件需要的格式）
  const categoryData = stats?.standards || [];

  // 找到最大值，用于计算条形图宽度比例
  const maxCategoryCount = Math.max(...categoryData.map(c => c.count), 1);

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>{t('admin.dashboardPage.title')}</h1>

      {/* 统计卡片 */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statNumber}>{stats?.total || 0}</div>
            <div className={styles.statLabel}>{t('admin.dashboardPage.totalCerts')}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statNumber}>{stats?.active || 0}</div>
            <div className={styles.statLabel}>{t('admin.dashboardPage.activeCerts')}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#facc15' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <Link to="/admin/certificates?reviewStatus=pending" className={styles.statInfo}>
            <div className={styles.statNumber}>{stats?.pending || 0}</div>
            <div className={styles.statLabel}>{t('admin.dashboardPage.pendingReview')}</div>
          </Link>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#a78bfa' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statNumber}>{stats?.companies || 0}</div>
            <div className={styles.statLabel}>{t('admin.dashboardPage.companiesCount')}</div>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* 认证标准分布 */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{t('admin.dashboardPage.standardDistribution')}</h2>
          {categoryData.length > 0 ? (
            <div className={styles.chart}>
              {categoryData.map((item) => (
                <div key={item.category} className={styles.chartRow}>
                  <span className={styles.chartLabel}>{item.category}</span>
                  <div className={styles.chartBarBg}>
                    <div
                      className={styles.chartBar}
                      style={{ width: `${(item.count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                  <span className={styles.chartCount}>{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>{t('admin.dashboardPage.noData')}</div>
          )}
        </div>

        {/* 最近操作日志 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{t('admin.dashboardPage.recentLogs')}</h2>
            <Link to="/admin/logs" className={styles.viewAll}>{t('search.viewAll')}</Link>
          </div>
          {logs.length > 0 ? (
            <div className={styles.logList}>
              {logs.slice(0, 8).map((log, i) => (
                <div key={i} className={styles.logItem}>
                  <div className={styles.logInfo}>
                    <span className={styles.logAction}>{log.action || log.type}</span>
                    <span className={styles.logTarget}>{log.target || log.detail || '-'}</span>
                  </div>
                  <span className={styles.logTime}>{log.time || log.createdAt || '-'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>{t('admin.dashboardPage.noLogs')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
