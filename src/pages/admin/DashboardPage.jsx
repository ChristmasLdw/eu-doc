/**
 * EU-DOC 后台管理 - 仪表盘 v2.1
 * 企业所有者视角：快捷操作 + 统计概览
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { admin } = useAdmin();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ products: 0, documents: 0, members: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      
      // 获取产品数量
      const productsRes = await fetch('/eu-doc/api/v2/products?pageSize=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const productsData = await productsRes.json();

      // 获取资料数量
      const docsRes = await fetch('/eu-doc/api/v2/documents?pageSize=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const docsData = await docsRes.json();

      setStats({
        products: productsData.pagination?.total || 0,
        documents: docsData.pagination?.total || 0,
        members: 1, // 暂时固定
      });
    } catch (err) {
      console.error('获取统计失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* 欢迎信息 */}
      <div className={styles.welcome}>
        <h1>欢迎回来，{admin?.display_name || '用户'}</h1>
        <p>这是您的企业管理后台</p>
      </div>

      {/* 快捷操作 */}
      <div className={styles.quickActions}>
        <h2>快捷操作</h2>
        <div className={styles.actionsGrid}>
          <button className={styles.actionCard} onClick={() => navigate('/admin/products/create')}>
            <div className={styles.actionIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <span>创建产品</span>
          </button>

          <button className={styles.actionCard} onClick={() => navigate('/admin/documents')}>
            <div className={styles.actionIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span>上传资料</span>
          </button>

          <button className={styles.actionCard} onClick={() => navigate('/admin/members')}>
            <div className={styles.actionIcon} style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <span>邀请成员</span>
          </button>

          <button className={styles.actionCard} onClick={() => navigate('/')}>
            <div className={styles.actionIcon} style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <span>前台查看</span>
          </button>
        </div>
      </div>

      {/* 数据概览 */}
      <div className={styles.overview}>
        <h2>数据概览</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{loading ? '-' : stats.products}</div>
            <div className={styles.statLabel}>产品数量</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{loading ? '-' : stats.documents}</div>
            <div className={styles.statLabel}>资料数量</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{loading ? '-' : stats.members}</div>
            <div className={styles.statLabel}>团队成员</div>
          </div>
        </div>
      </div>

      {/* 常用功能 */}
      <div className={styles.shortcuts}>
        <h2>常用功能</h2>
        <div className={styles.linksGrid}>
          <Link to="/admin/products" className={styles.linkCard}>
            <span>产品管理</span>
            <span className={styles.linkArrow}>→</span>
          </Link>
          <Link to="/admin/documents" className={styles.linkCard}>
            <span>资料管理</span>
            <span className={styles.linkArrow}>→</span>
          </Link>
          <Link to="/admin/company" className={styles.linkCard}>
            <span>企业信息</span>
            <span className={styles.linkArrow}>→</span>
          </Link>
          <Link to="/admin/members" className={styles.linkCard}>
            <span>团队成员</span>
            <span className={styles.linkArrow}>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
