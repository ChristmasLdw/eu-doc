/**
 * EU-DOC 后台管理 - 团队成员页面
 */

import { useState, useEffect } from 'react';
import styles from './CertificatesPage.module.css';

export default function TeamMembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      // 获取用户的企业ID（简化处理，使用第一个企业）
      const companiesRes = await fetch('/eu-doc/api/companies?pageSize=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const companiesData = await companiesRes.json();
      
      if (companiesData.success && companiesData.data.length > 0) {
        const companyId = companiesData.data[0].id;
        const res = await fetch(`/eu-doc/api/v2/company-members?company_id=${companyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setMembers(data.data);
      }
    } catch (err) {
      console.error('获取成员列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    setError('');
    if (!inviteEmail) {
      setError('请输入邮箱');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const companiesRes = await fetch('/eu-doc/api/companies?pageSize=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const companiesData = await companiesRes.json();
      
      if (companiesData.success && companiesData.data.length > 0) {
        const companyId = companiesData.data[0].id;
        const res = await fetch('/eu-doc/api/v2/company-members/invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            company_id: companyId,
            email: inviteEmail,
            role: inviteRole
          })
        });
        const data = await res.json();

        if (data.success) {
          alert('成员添加成功');
          setShowInviteModal(false);
          setInviteEmail('');
          fetchMembers();
        } else {
          setError(data.message || '邀请失败');
        }
      }
    } catch (err) {
      console.error('邀请失败:', err);
      setError('邀请失败');
    }
  };

  const handleRemoveMember = async (memberId, displayName) => {
    if (!confirm(`确定要移除成员 "${displayName}" 吗？`)) return;

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/eu-doc/api/v2/company-members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        fetchMembers();
      } else {
        alert(data.message || '移除失败');
      }
    } catch (err) {
      console.error('移除失败:', err);
      alert('移除失败');
    }
  };

  const getRoleName = (role) => {
    const roleMap = {
      'owner': '所有者',
      'admin': '管理员',
      'uploader': '上传者',
      'viewer': '查看者'
    };
    return roleMap[role] || role;
  };

  const getRoleDescription = (role) => {
    const descMap = {
      'owner': '拥有所有权限',
      'admin': '管理产品和文档',
      'uploader': '只能上传文档',
      'viewer': '只能查看'
    };
    return descMap[role] || '';
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>团队成员</h1>
        <button className={styles.addBtn} onClick={() => setShowInviteModal(true)}>
          + 邀请成员
        </button>
      </div>

      {/* 角色说明 */}
      <div style={{ 
        padding: '16px', 
        background: 'var(--bg-card)', 
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
          角色权限说明
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {['owner', 'admin', 'uploader', 'viewer'].map(role => (
            <div key={role} style={{ fontSize: '13px' }}>
              <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{getRoleName(role)}</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>- {getRoleDescription(role)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 成员列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>加载中...</div>
      ) : members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>暂无成员</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>用户</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>加入时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id}>
                  <td>{member.display_name || '-'}</td>
                  <td>{member.email}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px',
                      background: member.role === 'owner' ? 'rgba(168, 85, 247, 0.1)' : 
                                  member.role === 'admin' ? 'rgba(59, 130, 246, 0.1)' :
                                  member.role === 'uploader' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                      color: member.role === 'owner' ? '#a855f7' :
                             member.role === 'admin' ? '#3b82f6' :
                             member.role === 'uploader' ? '#22c55e' : '#eab308',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {getRoleName(member.role)}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(member.joined_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {member.role !== 'owner' && (
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleRemoveMember(member.id, member.display_name || member.email)}
                        >
                          移除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 邀请成员模态框 */}
      {showInviteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowInviteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>邀请成员</h2>
              <button className={styles.closeBtn} onClick={() => setShowInviteModal(false)}>✕</button>
            </div>
            <div className={styles.modalForm}>
              {error && <div className={styles.formError}>{error}</div>}
              <div className={styles.formGrid}>
                <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                  <label>邮箱</label>
                  <input
                    type="email"
                    placeholder="输入用户邮箱"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                  <label>角色</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                    <option value="viewer">查看者 - 只能查看</option>
                    <option value="uploader">上传者 - 可以上传文档</option>
                    <option value="admin">管理员 - 可以管理产品和文档</option>
                  </select>
                </div>
              </div>
              <div className={styles.formActions}>
                <button className={styles.cancelBtn} onClick={() => setShowInviteModal(false)}>取消</button>
                <button className={styles.submitBtn} onClick={handleInvite}>确认添加</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
