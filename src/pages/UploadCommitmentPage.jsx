/**
 * EU-DOC - 上传承诺书
 */

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usesEnglishFallback } from '../utils/languageContent';
import { getLanguageCode } from '../i18n/languages';
import styles from './LegalPage.module.css';

const content = {
  zh: {
    title: '产品资料上传承诺书',
    updated: '最后更新：2026年6月24日',
    sections: [
      ['上传者声明与承诺', ['在上传任何产品资料到 EU-DOC 平台之前，上传者必须仔细阅读并同意以下承诺条款。点击“确认”即表示您已理解并接受本承诺书的全部内容。']],
      ['1. 资料真实性承诺', ['本人郑重声明并承诺：'], ['上传的资料内容真实、准确、完整', '资料中的所有信息均来自合法、可靠的来源', '资料未经篡改、伪造或虚构', '资料的扫描件、照片与原件一致', '证书编号、有效期、认证标准、适用型号、语言版本等关键信息准确无误']],
      ['2. 授权确认', ['本人确认：'], ['有权代表相关企业或组织上传该资料', '已获得企业管理层或相关权利人的明确授权', '有权将该资料作为产品公开资料在 EU-DOC 平台上展示', '上传行为不违反任何内部规章制度或保密协议']],
      ['公开资料范围', ['EU-DOC 仅建议上传本来需要对客户、消费者、采购商或审核机构公开的产品资料，例如资质证书、DoC 声明、使用说明书和公开检测报告。', '请勿上传图纸、配方、BOM、供应商名单、报价、生产工艺、内部测试记录、客户合同、个人隐私或未公开新品资料等商业敏感内容。']],
      ['3. 知识产权声明', ['本人承诺：'], ['上传的资料不侵犯任何第三方的知识产权', '资料中的商标、标识、技术数据等均有合法使用权', '如涉及第三方内容，已获得相应的授权或许可', '对资料内容可能引发的知识产权纠纷承担全部责任']],
      ['4. 法律责任承诺', ['本人理解并同意：'], ['对上传资料的真实性、合法性承担全部法律责任', '如因上传虚假、违法或侵权资料导致的一切法律后果，由本人承担', '平台有权在发现问题时立即下架或删除相关资料', '如给平台或第三方造成损失，本人承担赔偿责任', '严重违规行为可能导致账号被封禁，并追究法律责任']],
      ['5. 信息准确性维护', ['本人承诺：'], ['定期检查已上传资料的有效性', '在资料过期、失效或信息变更时及时更新或删除', '对资料相关的查询或质疑及时作出回应', '配合平台或相关机构的合规性审查']],
      ['6. 免责声明接受', ['本人确认已阅读并接受平台的免责声明、服务条款、隐私政策及企业入驻协议（如适用）。']],
      ['7. 平台状态理解', ['本人理解并同意：'], ['企业认证、资料公开、平台审核或页面展示，不代表平台对资料真实性或产品合规性作出背书', '如资料被举报、质疑或监管机构要求核查，平台有权先行隐藏、标记核查中或下架相关资料', '上传方应在平台要求的合理期限内提供原件、发证机构证明或其他补充资料', '上传方可在后台整理、更新、隐藏或下架资料，但对于已被第三方下载、截图或转发的内容，平台无法完全控制']],
      ['8. 记录与审计', ['本人知晓并同意：'], ['上传操作将被完整记录，包括时间、IP 地址、操作设备等信息', '本承诺书的确认记录将被保存，作为必要的合规记录', '平台管理员可查看上传确认记录', '相关机构或执法部门可依法调取上传记录']],
      ['9. 违规处理', ['如发现违反本承诺书的行为，平台有权：'], ['立即下架或删除相关资料', '暂停或终止违规账号', '向相关企业或组织通报', '向执法机关报告', '追究法律责任并索赔损失']],
      ['10. 承诺书效力', ['本承诺书自上传者点击“确认”时生效，对每一次资料上传行为均具有约束力。上传者每次上传资料时都必须重新确认本承诺书。']],
      ['11. 联系方式', ['如对本承诺书有任何疑问，请联系我们：\n邮箱：327114305@qq.com\n电话：18069839326']],
    ],
    footer: ['返回首页', '免责声明', '服务条款', '隐私政策'],
  },
  en: {
    title: 'Product Documentation Upload Commitment',
    updated: 'Last updated: June 24, 2026',
    sections: [
      ['Uploader Declaration and Commitment', ['Before uploading any product documentation to EU-DOC, the uploader must carefully read and agree to the following commitment terms. Clicking “Confirm” means you understand and accept all terms of this commitment.']],
      ['1. Authenticity Commitment', ['I solemnly declare and commit that:'], ['The uploaded documentation is authentic, accurate, and complete', 'All information in the documentation comes from lawful and reliable sources', 'The documentation has not been altered, forged, or fabricated', 'Scans or photos are consistent with the original documents', 'Key information such as certificate number, validity period, standard, applicable models, and language version is accurate']],
      ['2. Authorization Confirmation', ['I confirm that:'], ['I am authorized to upload the documentation on behalf of the relevant company or organization', 'I have obtained proper authorization from company management or rights holders', 'I am authorized to display the documentation as public product documentation on EU-DOC', 'The upload does not violate internal rules or confidentiality agreements']],
      ['Public Documentation Scope', ['EU-DOC recommends uploading only product documentation intended for customers, consumers, buyers, or reviewers, such as certificates, DoC declarations, user manuals, and public test reports.', 'Do not upload drawings, formulas, BOMs, supplier lists, quotations, production processes, internal test records, customer contracts, personal information, unreleased product materials, or other commercially sensitive information.']],
      ['3. Intellectual Property Statement', ['I commit that:'], ['The uploaded documentation does not infringe third-party intellectual property rights', 'Trademarks, marks, technical data, and other content are used lawfully', 'If third-party content is involved, necessary authorization or permission has been obtained', 'I bear full responsibility for intellectual property disputes caused by the documentation']],
      ['4. Legal Responsibility Commitment', ['I understand and agree that:'], ['I bear full legal responsibility for the authenticity and legality of uploaded documentation', 'I bear all legal consequences caused by uploading false, illegal, or infringing documentation', 'The platform may immediately remove or delete related documentation when issues are found', 'I am responsible for compensating losses caused to the platform or third parties', 'Serious violations may result in account suspension and legal action']],
      ['5. Information Accuracy Maintenance', ['I commit to:'], ['Regularly check the validity of uploaded documentation', 'Update or delete documentation when it expires, becomes invalid, or changes', 'Respond to inquiries or challenges related to the documentation in a timely manner', 'Cooperate with compliance reviews by the platform or relevant organizations']],
      ['6. Acceptance of Disclaimers', ['I confirm that I have read and accepted the platform Disclaimer, Terms of Service, Privacy Policy, and Enterprise Onboarding Agreement where applicable.']],
      ['7. Understanding of Platform Status', ['I understand and agree that:'], ['Company verification, public documentation, platform review, or page display does not mean EU-DOC endorses documentation authenticity or product compliance', 'If documentation is reported, challenged, or requested for verification by regulators, the platform may hide, mark for review, or take down related documentation first', 'The uploader should provide originals, issuer confirmation, or other supplementary materials within a reasonable period requested by the platform', 'The uploader may organize, update, hide, or take down documentation in the admin console, but the platform cannot fully control content already downloaded, screenshotted, or forwarded by third parties']],
      ['8. Records and Audit', ['I acknowledge and agree that:'], ['Upload actions will be recorded, including time, IP address, and device information', 'Confirmation records for this commitment will be stored as necessary compliance records', 'Platform administrators may view upload confirmation records', 'Relevant authorities may obtain upload records according to law']],
      ['9. Violation Handling', ['If a violation of this commitment is found, the platform may:'], ['Immediately take down or delete related documentation', 'Suspend or terminate violating accounts', 'Notify related companies or organizations', 'Report to law enforcement authorities', 'Pursue legal responsibility and compensation for losses']],
      ['10. Effect of Commitment', ['This commitment becomes effective when the uploader clicks “Confirm” and applies to each documentation upload. The uploader must reconfirm this commitment for each upload.']],
      ['11. Contact', ['If you have any questions about this commitment, please contact us:\nEmail: 327114305@qq.com\nPhone: 18069839326']],
    ],
    footer: ['Back to Home', 'Disclaimer', 'Terms', 'Privacy'],
  },
};

