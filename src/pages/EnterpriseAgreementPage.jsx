/**
 * EU-DOC - 企业入驻协议
 */

import { Link } from 'react-router-dom';
import styles from './LegalPage.module.css';

export default function EnterpriseAgreementPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>企业入驻协议</h1>
        <p className={styles.updateDate}>最后更新：2026年6月22日</p>

        <section className={styles.section}>
          <h2>1. 协议范围</h2>
          <p>
            本协议是企业（以下简称"您"或"入驻企业"）与EU-DOC平台（以下简称"平台"）
            之间关于使用平台服务的法律协议。入驻即表示您同意遵守本协议的所有条款。
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. 入驻条件</h2>
          <p>入驻企业需满足以下条件：</p>
          <ul>
            <li>具有合法的经营资质和营业执照</li>
            <li>提供真实、准确的企业信息</li>
            <li>同意并遵守本平台的各项规则和政策</li>
            <li>完成企业认证流程</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. 企业认证</h2>
          <p>
            为确保平台文档的可信度，入驻企业需完成认证流程。认证需提交营业执照、
            授权书等相关材料。平台将在收到申请后进行审核。
          </p>
          <p>
            认证通过后，企业可获得以下权益：
          </p>
          <ul>
            <li>企业认证标识展示</li>
            <li>文档优先审核</li>
            <li>更多产品和文档上传配额</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. 文档上传规范</h2>
          <p>入驻企业上传的文档需符合以下规范：</p>
          <ul>
            <li>文档内容真实、准确、完整</li>
            <li>文档格式符合平台要求（PDF、JPG、PNG等）</li>
            <li>文档不侵犯任何第三方的知识产权</li>
            <li>文档不包含违法、违规或不良信息</li>
            <li>上传者确认有权代表企业上传该文档</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. 企业责任</h2>
          <p>入驻企业需承担以下责任：</p>
          <ul>
            <li>确保上传文档的真实性和合法性</li>
            <li>及时更新过期或失效的文档</li>
            <li>妥善管理企业账号和成员权限</li>
            <li>对账号下的所有操作承担责任</li>
            <li>如发现文档被滥用或侵权，及时通知平台</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. 平台权利</h2>
          <p>平台保有以下权利：</p>
          <ul>
            <li>审核、拒绝或下架不符合规范的文档</li>
            <li>暂停或终止违规企业的账号</li>
            <li>修改平台规则和服务条款</li>
            <li>对违规行为追究法律责任</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>7. 费用与结算</h2>
          <p>
            平台提供免费和付费两种服务模式。付费服务的具体内容、价格和结算方式
            以平台公布的信息为准。平台有权根据业务发展调整价格策略。
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. 协议终止</h2>
          <p>在以下情况下，本协议可能被终止：</p>
          <ul>
            <li>企业主动申请退出</li>
            <li>企业严重违反本协议条款</li>
            <li>企业长期未使用平台服务</li>
            <li>平台决定停止运营</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>9. 争议解决</h2>
          <p>
            因本协议引起的争议，双方应友好协商解决。协商不成的，任何一方均可向
            平台所在地有管辖权的人民法院提起诉讼。
          </p>
        </section>

        <div className={styles.footer}>
          <Link to="/">返回首页</Link>
          <Link to="/terms">服务条款</Link>
          <Link to="/disclaimer">免责声明</Link>
        </div>
      </div>
    </div>
  );
}
