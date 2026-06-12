/**
 * EU-DOC 后台管理 - 仪表盘页
 * 版本: 1.0.2
 *
 * 变更记录 (1.0.2):
 * - 待审核卡片可点击跳转到证书管理页（带 pending 筛选）
 *
 * 设计意图:
 * - 展示系统概览数据：证书总数、有效证书、待审核、企业数量
 * - 认证标准分布（CSS 水平条形图）
 * - 最近操作日志列表
 * - 页面加载时自动从后端获取数据
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../services/api';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        // 两个请求独立处理，互不影响
        const statsPromise = api.getStats().then(data => setStats(data)).catch(() => {});
        const logsPromise = api.getRecentLogs().then(data => setLogs(data || [])).catch(() => {});
        await Promise.all([statsPromise, logsPromise]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className={styles.loading}>加载数据中...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  // 认证标准分布数据（后端返回 standards 数组，转换为组件需要的格式）
  const categoryData = stats?.standards || [];

  // 找到最大值，用于计算条形图宽度比例
  const maxCategoryCount = Math.max(...categoryData.map(c => c.count), 1);

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>仪表盘</h1>

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
            <div className={styles.statLabel}>证书总数</div>
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
            <div className={styles.statLabel}>有效证书</div>
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
            <div className={styles.statLabel}>待审核</div>
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
            <div className={styles.statLabel}>企业数量</div>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* 认证标准分布 */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>认证标准分布</h2>
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
            <div className={styles.empty}>暂无数据</div>
          )}
        </div>

        {/* 最近操作日志 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>最近操作</h2>
            <Link to="/admin/logs" className={styles.viewAll}>查看全部</Link>
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
            <div className={styles.empty}>暂无操作记录</div>
          )}
        </div>
      </div>
    </div>
  );
}