function renderText(text) {
  return String(text).split('\n').map((line, index) => <span key={line + index}>{line}{index < String(text).split('\n').length - 1 && <br />}</span>);
}

export default function UploadCommitmentPage() {
  const { t, i18n } = useTranslation();
  const language = getLanguageCode(i18n.resolvedLanguage);
  const baseUi = usesEnglishFallback(language) ? content.en : content.zh;
  const ui = language === 'de' ? { ...baseUi, title: t('legal.uploadCommitmentTitle'), updated: t('legal.updatedJune24') } : baseUi;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>{ui.title}</h1>
        <p className={styles.updateDate}>{ui.updated}</p>
        {language === 'de' && (
          <section className={styles.section}>
            <p><strong>{t('legal.englishFallback')}</strong></p>
          </section>
        )}
        {ui.sections.map(([title, paragraphs, items]) => (
          <section className={styles.section} key={title}>
            <h2>{title}</h2>
            {paragraphs.map((text) => <p key={text}>{renderText(text)}</p>)}
            {items && <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>}
          </section>
        ))}
        <div className={styles.footer}>
          <Link to="/">{ui.footer[0]}</Link>
          <Link to="/disclaimer">{ui.footer[1]}</Link>
          <Link to="/terms">{ui.footer[2]}</Link>
          <Link to="/privacy">{ui.footer[3]}</Link>
        </div>
      </div>
    </div>
  );
}
