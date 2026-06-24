/**
 * EU-DOC 后台管理 - 个人设置页面
 * 修改密码、个人信息等
 */

import { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const { admin } = useAdmin();
  const [activeTab, setActiveTab] = useState('password');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }

    if (newPassword.length < 6) {
      setError('新密码长度不能少于6位');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/eu-doc/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('密码修改成功');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.message || '修改失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>个人设置</h1>
        <p className={styles.subtitle}>管理您的账号设置</p>
      </div>

      <div className={styles.container}>
        {/* 侧边栏 */}
        <div className={styles.sidebar}>
          <button
            className={`${styles.tab} ${activeTab === 'password' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            修改密码
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'profile' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            个人信息
          </button>
        </div>

        {/* 内容区 */}
        <div className={styles.content}>
          {activeTab === 'password' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>修改密码</h2>
              <p className={styles.sectionDesc}>为了账号安全，建议定期修改密码</p>

              <form className={styles.form} onSubmit={handlePasswordChange}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="oldPassword">原密码</label>
                  <input
                    id="oldPassword"
                    type="password"
                    className={styles.input}
                    placeholder="请输入原密码"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="newPassword">新密码</label>
                  <input
                    id="newPassword"
                    type="password"
                    className={styles.input}
                    placeholder="至少6位"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="confirmPassword">确认新密码</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className={styles.input}
                    placeholder="再次输入新密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                {error && (
                  <div className={styles.error}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {error}
                  </div>
                )}

                {success && (
                  <div className={styles.success}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    {success}
                  </div>
                )}

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? '修改中...' : '确认修改'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>个人信息</h2>
              <div className={styles.infoCard}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>邮箱</span>
                  <span className={styles.infoValue}>{admin?.email || '未设置'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>显示名称</span>
                  <span className={styles.infoValue}>{admin?.display_name || '未设置'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>角色</span>
                  <span className={styles.infoValue}>
                    {admin?.role === 'platform_admin' ? '平台管理员' : '普通用户'}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>邮箱验证状态</span>
                  <span className={styles.infoValue}>
                    {admin?.email_verified ? (
                      <span style={{ color: '#48bb78' }}>✓ 已验证</span>
                    ) : (
                      <span style={{ color: '#f56565' }}>✗ 未验证</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
