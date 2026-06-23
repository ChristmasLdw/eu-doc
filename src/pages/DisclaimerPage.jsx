/**
 * EU-DOC - 免责声明页面
 */

import { Link } from 'react-router-dom';
import styles from './LegalPage.module.css';

export default function DisclaimerPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>免责声明</h1>
        <p className={styles.updateDate}>最后更新：2026年6月22日</p>

        <section className={styles.section}>
          <h2>1. 平台定位</h2>
          <p>
            EU-DOC 是一个产品合规文档公开展示平台。我们为企业提供上传和展示产品认证证书、
            DoC声明文件、产品使用说明书等合规文档的服务，为消费者、采购商和审批机构提供
            查询和验证产品合规性的渠道。
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. 内容声明</h2>
          <p>
            平台上展示的所有文档均由企业自行上传，平台仅提供存储和展示服务。平台不对文档
            的真实性、准确性、完整性或合法性做任何保证或担保。
          </p>
          <p>
            用户应自行判断和核实文档内容的真实性，平台不承担因文档内容不实而产生的任何
            损失或责任。
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. 上传者责任</h2>
          <p>文档上传者声明并保证：</p>
          <ul>
            <li>上传的文档真实、准确、完整</li>
            <li>有权代表相关企业上传该文档</li>
            <li>上传的文档不侵犯任何第三方的知识产权或其他合法权益</li>
            <li>理解并同意，如上传虚假或误导性文档，将承担由此产生的一切法律责任</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. 平台责任限制</h2>
          <p>在法律允许的最大范围内，平台：</p>
          <ul>
            <li>不对文档内容的真实性、准确性或完整性做出任何保证</li>
            <li>不对因使用或依赖平台上的文档而导致的任何直接或间接损失承担责任</li>
            <li>保留在发现虚假或违规文档时删除或下架该文档的权利</li>
            <li>保留在发现违规行为时暂停或终止用户账号的权利</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. 知识产权</h2>
          <p>
            平台上的文档版权归原作者或相关企业所有。未经权利人书面许可，任何人不得复制、
            修改、传播或用于商业用途。
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. 隐私保护</h2>
          <p>
            我们重视用户隐私保护。关于个人信息的收集、使用和保护，请参阅我们的
            <Link to="/privacy">隐私政策</Link>。
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. 免责声明的修改</h2>
          <p>
            我们可能会不时更新本免责声明。更新后的免责声明将在本页面发布，并注明最新
            更新日期。继续使用本平台即表示您同意接受更新后的免责声明。
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. 联系我们</h2>
          <p>
            如您对本免责声明有任何疑问，请通过以下方式联系我们：
          </p>
          <p>
            邮箱：contact@eu-doc.com<br />
            地址：[待填写]
          </p>
        </section>

        <div className={styles.footer}>
          <Link to="/">返回首页</Link>
          <Link to="/terms">服务条款</Link>
          <Link to="/privacy">隐私政策</Link>
        </div>
      </div>
    </div>
  );
}
