/**
 * EU-DOC - 企业入驻协议
 */

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usesEnglishFallback } from '../utils/languageContent';
import { getLanguageCode } from '../i18n/languages';
import styles from './LegalPage.module.css';

const content = {
  zh: {
    title: '企业入驻协议',
    updated: '最后更新：2026年6月22日',
    sections: [
      ['1. 协议范围', ['本协议是企业（以下简称“您”或“入驻企业”）与 EU-DOC 平台（以下简称“平台”）之间关于使用平台服务的法律协议。入驻即表示您同意遵守本协议的所有条款。']],
      ['2. 入驻条件', ['入驻企业需满足以下条件：'], ['具有合法的经营资质和营业执照', '提供真实、准确的企业信息', '同意并遵守本平台的各项规则和政策', '完成企业认证流程']],
      ['3. 企业认证', ['为确保平台资料来源的可信度，入驻企业需完成认证流程。认证需提交营业执照、授权书等相关材料。平台将在收到申请后进行审核。', '认证通过后，企业可获得以下权益：'], ['企业认证标识展示', '产品资料优先审核', '更多产品和资料上传配额']],
      ['4. 认证范围说明', ['企业认证仅代表平台对企业身份或入驻资料进行形式审核，不代表平台对企业上传的产品合规资料或产品本身作出真实性、有效性、合规性认证。企业不得以平台认证、页面展示或资料公开作为平台对资料真实性或产品合规性的背书。']],
      ['5. 产品资料上传规范', ['入驻企业上传的产品资料需符合以下规范：'], ['资料内容真实、准确、完整', '文件格式符合平台要求（PDF、JPG、PNG 等）', '资料不侵犯任何第三方的知识产权、商业秘密、隐私或其他合法权益', '资料不包含违法、违规或不良信息', '上传者确认有权代表企业上传并展示该资料', '不上传图纸、配方、BOM、供应商名单、报价、生产工艺、内部测试记录、客户合同或未公开新品资料等商业敏感内容']],
      ['6. 企业责任', ['入驻企业需承担以下责任：'], ['确保上传资料的真实性和合法性', '及时更新过期或失效的资料', '妥善管理企业账号和成员权限', '对账号下的所有操作承担责任', '如发现资料被滥用或侵权，及时通知平台']],
      ['7. 平台权利', ['平台保有以下权利：'], ['审核、拒绝或下架不符合规范的资料', '暂停或终止违规企业的账号', '修改平台规则和服务条款', '对违规行为追究法律责任']],
      ['8. 费用与结算', ['平台提供免费和付费两种服务模式。付费服务的具体内容、价格和结算方式以平台公布的信息为准。平台有权根据业务发展调整价格策略。']],
      ['9. 协议终止', ['在以下情况下，本协议可能被终止：'], ['企业主动申请退出', '企业严重违反本协议条款', '企业长期未使用平台服务', '平台决定停止运营']],
      ['10. 争议解决', ['因本协议引起的争议，双方应友好协商解决。协商不成的，任何一方均可向平台所在地有管辖权的人民法院提起诉讼。']],
    ],
    footer: ['返回首页', '服务条款', '免责声明'],
  },
  en: {
    title: 'Enterprise Onboarding Agreement',
    updated: 'Last updated: June 22, 2026',
    sections: [
      ['1. Scope of Agreement', ['This agreement is a legal agreement between the company (“you” or “onboarded company”) and EU-DOC (“the platform”) regarding use of platform services. By onboarding, you agree to comply with all terms of this agreement.']],
      ['2. Onboarding Requirements', ['Companies must meet the following requirements:'], ['Hold lawful business qualifications and registration', 'Provide true and accurate company information', 'Agree to and comply with platform rules and policies', 'Complete the company verification process']],
      ['3. Company Verification', ['To improve trust in documentation sources, onboarded companies must complete verification. Verification may require business registration documents, authorization letters, and related materials. The platform will review submitted applications.', 'After verification, companies may receive the following benefits:'], ['Company verification display', 'Priority review for product documentation', 'Higher product and documentation upload quotas']],
      ['4. Scope of Verification', ['Company verification only means the platform has performed a formal review of company identity or onboarding materials. It does not mean the platform certifies, guarantees, or endorses the authenticity, validity, or compliance of uploaded product documentation or the product itself. Companies must not present platform verification, page display, or public documentation as EU-DOC endorsement.']],
      ['5. Product Documentation Upload Rules', ['Product documentation uploaded by companies must comply with the following rules:'], ['Documentation must be authentic, accurate, and complete', 'Files must meet platform format requirements, such as PDF, JPG, and PNG', 'Documentation must not infringe third-party intellectual property, trade secrets, privacy, or other lawful rights', 'Documentation must not contain illegal, non-compliant, or harmful information', 'The uploader confirms authority to upload and display the documentation on behalf of the company', 'Do not upload drawings, formulas, BOMs, supplier lists, quotations, production processes, internal test records, customer contracts, unreleased product materials, or other commercially sensitive information']],
      ['6. Company Responsibilities', ['Onboarded companies are responsible for:'], ['Ensuring uploaded documentation is authentic and lawful', 'Updating expired or invalid documentation in a timely manner', 'Managing company accounts and member permissions properly', 'Taking responsibility for all actions under the company account', 'Notifying the platform if documentation is misused or infringed']],
      ['7. Platform Rights', ['The platform reserves the right to:'], ['Review, reject, or take down documentation that does not meet requirements', 'Suspend or terminate accounts of companies that violate rules', 'Modify platform rules and service terms', 'Pursue legal responsibility for violations']],
      ['8. Fees and Settlement', ['The platform may provide free and paid service models. Details, pricing, and settlement methods for paid services are subject to published platform information. The platform may adjust pricing based on business development.']],
      ['9. Termination', ['This agreement may be terminated under the following circumstances:'], ['The company voluntarily exits', 'The company materially violates this agreement', 'The company does not use platform services for a long period', 'The platform decides to stop operations']],
      ['10. Dispute Resolution', ['Disputes arising from this agreement should be resolved through friendly negotiation. If negotiation fails, either party may bring a claim before a competent court at the platform location.']],
    ],
    footer: ['Back to Home', 'Terms', 'Disclaimer'],
  },
};

export default function EnterpriseAgreementPage() {
  const { t, i18n } = useTranslation();
  const language = getLanguageCode(i18n.resolvedLanguage);
  const baseUi = usesEnglishFallback(language) ? content.en : content.zh;
  const ui = language === 'de' ? { ...baseUi, title: t('legal.enterpriseAgreementTitle'), updated: t('legal.updatedJune22') } : baseUi;

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
            {paragraphs.map((text) => <p key={text}>{text}</p>)}
            {items && <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>}
          </section>
        ))}
        <div className={styles.footer}>
          <Link to="/">{ui.footer[0]}</Link>
          <Link to="/terms">{ui.footer[1]}</Link>
          <Link to="/disclaimer">{ui.footer[2]}</Link>
        </div>
      </div>
    </div>
  );
}
