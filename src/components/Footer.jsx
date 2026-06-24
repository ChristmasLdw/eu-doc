/**
 * EU-DOC - 全局页脚组件
 */

import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.links}>
          <Link to="/guide">使用指南</Link>
          <Link to="/terms">服务条款</Link>
          <Link to="/privacy">隐私政策</Link>
          <Link to="/disclaimer">免责声明</Link>
          <Link to="/upload-commitment">上传承诺书</Link>
          <Link to="/enterprise-agreement">企业入驻</Link>
          <Link to="/contact">联系我们</Link>
        </div>
        <div className={styles.copyright}>
          © 2025 EU-DOC 产品合规文档平台
        </div>
      </div>
    </footer>
  );
}
