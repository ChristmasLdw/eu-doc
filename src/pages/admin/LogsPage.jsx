/**
 * EU-DOC 后台管理 - 操作日志页
 * 版本: 1.0.1
 *
 * 设计意图:
 * - 展示系统操作日志，便于审计和追踪
 * - 简洁的表格展示：时间、管理员、操作类型、目标、详情
 * - 从后端获取日志数据
 */

import { useState, useEffect } from 'react';
import * as api from '../../services/api';
import styles from './LogsPage.module.css';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      try {
        const data = await api.getRecentLogs();
        setLogs(data.data || data.logs || data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>操作日志</h1>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>时间</th>
              <th>管理员</th>
              <th>操作类型</th>
              <th>目标</th>
              <th>详情</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className={styles.emptyCell}>加载中...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="5" className={styles.emptyCell}>{error}</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="5" className={styles.emptyCell}>暂无操作记录</td>
              </tr>
            ) : (
              logs.map((log, i) => (
                <tr key={log.id || i}>
                  <td className={styles.timeCell}>
                    {log.time || log.createdAt || '-'}
                  </td>
                  <td className={styles.adminCell}>
                    {log.admin || log.username || '-'}
                  </td>
                  <td>
                    <span className={styles.actionBadge}>
                      {log.action || log.type || '-'}
                    </span>
                  </td>
                  <td>{log.target || '-'}</td>
                  <td className={styles.detailCell}>
                    {log.detail || log.description || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
