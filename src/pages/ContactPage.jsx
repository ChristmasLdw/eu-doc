/**
 * EU-DOC - 联系我们
 */

import { Link } from 'react-router-dom';
import styles from './LegalPage.module.css';

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>联系我们</h1>

        <section className={styles.section}>
          <h2>企业入驻咨询</h2>
          <p>
            如果您希望将企业的产品合规文档上传至本平台，请通过以下方式联系我们：
          </p>
          <ul>
            <li>邮箱：business@eu-doc.com</li>
            <li>电话：+86 xxx-xxxx-xxxx</li>
          </ul>
          <p>
            我们将在1-2个工作日内回复您的咨询。
          </p>
        </section>

        <section className={styles.section}>
          <h2>技术支持</h2>
          <p>
            如您在使用平台过程中遇到技术问题，请联系我们的技术支持团队：
          </p>
          <ul>
            <li>邮箱：support@eu-doc.com</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>合作洽谈</h2>
          <p>
            如您有商务合作、媒体采访或其他合作需求，请联系：
          </p>
          <ul>
            <li>邮箱：contact@eu-doc.com</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>错误报告</h2>
          <p>
            如您发现平台上的文档存在错误或虚假信息，请使用证书详情页的"报告错误"
            功能，或发送邮件至 report@eu-doc.com。
          </p>
        </section>

        <section className={styles.section}>
          <h2>办公地址</h2>
          <p>
            [待填写]<br />
            邮编：[待填写]
          </p>
        </section>

        <div className={styles.footer}>
          <Link to="/">返回首页</Link>
          <Link to="/terms">服务条款</Link>
          <Link to="/privacy">隐私政策</Link>
          <Link to="/disclaimer">免责声明</Link>
        </div>
      </div>
    </div>
  );
}
