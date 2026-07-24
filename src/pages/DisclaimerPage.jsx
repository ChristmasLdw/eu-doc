/**
 * EU-DOC - 免责声明页面
 */

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usesEnglishFallback } from '../utils/languageContent';
import { getLanguageCode } from '../i18n/languages';
import styles from './LegalPage.module.css';

const content = {
  zh: {
    title: '免责声明',
    updated: '最后更新：2026年6月22日',
    sections: [
      ['1. 平台定位', ['EU-DOC 是一个产品公开资料展示平台。我们为企业提供上传和展示产品认证证书、DoC 声明、产品使用说明书、公开检测报告等产品资料的服务，为消费者、采购商和审批机构提供查询和验证产品合规性的渠道。', '本平台仅用于管理企业主动公开或适合对外展示的产品资料，不要求也不建议企业上传图纸、配方、BOM、供应商名单、报价、生产工艺、内部测试记录、客户合同、个人隐私或未公开新品资料等商业敏感内容。']],
      ['2. 企业认证与资料真实性', ['平台对企业身份、账号权限或入驻资料进行的审核，仅用于确认企业或账号的基本管理资格，不代表平台对该企业上传的任何证书、DoC 声明、说明书、测试报告或其他产品合规资料的真实性、有效性、完整性、合法性或产品合规状态作出认证、保证或背书。', '除非平台以书面形式明确说明，任何“企业已认证”“资料已公开”“已审核”等状态，均不应被理解为平台确认该资料真实有效或确认相关产品符合法规要求。']],
      ['3. 内容声明', ['平台上展示的所有资料均由企业自行上传，平台仅提供存储和展示服务。平台不对资料的真实性、准确性、完整性或合法性做任何保证或担保。', '用户应自行判断和核实资料内容的真实性，平台不承担因资料内容不实而产生的任何损失或责任。']],
      ['4. 上传者责任', ['资料上传者声明并保证：'], ['上传的资料真实、准确、完整', '有权代表相关企业上传该资料', '上传的资料不侵犯任何第三方的知识产权、商业秘密、隐私或其他合法权益', '上传的资料不包含不适合公开展示的商业敏感内容', '理解并同意，如上传虚假或误导性资料，将承担由此产生的一切法律责任']],
      ['5. 平台责任限制', ['在法律允许的最大范围内，平台：'], ['不对资料内容的真实性、准确性或完整性做出任何保证', '不对因使用或依赖平台上的资料而导致的任何直接或间接损失承担责任', '保留在发现虚假或违规资料时删除或下架该资料的权利', '保留在发现资料包含商业秘密、个人隐私、违法内容或第三方权利争议时隐藏、限制访问或下架的权利', '保留在发现违规行为时暂停或终止用户账号的权利']],
      ['6. 知识产权', ['平台上的资料版权归原作者或相关企业所有。未经权利人书面许可，任何人不得复制、修改、传播或用于商业用途。']],
      ['7. 隐私保护', ['我们重视用户隐私保护。关于个人信息的收集、使用和保护，请参阅我们的隐私政策。']],
      ['8. 免责声明的修改', ['我们可能会不时更新本免责声明。更新后的免责声明将在本页面发布，并注明最新更新日期。继续使用本平台即表示您同意接受更新后的免责声明。']],
      ['9. 联系我们', ['如您对本免责声明有任何疑问，请通过以下方式联系我们：', '邮箱：327114305@qq.com\n电话：18069839326']],
    ],
    footer: ['返回首页', '服务条款', '隐私政策'],
  },
  en: {
    title: 'Disclaimer',
    updated: 'Last updated: June 22, 2026',
    sections: [
      ['1. Platform Position', ['EU-DOC is a public product documentation display platform. We provide tools for companies to upload and present product certificates, DoC declarations, user manuals, public test reports, and related product documentation for consumers, buyers, and reviewers to search and view.', 'The platform is intended only for product documentation that companies choose to make public or that is suitable for external display. Companies should not upload drawings, formulas, BOMs, supplier lists, quotations, production processes, internal test records, customer contracts, personal information, unreleased products, or other commercially sensitive information.']],
      ['2. Company Verification and Document Authenticity', ['Company verification, account checks, or onboarding review are used only to confirm basic company or account management qualifications. They do not mean EU-DOC certifies, guarantees, or endorses the authenticity, validity, completeness, legality, or compliance status of any uploaded certificate, DoC declaration, manual, test report, or other product compliance documentation.', 'Unless explicitly stated in writing by EU-DOC, statuses such as “verified company”, “public documentation”, or “approved” should not be understood as confirmation that a document is authentic or that a product complies with applicable regulations.']],
      ['3. Content Statement', ['All documentation displayed on the platform is uploaded by companies. EU-DOC only provides storage and display services and does not guarantee the authenticity, accuracy, completeness, or legality of the documentation.', 'Users should independently judge and verify documentation content. EU-DOC is not liable for losses or responsibilities arising from inaccurate documentation.']],
      ['4. Uploader Responsibility', ['The uploader represents and warrants that:'], ['The uploaded documentation is authentic, accurate, and complete', 'The uploader has authority to upload the documentation on behalf of the relevant company', 'The documentation does not infringe any third-party intellectual property, trade secrets, privacy, or other lawful rights', 'The documentation does not contain commercially sensitive content unsuitable for public display', 'The uploader understands that false or misleading documentation may result in full legal responsibility']],
      ['5. Limitation of Platform Liability', ['To the maximum extent permitted by law, EU-DOC:'], ['Does not guarantee the authenticity, accuracy, or completeness of documentation content', 'Is not liable for direct or indirect losses caused by using or relying on documentation shown on the platform', 'May remove or take down false or non-compliant documentation', 'May hide, restrict access to, or take down documentation involving trade secrets, personal information, illegal content, or third-party rights disputes', 'May suspend or terminate accounts involved in violations']],
      ['6. Intellectual Property', ['Copyright and related rights in documentation belong to the original authors or relevant companies. No person may copy, modify, distribute, or commercially use such documentation without written permission from the rights holder.']],
      ['7. Privacy Protection', ['We value privacy protection. For collection, use, and protection of personal information, please refer to our Privacy Policy.']],
      ['8. Changes to This Disclaimer', ['We may update this disclaimer from time to time. Updated versions will be published on this page with the latest update date. Continued use of the platform means you accept the updated disclaimer.']],
      ['9. Contact Us', ['If you have any questions about this disclaimer, please contact us:', 'Email: 327114305@qq.com\nPhone: 18069839326']],
    ],
    footer: ['Back to Home', 'Terms', 'Privacy'],
  },
};

function renderText(text) {
  return String(text).split('\n').map((line, index) => <span key={line + index}>{line}{index < String(text).split('\n').length - 1 && <br />}</span>);
}

export default function DisclaimerPage() {
  const { t, i18n } = useTranslation();
  const language = getLanguageCode(i18n.resolvedLanguage);
  const baseUi = usesEnglishFallback(language) ? content.en : content.zh;
  const ui = language === 'de' ? { ...baseUi, title: t('legal.disclaimerTitle'), updated: t('legal.updatedJune22') } : baseUi;

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
          <Link to="/terms">{ui.footer[1]}</Link>
          <Link to="/privacy">{ui.footer[2]}</Link>
        </div>
      </div>
    </div>
  );
}
