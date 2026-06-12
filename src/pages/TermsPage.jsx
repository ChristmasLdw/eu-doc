/**
 * EU-DOC 用户服务协议展示页面
 * 版本: 1.0.0
 *
 * 功能: 展示用户服务协议内容，支持中英文
 */

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styles from './LegalPage.module.css';

export default function TermsPage() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  return (
    <div className={styles.legalPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link to="/" className={styles.backLink}>
            ← {t('common.back')}
          </Link>
          <h1 className={styles.title}>
            {isZh ? '用户服务协议' : 'Terms of Service'}
          </h1>
          <p className={styles.meta}>
            {isZh ? '生效日期：2026年6月12日 | 版本：1.0' : 'Effective Date: June 12, 2026 | Version: 1.0'}
          </p>
        </div>

        <div className={styles.content}>
          {isZh ? (
            // 中文版本
            <>
              <section>
                <h2>一、服务说明</h2>
                <h3>1.1 服务定位</h3>
                <p>EU-DOC（以下简称"本平台"）是一个<strong>证书存储和分享平台</strong>，为用户提供证书文件的在线存储、管理和分享服务。</p>
                <p className={styles.highlight}><strong>重要声明：本平台不是认证机构，不对证书的真实性、有效性进行认证或背书。</strong></p>

                <h3>1.2 服务内容</h3>
                <ul>
                  <li>证书文件的在线存储</li>
                  <li>证书信息的展示和查询</li>
                  <li>证书分享链接生成</li>
                  <li>证书到期提醒（付费功能）</li>
                  <li>证书批量管理（付费功能）</li>
                </ul>
              </section>

              <section>
                <h2>二、用户责任</h2>
                <h3>2.1 真实性责任</h3>
                <p className={styles.highlight}><strong>用户对其上传的所有证书内容的真实性、准确性、合法性承担全部责任。</strong></p>

                <p>用户保证：</p>
                <ol>
                  <li>上传的证书是由合法认证机构颁发的真实证书</li>
                  <li>拥有上传和分享该证书的合法权限</li>
                  <li>证书内容不侵犯任何第三方的知识产权或其他合法权益</li>
                  <li>不上传虚假、伪造、过期或失效的证书</li>
                </ol>

                <h3>2.2 违规后果</h3>
                <p>如用户违反上述保证，应承担以下责任：</p>
                <ul>
                  <li>立即删除违规内容</li>
                  <li>赔偿因此给平台或第三方造成的一切损失</li>
                  <li>承担相应的法律责任</li>
                  <li>平台有权终止服务并封禁账户</li>
                </ul>
              </section>

              <section>
                <h2>三、平台责任</h2>
                <h3>3.1 平台定位</h3>
                <p>本平台仅提供技术服务，不对用户上传的证书内容进行实质性审查。</p>

                <p><strong>本平台不对以下内容承担责任：</strong></p>
                <ol>
                  <li>证书的真实性、有效性、准确性</li>
                  <li>证书是否符合相关法律法规要求</li>
                  <li>证书是否被撤销、吊销或失效</li>
                  <li>用户因使用证书而产生的任何法律纠纷</li>
                </ol>

                <h3>3.2 免责声明</h3>
                <p className={styles.highlight}><strong>证书的唯一权威验证方是颁发该证书的认证机构。如需验证证书真伪，请联系颁发机构。</strong></p>
              </section>

              <section>
                <h2>四、举报机制</h2>
                <p>如您发现平台上有虚假、伪造或侵权的证书，请通过邮件或电话举报。我们将在收到举报后 3 个工作日内进行核查。</p>
              </section>

              <section>
                <h2>五、法律适用</h2>
                <p>本协议适用中华人民共和国法律。因本协议引起的争议，双方应友好协商解决；协商不成的，任何一方可向平台所在地人民法院提起诉讼。</p>
              </section>

              <section>
                <h2>六、联系方式</h2>
                <p>如对本协议有任何疑问，请联系我们。</p>
              </section>
            </>
          ) : (
            // 英文版本
            <>
              <section>
                <h2>1. Service Description</h2>
                <h3>1.1 Platform Positioning</h3>
                <p>EU-DOC (the "Platform") is a <strong>certificate storage and sharing platform</strong> that provides online storage, management, and sharing services for certificate files.</p>
                <p className={styles.highlight}><strong>Important Notice: This platform is not a certification authority and does not authenticate or endorse the authenticity or validity of certificates.</strong></p>

                <h3>1.2 Services Provided</h3>
                <ul>
                  <li>Online storage of certificate files</li>
                  <li>Display and query of certificate information</li>
                  <li>Certificate sharing link generation</li>
                  <li>Certificate expiry reminders (paid feature)</li>
                  <li>Batch certificate management (paid feature)</li>
                </ul>
              </section>

              <section>
                <h2>2. User Responsibilities</h2>
                <h3>2.1 Authenticity Responsibility</h3>
                <p className={styles.highlight}><strong>Users bear full responsibility for the authenticity, accuracy, and legality of all certificate content they upload.</strong></p>

                <p>Users guarantee that:</p>
                <ol>
                  <li>Uploaded certificates are genuine certificates issued by legitimate certification authorities</li>
                  <li>They have legal authority to upload and share the certificates</li>
                  <li>Certificate content does not infringe on any third party's intellectual property or other legal rights</li>
                  <li>They will not upload false, forged, expired, or invalid certificates</li>
                </ol>

                <h3>2.2 Consequences of Violation</h3>
                <p>If users violate the above guarantees, they shall:</p>
                <ul>
                  <li>Immediately delete the violating content</li>
                  <li>Compensate for all losses caused to the platform or third parties</li>
                  <li>Bear corresponding legal responsibilities</li>
                  <li>The platform reserves the right to terminate service and ban the account</li>
                </ul>
              </section>

              <section>
                <h2>3. Platform Responsibilities</h2>
                <h3>3.1 Platform Positioning</h3>
                <p>This platform only provides technical services and does not conduct substantive review of user-uploaded certificate content.</p>

                <p><strong>The platform is not responsible for:</strong></p>
                <ol>
                  <li>The authenticity, validity, or accuracy of certificates</li>
                  <li>Whether certificates comply with relevant laws and regulations</li>
                  <li>Whether certificates have been revoked, cancelled, or invalidated</li>
                  <li>Any legal disputes arising from the use of certificates</li>
                </ol>

                <h3>3.2 Disclaimer</h3>
                <p className={styles.highlight}><strong>The only authoritative verifier of certificates is the issuing certification authority. To verify certificate authenticity, please contact the issuing authority.</strong></p>
              </section>

              <section>
                <h2>4. Reporting Mechanism</h2>
                <p>If you discover false, forged, or infringing certificates on the platform, please report via email or phone. We will investigate within 3 business days of receiving the report.</p>
              </section>

              <section>
                <h2>5. Applicable Law</h2>
                <p>This agreement is governed by the laws of the People's Republic of China. Disputes arising from this agreement shall be resolved through friendly negotiation; if negotiation fails, either party may file a lawsuit with the people's court where the platform is located.</p>
              </section>

              <section>
                <h2>6. Contact Information</h2>
                <p>If you have any questions about this agreement, please contact us.</p>
              </section>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <p>{isZh ? '注册即表示您已充分理解并同意接受本协议的所有条款。' : 'By registering, you indicate that you have fully understood and agreed to accept all terms of this agreement.'}</p>
        </div>
      </div>
    </div>
  );
}
