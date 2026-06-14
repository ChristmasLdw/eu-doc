/**
 * EU-DOC - 简化的用户管理布局
 * 版本: 2.0.0
 *
 * 设计改进:
 * - 去除侧边栏，使用顶部导航栏
 * - 采用卡片式布局，与前台风格统一
 * - 内容居中显示，最大宽度1200px
 */

import { Outlet } from 'react-router-dom';
import styles from './AdminLayout.module.css';

export default function AdminLayout() {
  return (
    <div className={styles.simpleLayout}>
      {/* 主内容区 - 居中容器 */}
      <main className={styles.simpleContent}>
        <Outlet />
      </main>
    </div>
  );
}
