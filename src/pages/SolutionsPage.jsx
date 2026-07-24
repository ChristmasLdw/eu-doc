import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLanguageCode } from '../i18n/languages';
import styles from './SolutionsPage.module.css';

const content = {
  zh: {
    kicker: 'EU-DOC Solutions',
    title: '产品合规资料的在线存放、查询与分享平台',
    intro: 'EU-DOC 面向需要公开产品资料的企业，帮助整理和展示产品相关的证书、DoC 声明、说明书等资料，让外部用户可以通过网页快速找到企业主动公开的产品资料。',
    search: '搜索公开资料',
    contact: '联系入驻',
    scenarioLabel: '适用场景',
    scenarioTitle: '解决“资料分散、附件难找、链接不统一”的问题',
    scenarios: [
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
    ],
    docLabel: '公开资料类型',
    docTitle: '围绕“产品”组织公开资料',
    docText: 'EU-DOC 不只是单个证书链接，而是围绕产品展示相关公开资料。用户可以先确认产品，再查看对应资料。',
    documents: ['资质证书', 'DoC 符合性声明', '使用说明书', '检测报告', '产品基础资料'],
    positionTitle: '平台定位',
    positionText1: 'EU-DOC 是产品合规资料展示与查询工具，不作为认证机构，不替代发证机构的官方验证。企业上传的资料由上传方对真实性和合法性负责。',
    positionText2: '平台仅建议上传本来需要对客户、消费者、采购商或审核机构公开的产品资料；不建议上传图纸、配方、BOM、供应商名单、报价、内部工艺或未公开新品资料等商业敏感内容。',
  },
  en: {
    kicker: 'EU-DOC Solutions',
    title: 'Online storage, search, and sharing for public product compliance documentation',
    intro: 'EU-DOC helps companies organize and present product-related certificates, DoC declarations, manuals, and other public documentation so external users can quickly find the materials a company chooses to publish.',
    search: 'Search public documentation',
    contact: 'Contact us',
    scenarioLabel: 'Use cases',
    scenarioTitle: 'Solve scattered documents, hard-to-find attachments, and inconsistent links',
    scenarios: [
      {
        title: 'Centralized product compliance documentation',
        text: 'Organize certificates, DoC declarations, manuals, and other public product materials into one clear product page for customers, buyers, and reviewers.',
      },
      {
        title: 'Online public documentation search',
        text: 'Users can search by company, product, model, or certificate number, reducing repeated attachment sharing through email or chat.',
      },
      {
        title: 'Public documentation pages for companies',
        text: 'Companies can create clear documentation entrances for products, helping external users view approved public materials and basic product information.',
      },
    ],
    docLabel: 'Public documentation types',
    docTitle: 'Organize documentation around products',
    docText: 'EU-DOC is not just a single certificate link. It presents public documentation around the product, so users can confirm the product first and then open the relevant materials.',
    documents: ['Certificates', 'DoC Declaration', 'User Manual', 'Test Report', 'Product Basics'],
    positionTitle: 'Platform position',
    positionText1: 'EU-DOC is a product compliance documentation display and search tool. It is not a certification body and does not replace official verification by issuing organizations. Companies are responsible for the authenticity and legality of uploaded materials.',
    positionText2: 'The platform recommends uploading only product documentation intended for customers, consumers, buyers, or reviewers. Do not upload drawings, formulas, BOMs, supplier lists, quotations, internal processes, unreleased products, or other commercially sensitive information.',
  },
  de: {
    kicker: 'EU-DOC Solutions',
    title: 'Öffentliche Produkt- und Konformitätsdokumente online verwalten, suchen und teilen',
    intro: 'EU-DOC unterstützt Unternehmen dabei, Zertifikate, Konformitätserklärungen, Anleitungen und weitere öffentliche Produktdokumente übersichtlich bereitzustellen, damit externe Nutzer benötigte Unterlagen schnell finden.',
    search: 'Öffentliche Dokumente suchen',
    contact: 'Kontakt aufnehmen',
    scenarioLabel: 'Anwendungsfälle',
    scenarioTitle: 'Verteilte Dokumente, schwer auffindbare Anhänge und uneinheitliche Links vermeiden',
    scenarios: [
      {
        title: 'Produktdokumente zentral bereitstellen',
        text: 'Zertifikate, Konformitätserklärungen, Anleitungen und weitere öffentliche Unterlagen werden auf einer übersichtlichen Produktseite für Kunden, Einkäufer und Prüfstellen zusammengeführt.',
      },
      {
        title: 'Öffentliche Dokumente online suchen',
        text: 'Nutzer suchen nach Unternehmen, Produkt, Modell oder Zertifikatsnummer. Dadurch müssen Anhänge nicht wiederholt per E-Mail oder Chat versendet werden.',
      },
      {
        title: 'Öffentliche Dokumentseiten für Unternehmen',
        text: 'Unternehmen schaffen eindeutige Zugänge zu ihren Produktdokumenten und zeigen freigegebene Unterlagen zusammen mit grundlegenden Produktinformationen.',
      },
    ],
    docLabel: 'Öffentliche Dokumenttypen',
    docTitle: 'Dokumente nach Produkt organisieren',
    docText: 'EU-DOC ist mehr als ein einzelner Zertifikatslink. Öffentliche Dokumente werden dem jeweiligen Produkt zugeordnet, sodass Nutzer zuerst das Produkt bestätigen und anschließend die relevanten Unterlagen öffnen können.',
    documents: ['Zertifikate', 'Konformitätserklärungen', 'Bedienungsanleitungen', 'Prüfberichte', 'Produktinformationen'],
    positionTitle: 'Position der Plattform',
    positionText1: 'EU-DOC ist ein Werkzeug zur Anzeige und Suche von Produkt- und Konformitätsdokumenten. Die Plattform ist keine Zertifizierungsstelle und ersetzt keine offizielle Prüfung durch ausstellende Organisationen. Das hochladende Unternehmen ist für Echtheit und Rechtmäßigkeit verantwortlich.',
    positionText2: 'Es sollten nur Produktdokumente hochgeladen werden, die für Kunden, Verbraucher, Einkäufer oder Prüfstellen bestimmt sind. Zeichnungen, Rezepturen, Stücklisten, Lieferantenlisten, Angebote, interne Prozesse, unveröffentlichte Produkte und andere vertrauliche Geschäftsinformationen gehören nicht auf die Plattform.',
  },
};

export default function SolutionsPage() {
  const { i18n } = useTranslation();
  const ui = content[getLanguageCode(i18n.resolvedLanguage)] || content.en;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.kicker}>{ui.kicker}</div>
        <h1>{ui.title}</h1>
        <p>{ui.intro}</p>
        <div className={styles.actions}>
          <Link to="/search" className={styles.primary}>{ui.search}</Link>
          <Link to="/contact" className={styles.secondary}>{ui.contact}</Link>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionTitle}>
          <span>{ui.scenarioLabel}</span>
          <h2>{ui.scenarioTitle}</h2>
        </div>
        <div className={styles.grid}>
          {ui.scenarios.map((item) => (
            <article key={item.title} className={styles.card}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.splitPanel}>
        <div>
          <span className={styles.sectionEyebrow}>{ui.docLabel}</span>
          <h2>{ui.docTitle}</h2>
          <p>{ui.docText}</p>
        </div>
        <div className={styles.tags}>
          {ui.documents.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      <section className={styles.note}>
        <h2>{ui.positionTitle}</h2>
        <p>{ui.positionText1}</p>
        <p>{ui.positionText2}</p>
      </section>
    </main>
  );
}
