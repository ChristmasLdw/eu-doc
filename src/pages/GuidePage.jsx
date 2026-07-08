/**
 * EU-DOC - 使用指南页面
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isEnglishLanguage } from '../utils/languageContent';
import styles from './LegalPage.module.css';

const guides = {
  zh: {
    title: '使用指南',
    tabs: {
      consumer: 'C端用户',
      business: 'B端企业',
      regulator: '审批机构',
    },
    consumer: {
      title: 'C端用户使用指南',
      intro: '作为消费者、采购商或普通用户，您可以通过本平台：',
      sections: [
        ['1. 搜索产品', ['在首页搜索框输入产品名称、型号或企业名称', '使用搜索建议快速找到目标产品', '点击搜索结果查看产品详情']],
        ['2. 查看产品资料', ['在产品详情页查看所有相关资料', '证书：查看产品是否通过相关认证', 'DoC 声明：查看企业自我声明资料', '说明书：了解产品使用方法']],
        ['3. 查看或下载资料', ['点击“查看”在线预览资料', '点击“下载”按钮保存资料到本地']],
        ['4. 报告问题', ['如发现资料信息错误，可在资料详情页提交反馈', '填写问题描述后提交，我们会尽快处理']],
      ],
      tip: '提示：所有资料均由企业自行上传，平台不对资料真实性负责。如有疑问，请直接联系企业核实。',
    },
    business: {
      title: 'B端企业使用指南',
      intro: '作为企业用户，您可以通过本平台展示产品合规资料：',
      sections: [
        ['1. 注册账号', ['访问注册页面', '使用企业邮箱注册账号', '填写企业名称（可选）']],
        ['2. 创建企业', ['登录后进入管理后台', '在企业资料页面创建企业', '创建者自动成为企业所有者']],
        ['3. 批量上传资料', ['进入“批量上传”页面', '选择目标企业并上传产品资料文件夹', '按系统引导确认产品、型号、资料类型与语言']],
        ['4. 管理产品资料', ['在“产品资料”页面查看已归档资料', '补充产品名称、型号、尺寸、材质等基础信息', '对缺失资料进行补充上传或替换']],
        ['5. 邀请成员', ['在成员管理页面邀请团队成员', '设置成员角色（管理员、上传者、查看者）', '不同角色有不同的操作权限']],
      ],
      tip: '企业认证：完成企业认证后，企业公开资料会更容易被外部用户识别和信任。',
      tipLink: '了解认证流程',
    },
    regulator: {
      title: '审批机构使用指南',
      intro: '作为审批机构，您可以通过本平台快速查找企业公开的 DoC 声明、证书和其他产品资料：',
      sections: [
        ['1. 搜索企业或产品', ['在首页搜索框输入企业名称、产品名称、型号或证书编号', '点击搜索结果查看产品详情或资料详情']],
        ['2. 查看 DoC 声明', ['在产品详情页找到“DoC 声明”类型资料', '点击查看或下载 DoC 声明文件', '如存在不同语言版本，可在资料详情页切换同类型资料']],
        ['3. 验证证书资料', ['查看证书编号、签发机构、有效期等信息', '打开原文件进行存档或进一步核验', '如有疑问，可使用反馈功能']],
        ['4. 多语言支持', ['平台支持中英文界面切换', '企业上传的资料内容按企业填写或文件原文展示，不会被平台自动翻译']],
      ],
      tip: '免责声明：平台仅提供资料展示服务，不对资料真实性负责。如需验证资料真伪，请直接联系相关企业或认证机构。',
    },
    faqTitle: '常见问题',
    faqs: [
      ['Q: 资料打不开怎么办？', 'A: 请检查网络连接，或尝试使用其他浏览器。如问题持续，请联系技术支持。'],
      ['Q: 发现资料信息错误怎么办？', 'A: 可在资料详情页提交问题反馈，我们会联系企业核实。'],
      ['Q: 如何成为企业用户？', 'A: 注册账号后，在管理后台创建企业并上传产品资料即可。'],
      ['Q: 企业资料为什么没有被翻译？', 'A: 企业名称、产品名称、资料标题等属于企业填写内容，平台只切换界面语言，不自动改写企业资料。'],
    ],
    footerHome: '返回首页',
    footerContact: '联系我们',
  },
  en: {
    title: 'Guide',
    tabs: {
      consumer: 'Consumers',
      business: 'Companies',
      regulator: 'Reviewers',
    },
    consumer: {
      title: 'Consumer Guide',
      intro: 'As a consumer, buyer, or general user, you can use EU-DOC to:',
      sections: [
        ['1. Search products', ['Enter a product name, model, or company name on the homepage', 'Use search suggestions to find the target product quickly', 'Open a search result to view product details']],
        ['2. View product documentation', ['View related documentation on the product detail page', 'Certificates: check relevant product certifications', 'DoC declarations: view company self-declaration documents', 'Manuals: understand how to use the product']],
        ['3. View or download documentation', ['Click “View” to preview documentation online', 'Click “Download” to save a document locally']],
        ['4. Report issues', ['If you find incorrect documentation information, submit feedback from the document detail page', 'Describe the issue and we will follow up as soon as possible']],
      ],
      tip: 'Note: All documentation is uploaded by companies. EU-DOC does not guarantee authenticity. If in doubt, contact the company directly for confirmation.',
    },
    business: {
      title: 'Company Guide',
      intro: 'As a company user, you can present public product compliance documentation through EU-DOC:',
      sections: [
        ['1. Register an account', ['Open the registration page', 'Register with a company email address', 'Enter the company name if needed']],
        ['2. Create a company profile', ['Log in and enter the admin console', 'Create a company from the company profile area', 'The creator becomes the company owner automatically']],
        ['3. Batch upload documentation', ['Open the Batch Upload page', 'Choose the target company and upload a product documentation folder', 'Follow the guided checks to confirm product, models, document type, and language']],
        ['4. Manage product documentation', ['Open Product Documentation to review archived materials', 'Complete product name, model, dimensions, material, and other basic information', 'Upload or replace missing documentation where needed']],
        ['5. Invite members', ['Invite team members from member management', 'Assign roles such as admin, uploader, or viewer', 'Different roles have different permissions']],
      ],
      tip: 'Company verification: after verification, public company documentation is easier for external users to identify and trust.',
      tipLink: 'Learn about verification',
    },
    regulator: {
      title: 'Reviewer Guide',
      intro: 'As a reviewer, you can quickly find public DoC declarations, certificates, and other product documentation:',
      sections: [
        ['1. Search companies or products', ['Enter a company name, product name, model, or certificate number on the homepage', 'Open a search result to view product details or document details']],
        ['2. View DoC declarations', ['Find DoC Declaration documents on the product detail page', 'Open or download the DoC declaration file', 'If multiple language versions exist, switch within the same document type on the detail page']],
        ['3. Check certificate documentation', ['Review certificate number, issuer, validity period, and related information', 'Open the original file for archiving or further verification', 'Submit feedback if anything appears incorrect']],
        ['4. Multi-language support', ['The platform supports Chinese and English interface switching', 'Company-uploaded content is shown as entered or as contained in the original file; EU-DOC does not automatically translate company documentation']],
      ],
      tip: 'Disclaimer: EU-DOC provides documentation display services only and does not guarantee authenticity. To verify a document, contact the relevant company or issuing organization directly.',
    },
    faqTitle: 'FAQ',
    faqs: [
      ['Q: What if a document cannot be opened?', 'A: Check your network connection or try another browser. If the issue continues, contact support.'],
      ['Q: What if document information appears incorrect?', 'A: Submit feedback on the document detail page and we will contact the company for confirmation.'],
      ['Q: How can I become a company user?', 'A: Register an account, create a company in the admin console, and upload product documentation.'],
      ['Q: Why is company documentation not translated?', 'A: Company names, product names, and document titles are company-entered content. EU-DOC switches interface language but does not rewrite company documentation.'],
    ],
    footerHome: 'Back to Home',
    footerContact: 'Contact',
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
              <li key={item}>{item === '访问注册页面' ? <><span>访问 </span><Link to="/admin/register">注册页面</Link></> : item}</li>
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
  const ui = isEnglishLanguage(i18n.language) ? guides.en : guides.zh;

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
