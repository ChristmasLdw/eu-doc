import { Link } from 'react-router-dom';
import styles from './SolutionsPage.module.css';

const scenarios = [
  {
    title: '产品合规资料集中展示',
    text: '将产品相关的资质证书、DoC 声明、使用说明书等公开资料整理到统一页面，方便客户、采购方或审核人员查看。',
  },
  {
    title: '公开资料在线查询',
    text: '用户可以通过公司名称、产品名称、型号或证书编号进行查询，减少通过邮件、聊天记录反复发送附件的成本。',
  },
  {
    title: '面向企业的资料公开页',
    text: '企业可以为产品建立清晰的资料入口，让外部用户看到企业主动公开的资料与基础产品信息。',
  },
];

const documents = ['资质证书', 'DoC 符合性声明', '使用说明书', '检测报告', '产品基础资料'];

export default function SolutionsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.kicker}>EU-DOC Solutions</div>
        <h1>产品合规资料的在线存放、查询与分享平台</h1>
        <p>
          EU-DOC 面向需要公开产品资料的企业，帮助整理和展示产品相关的证书、DoC 声明、说明书等资料，
          让外部用户可以通过网页快速找到企业主动公开的产品资料。
        </p>
        <div className={styles.actions}>
          <Link to="/search" className={styles.primary}>搜索公开资料</Link>
          <Link to="/contact" className={styles.secondary}>联系入驻</Link>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionTitle}>
          <span>适用场景</span>
          <h2>解决“资料分散、附件难找、链接不统一”的问题</h2>
        </div>
        <div className={styles.grid}>
          {scenarios.map((item) => (
            <article key={item.title} className={styles.card}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.splitPanel}>
        <div>
          <span className={styles.sectionEyebrow}>公开资料类型</span>
          <h2>围绕“产品”组织公开资料</h2>
          <p>
            EU-DOC 不只是单个证书链接，而是围绕产品展示相关公开资料。用户可以先确认产品，再查看对应资料。
          </p>
        </div>
        <div className={styles.tags}>
          {documents.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      <section className={styles.note}>
        <h2>平台定位</h2>
        <p>
          EU-DOC 是产品合规资料展示与查询工具，不作为认证机构，不替代发证机构的官方验证。
          企业上传的资料由上传方对真实性和合法性负责。
        </p>
        <p>
          平台仅建议上传本来需要对客户、消费者、采购商或审核机构公开的产品资料；
          不建议上传图纸、配方、BOM、供应商名单、报价、内部工艺或未公开新品资料等商业敏感内容。
        </p>
      </section>
    </main>
  );
}
