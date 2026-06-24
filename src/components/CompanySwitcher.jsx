/**
 * EU-DOC - 企业切换组件
 * 显示在导航栏，允许用户在多个企业之间切换
 */

import { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import styles from './CompanySwitcher.module.css';

export default function CompanySwitcher() {
  const { admin } = useAdmin();
  const [companies, setCompanies] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (admin) {
      fetchCompanies();
    }
  }, [admin]);

  useEffect(() => {
    // 点击外部关闭下拉菜单
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/eu-doc/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.user.companies) {
        setCompanies(data.user.companies);

        // 从 localStorage 获取当前选中的企业
        const savedCompanyId = localStorage.getItem('current_company_id');
        if (savedCompanyId) {
          const saved = data.user.companies.find(c => c.id === parseInt(savedCompanyId));
          if (saved) {
            setCurrentCompany(saved);
            return;
          }
        }

        // 默认选择第一个企业
        if (data.user.companies.length > 0) {
          setCurrentCompany(data.user.companies[0]);
          localStorage.setItem('current_company_id', data.user.companies[0].id);
        }
      }
    } catch (err) {
      console.error('获取企业列表失败:', err);
    }
  };

  const handleSwitchCompany = (company) => {
    setCurrentCompany(company);
    localStorage.setItem('current_company_id', company.id);
    setIsOpen(false);

    // 触发自定义事件，通知其他组件企业已切换
    window.dispatchEvent(new CustomEvent('companyChanged', { detail: { companyId: company.id } }));

    // 刷新页面以更新数据
    window.location.reload();
  };

  if (!admin || companies.length === 0) {
    return null;
  }

  return (
    <div className={styles.switcher} ref={dropdownRef}>
      <button className={styles.trigger} onClick={() => setIsOpen(!isOpen)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className={styles.companyName}>{currentCompany?.name || '选择企业'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>切换企业</div>
          {companies.map((company) => (
            <button
              key={company.id}
              className={`${styles.dropdownItem} ${currentCompany?.id === company.id ? styles.active : ''}`}
              onClick={() => handleSwitchCompany(company)}
            >
              <div className={styles.itemContent}>
                <span className={styles.itemName}>{company.name}</span>
                <span className={styles.itemRole}>{getRoleLabel(company.member_role)}</span>
              </div>
              {currentCompany?.id === company.id && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getRoleLabel(role) {
  const labels = {
    owner: '所有者',
    admin: '管理员',
    uploader: '上传者',
    viewer: '查看者',
  };
  return labels[role] || role;
}
