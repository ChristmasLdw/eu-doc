/**
 * EU-DOC - 使用指南页面
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLanguageCode } from '../i18n/languages';
import styles from './LegalPage.module.css';

const guides = {
  zh: {
    title: '使用指南',
    tabs: {
      consumer: '查询资料',
      business: '企业上传',
      regulator: '审核核验',
    },
    consumer: {
      title: '查询资料',
      intro: '您可以通过 EU-DOC 查询产品、型号、企业和公开资料：',
      sections: [
        ['1. 搜索产品', ['在首页搜索框输入产品名称、型号或企业名称', '使用搜索建议快速找到目标产品', '点击搜索结果查看产品详情']],
        ['2. 查看产品资料', ['在产品详情页查看所有相关资料', '证书：查看产品是否通过相关认证', 'DoC 声明：查看企业自我声明资料', '说明书：了解产品使用方法']],
        ['3. 查看或下载资料', ['点击“打开原文件”查看完整资料', '点击“下载文件”保存资料到本地']],
        ['4. 报告问题', ['如发现资料问题，点击“报告资料问题”', '选择问题类型并补充说明后提交']],
      ],
      tip: '提示：所有资料均由企业自行上传，平台不对资料真实性负责。如有疑问，请直接联系企业核实。',
    },
    business: {
      title: '企业上传',
      intro: '企业用户可以通过 EU-DOC 归档并公开产品资料：',
      sections: [
        ['1. 注册账号', [{ prefix: '访问', label: '注册页面', to: '/admin/register' }, '使用企业邮箱注册账号', '填写企业名称（可选）']],
        ['2. 创建企业', ['登录后进入管理后台', '在企业资料页面创建企业', '创建者自动成为企业所有者']],
        ['3. 批量上传资料', ['进入“批量上传”页面', '选择目标企业并上传产品资料文件夹', '按系统引导确认产品、型号、资料类型与语言']],
        ['4. 管理产品资料', ['在“产品资料”页面查看已归档资料', '补充产品名称、型号、尺寸、材质等基础信息', '对缺失资料进行补充上传或替换']],
        ['5. 邀请成员', ['在成员管理页面邀请团队成员', '设置成员角色（管理员、上传者、查看者）', '不同角色有不同的操作权限']],
      ],
      tip: '主体核验仅确认企业主体信息，不代表 EU-DOC 对产品合规性或企业上传资料的真实性作出背书。',
      tipLink: '了解认证流程',
    },
    regulator: {
      title: '审核核验',
      intro: '审批、采购或合规人员可以快速查找企业公开的 DoC 声明、证书和其他产品资料：',
      sections: [
        ['1. 搜索企业或产品', ['在首页搜索框输入企业名称、产品名称、型号或证书编号', '点击搜索结果查看产品详情或资料详情']],
        ['2. 查看 DoC 声明', ['在产品详情页找到“DoC 声明”类型资料', '点击查看或下载 DoC 声明文件', '如存在不同语言版本，可在资料详情页切换同类型资料']],
        ['3. 验证证书资料', ['查看证书编号、签发机构、有效期等信息', '点击“打开原文件”进行存档或进一步核验', '如有疑问，点击“报告资料问题”']],
        ['4. 多语言支持', ['平台支持中英文界面切换', '企业上传的资料内容按企业填写或文件原文展示，不会被平台自动翻译']],
      ],
      tip: '免责声明：平台仅提供资料展示服务，不对资料真实性负责。如需验证资料真伪，请直接联系相关企业或认证机构。',
    },
    faqTitle: '常见问题',
    faqs: [
      ['Q: 资料打不开怎么办？', 'A: 请检查网络连接，或尝试使用其他浏览器。如问题持续，请联系技术支持。'],
      ['Q: 发现资料信息错误怎么办？', 'A: 可在资料详情页点击“报告资料问题”，我们会联系企业核实。'],
      ['Q: 如何成为企业用户？', 'A: 注册账号后，在管理后台创建企业并上传产品资料即可。'],
      ['Q: 企业资料为什么没有被翻译？', 'A: 企业名称、产品名称、资料标题等属于企业填写内容，平台只切换界面语言，不自动改写企业资料。'],
    ],
    footerHome: '返回首页',
    footerContact: '联系我们',
  },
  en: {
    title: 'Guide',
    tabs: {
      consumer: 'Find documents',
      business: 'Company uploads',
      regulator: 'Review & verification',
    },
    consumer: {
      title: 'Find documents',
      intro: 'Use EU-DOC to find products, models, companies, and public documents:',
      sections: [
        ['1. Search products', ['Enter a product name, model, or company name on the homepage', 'Use search suggestions to find the target product quickly', 'Open a search result to view product details']],
        ['2. View product documentation', ['View related documentation on the product detail page', 'Certificates: check relevant product certifications', 'DoC declarations: view company self-declaration documents', 'Manuals: understand how to use the product']],
        ['3. View or download documentation', ['Click “Open original file” to view the complete document', 'Click “Download file” to save the document locally']],
        ['4. Report issues', ['Click “Report a document issue” if you find a problem', 'Choose an issue type and add any useful details before submitting']],
      ],
      tip: 'Note: All documentation is uploaded by companies. EU-DOC does not guarantee authenticity. If in doubt, contact the company directly for confirmation.',
    },
    business: {
      title: 'Company uploads',
      intro: 'Companies can organize and publish product documentation through EU-DOC:',
      sections: [
        ['1. Register an account', [{ prefix: 'Open the', label: 'registration page', to: '/admin/register' }, 'Register with a company email address', 'Enter the company name if needed']],
        ['2. Create a company profile', ['Log in and enter the admin console', 'Create a company from the company profile area', 'The creator becomes the company owner automatically']],
        ['3. Batch upload documentation', ['Open the Batch Upload page', 'Choose the target company and upload a product documentation folder', 'Follow the guided checks to confirm product, models, document type, and language']],
        ['4. Manage product documentation', ['Open Product Documentation to review archived materials', 'Complete product name, model, dimensions, material, and other basic information', 'Upload or replace missing documentation where needed']],
        ['5. Invite members', ['Invite team members from member management', 'Assign roles such as admin, uploader, or viewer', 'Different roles have different permissions']],
      ],
      tip: 'Identity verification confirms company identity only. It does not mean EU-DOC endorses product compliance or the authenticity of company-uploaded documents.',
      tipLink: 'Learn about verification',
    },
    regulator: {
      title: 'Review & verification',
      intro: 'Reviewers, buyers, and compliance teams can quickly find public DoC declarations, certificates, and other product documentation:',
      sections: [
        ['1. Search companies or products', ['Enter a company name, product name, model, or certificate number on the homepage', 'Open a search result to view product details or document details']],
        ['2. View DoC declarations', ['Find DoC Declaration documents on the product detail page', 'Open or download the DoC declaration file', 'If multiple language versions exist, switch within the same document type on the detail page']],
        ['3. Check certificate documentation', ['Review certificate number, issuer, validity period, and related information', 'Click “Open original file” for archiving or further verification', 'Click “Report a document issue” if anything appears incorrect']],
        ['4. Multi-language support', ['The platform supports Chinese and English interface switching', 'Company-uploaded content is shown as entered or as contained in the original file; EU-DOC does not automatically translate company documentation']],
      ],
      tip: 'Disclaimer: EU-DOC provides documentation display services only and does not guarantee authenticity. To verify a document, contact the relevant company or issuing organization directly.',
    },
    faqTitle: 'FAQ',
    faqs: [
      ['Q: What if a document cannot be opened?', 'A: Check your network connection or try another browser. If the issue continues, contact support.'],
      ['Q: What if document information appears incorrect?', 'A: Click “Report a document issue” on the document detail page and we will contact the company for confirmation.'],
      ['Q: How can I become a company user?', 'A: Register an account, create a company in the admin console, and upload product documentation.'],
      ['Q: Why is company documentation not translated?', 'A: Company names, product names, and document titles are company-entered content. EU-DOC switches interface language but does not rewrite company documentation.'],
    ],
    footerHome: 'Back to Home',
    footerContact: 'Contact',
  },
  de: {
    title: 'Anleitung',
    tabs: {
      consumer: 'Dokumente finden',
      business: 'Unternehmens-Upload',
      regulator: 'Prüfung & Verifizierung',
    },
    consumer: {
      title: 'Dokumente finden',
      intro: 'Mit EU-DOC können Sie Produkte, Modelle, Unternehmen und öffentliche Dokumente finden:',
      sections: [
        ['1. Produkte suchen', ['Geben Sie auf der Startseite einen Produktnamen, ein Modell oder einen Unternehmensnamen ein', 'Nutzen Sie die Suchvorschläge, um das gewünschte Produkt schneller zu finden', 'Öffnen Sie ein Suchergebnis, um die Produktdetails anzuzeigen']],
        ['2. Produktdokumente ansehen', ['Auf der Produktdetailseite finden Sie die zugehörigen Dokumente', 'Zertifikate: relevante Produktzertifizierungen prüfen', 'Konformitätserklärungen: Selbsterklärungen des Unternehmens ansehen', 'Anleitungen: Informationen zur Verwendung des Produkts lesen']],
        ['3. Dokumente ansehen oder herunterladen', ['Klicken Sie auf „Originaldatei öffnen“, um das vollständige Dokument anzuzeigen', 'Klicken Sie auf „Datei herunterladen“, um das Dokument lokal zu speichern']],
        ['4. Probleme melden', ['Klicken Sie bei einem Problem auf „Dokumentproblem melden“', 'Wählen Sie eine Problemart und ergänzen Sie bei Bedarf weitere Angaben']],
      ],
      tip: 'Hinweis: Alle Dokumente werden von den Unternehmen bereitgestellt. EU-DOC übernimmt keine Gewähr für ihre Echtheit. Wenden Sie sich im Zweifel direkt an das Unternehmen.',
    },
    business: {
      title: 'Unternehmens-Upload',
      intro: 'Unternehmen können Produktdokumente über EU-DOC ordnen und veröffentlichen:',
      sections: [
        ['1. Konto registrieren', [{ prefix: 'Öffnen Sie die', label: 'Registrierungsseite', to: '/admin/register' }, 'Registrieren Sie sich mit einer geschäftlichen E-Mail-Adresse', 'Geben Sie bei Bedarf den Unternehmensnamen an']],
        ['2. Unternehmensprofil erstellen', ['Melden Sie sich an und öffnen Sie den Verwaltungsbereich', 'Erstellen Sie im Bereich „Unternehmensprofil“ ein Unternehmen', 'Der Ersteller wird automatisch zum Eigentümer des Unternehmens']],
        ['3. Dokumente gesammelt hochladen', ['Öffnen Sie den Bereich für den Mehrfach-Upload', 'Wählen Sie das Unternehmen und laden Sie einen Ordner mit Produktdokumenten hoch', 'Bestätigen Sie Produkt, Modelle, Dokumenttyp und Sprache anhand der geführten Schritte']],
        ['4. Produktdokumente verwalten', ['Prüfen Sie archivierte Dokumente im Bereich „Produktdokumentation“', 'Ergänzen Sie Produktname, Modell, Abmessungen, Material und weitere Grunddaten', 'Laden Sie fehlende Dokumente hoch oder ersetzen Sie veraltete Dateien']],
        ['5. Mitglieder einladen', ['Laden Sie Teammitglieder über die Mitgliederverwaltung ein', 'Weisen Sie Rollen wie Administrator, Uploader oder Betrachter zu', 'Die Rollen verfügen über unterschiedliche Berechtigungen']],
      ],
      tip: 'Die Identitätsprüfung bestätigt nur die Unternehmensidentität. Sie ist keine Bestätigung der Produktkonformität oder der Echtheit hochgeladener Dokumente durch EU-DOC.',
      tipLink: 'Mehr zur Verifizierung',
    },
    regulator: {
      title: 'Prüfung & Verifizierung',
      intro: 'Prüfstellen, Einkäufer und Compliance-Teams können öffentliche Konformitätserklärungen, Zertifikate und weitere Produktdokumente schnell finden:',
      sections: [
        ['1. Unternehmen oder Produkte suchen', ['Geben Sie auf der Startseite Unternehmen, Produkt, Modell oder Zertifikatsnummer ein', 'Öffnen Sie ein Suchergebnis, um Produkt- oder Dokumentdetails anzuzeigen']],
        ['2. Konformitätserklärungen ansehen', ['Öffnen Sie auf der Produktseite den Dokumenttyp „Konformitätserklärung“', 'Zeigen Sie die Originaldatei an oder laden Sie sie herunter', 'Sind mehrere Sprachversionen vorhanden, können Sie auf der Detailseite zwischen Dokumenten desselben Typs wechseln']],
        ['3. Zertifikate prüfen', ['Prüfen Sie Zertifikatsnummer, ausstellende Stelle, Gültigkeitszeitraum und weitere Angaben', 'Klicken Sie zur Archivierung oder weiteren Verifizierung auf „Originaldatei öffnen“', 'Klicken Sie bei Auffälligkeiten auf „Dokumentproblem melden“']],
        ['4. Mehrsprachigkeit', ['Die Benutzeroberfläche unterstützt Chinesisch, Englisch und Deutsch', 'Vom Unternehmen bereitgestellte Inhalte werden in der eingegebenen Sprache oder im Original angezeigt und nicht automatisch übersetzt']],
      ],
      tip: 'Haftungsausschluss: EU-DOC dient ausschließlich der Anzeige von Dokumenten und übernimmt keine Gewähr für deren Echtheit. Wenden Sie sich zur Verifizierung direkt an das Unternehmen oder die ausstellende Stelle.',
    },
    faqTitle: 'Häufige Fragen',
    faqs: [
      ['F: Was kann ich tun, wenn sich ein Dokument nicht öffnen lässt?', 'A: Prüfen Sie Ihre Internetverbindung oder verwenden Sie einen anderen Browser. Wenden Sie sich an den Support, wenn das Problem weiterhin besteht.'],
      ['F: Was kann ich tun, wenn Dokumentinformationen falsch erscheinen?', 'A: Klicken Sie auf der Dokumentdetailseite auf „Dokumentproblem melden“. Wir kontaktieren das Unternehmen zur Klärung.'],
      ['F: Wie werde ich Unternehmensnutzer?', 'A: Registrieren Sie ein Konto, erstellen Sie im Verwaltungsbereich ein Unternehmen und laden Sie Produktdokumente hoch.'],
      ['F: Warum werden Unternehmensdokumente nicht übersetzt?', 'A: Unternehmensnamen, Produktnamen und Dokumenttitel stammen vom Unternehmen. EU-DOC übersetzt die Benutzeroberfläche, verändert aber keine Unternehmensinhalte.'],
    ],
    footerHome: 'Zur Startseite',
    footerContact: 'Kontakt',
  },
};

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 20px',
        background: active ? 'var(--accent-gradient)' : 'var(--bg-card)',
        color: active ? 'white' : 'var(--text-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
      }}
    >
      {children}
    </button>
  );
}

function GuideSection({ data, tone = 'rgba(59, 130, 246, 0.1)' }) {
  return (
    <div className={styles.section}>
      <h2>{data.title}</h2>
      <p>{data.intro}</p>
      {data.sections.map(([title, items]) => (
        <div key={title}>
          <h3>{title}</h3>
          <ul>
            {items.map((item) => (
              <li key={typeof item === 'string' ? item : `${item.to}-${item.label}`}>
                {typeof item === 'string' ? item : <>{item.prefix} <Link to={item.to}>{item.label}</Link></>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div style={{ marginTop: '24px', padding: '16px', background: tone, borderRadius: 'var(--radius-sm)' }}>
        <strong>{data.tip}</strong>
        {data.tipLink && <Link to="/enterprise-agreement" style={{ marginLeft: '8px' }}>{data.tipLink}</Link>}
      </div>
    </div>
  );
}

export default function GuidePage() {
  const [activeTab, setActiveTab] = useState('consumer');
  const { i18n } = useTranslation();
  const ui = guides[getLanguageCode(i18n.resolvedLanguage)] || guides.en;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>{ui.title}</h1>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <TabButton active={activeTab === 'consumer'} onClick={() => setActiveTab('consumer')}>{ui.tabs.consumer}</TabButton>
          <TabButton active={activeTab === 'business'} onClick={() => setActiveTab('business')}>{ui.tabs.business}</TabButton>
          <TabButton active={activeTab === 'regulator'} onClick={() => setActiveTab('regulator')}>{ui.tabs.regulator}</TabButton>
        </div>

        {activeTab === 'consumer' && <GuideSection data={ui.consumer} />}
        {activeTab === 'business' && <GuideSection data={ui.business} tone="rgba(34, 197, 94, 0.1)" />}
        {activeTab === 'regulator' && <GuideSection data={ui.regulator} tone="rgba(234, 179, 8, 0.1)" />}

        <div className={styles.section} style={{ marginTop: '32px' }}>
          <h2>{ui.faqTitle}</h2>
          {ui.faqs.map(([question, answer]) => (
            <div key={question}>
              <h3>{question}</h3>
              <p>{answer}</p>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <Link to="/">{ui.footerHome}</Link>
          <Link to="/contact">{ui.footerContact}</Link>
        </div>
      </div>
    </div>
  );
}
