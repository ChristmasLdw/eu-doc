/**
 * EU-DOC 后台管理 - 操作日志页
 * 版本: 1.0.2
 *
 * 变更记录 (1.0.2):
 * - 添加完整的多语言支持
 *
 * 设计意图:
 * - 展示系统操作日志，便于审计和追踪
 * - 简洁的表格展示：时间、管理员、操作类型、目标、详情
 * - 从后端获取日志数据
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as api from '../../services/api';
import styles from './LogsPage.module.css';

export default function LogsPage() {
  const { t } = useTranslation();
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
      <h1 className={styles.pageTitle}>{t('admin.logsPage.title')}</h1>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('admin.logsPage.time')}</th>
              <th>{t('admin.logsPage.admin')}</th>
              <th>{t('admin.logsPage.action')}</th>
              <th>{t('admin.logsPage.target')}</th>
              <th>{t('admin.logsPage.detail')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className={styles.emptyCell}>{t('admin.logsPage.loading')}</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="5" className={styles.emptyCell}>{error}</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="5" className={styles.emptyCell}>{t('admin.logsPage.noLogs')}</td>
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
