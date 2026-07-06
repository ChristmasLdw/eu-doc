/**
 * EU-DOC 隐私政策展示页面
 * 版本: 1.0.0
 *
 * 功能: 展示隐私政策内容，支持中英文
 */

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styles from './LegalPage.module.css';

export default function PrivacyPage() {
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
            {isZh ? '隐私政策' : 'Privacy Policy'}
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
                <h2>一、引言</h2>
                <p>EU-DOC（以下简称"我们"）非常重视用户的隐私保护。本隐私政策说明我们如何收集、使用、存储和保护您的个人信息。</p>
                <p className={styles.highlight}><strong>请在使用本平台前仔细阅读本隐私政策。</strong></p>
              </section>

              <section>
                <h2>二、我们收集的信息</h2>
                <h3>2.1 账户信息</h3>
                <ul>
                  <li>用户名</li>
                  <li>密码（加密存储）</li>
                  <li>公司名称（可选）</li>
                  <li>联系方式（可选）</li>
                </ul>

                <h3>2.2 产品公开资料信息</h3>
                <ul>
                  <li>证书编号、产品名称、型号</li>
                  <li>发证机构、有效期</li>
                  <li>上传的证书、DoC 声明、说明书、公开检测报告等产品资料</li>
                </ul>

                <h3>2.3 日志信息</h3>
                <ul>
                  <li>IP 地址、访问时间</li>
                  <li>操作记录（上传、删除、分享）</li>
                  <li>设备信息（浏览器类型、操作系统）</li>
                </ul>

                <h3>2.4 Cookies</h3>
                <p>我们使用 Cookies 来保持登录状态、记住用户偏好设置、分析网站使用情况。</p>
              </section>

              <section>
                <h2>三、信息使用方式</h2>
                <h3>3.1 提供服务</h3>
                <ul>
                  <li>存储和展示企业主动公开的产品资料</li>
                  <li>生成分享链接</li>
                  <li>发送到期提醒（需用户授权）</li>
                </ul>

                <h3>3.2 改进服务</h3>
                <ul>
                  <li>分析用户使用习惯，优化产品功能</li>
                  <li>统计证书类型分布，提供行业报告</li>
                </ul>

                <p className={styles.highlight}><strong>我们承诺不会将您的个人信息用于其他目的。</strong></p>
              </section>

              <section>
                <h2>四、信息共享</h2>
                <h3>4.1 不共享原则</h3>
                <p>我们不会向任何第三方出售、出租或交易您的个人信息。</p>

                <h3>4.2 例外情况</h3>
                <p>以下情况下，我们可能需要共享您的信息：</p>
                <ol>
                  <li><strong>法律要求</strong> - 司法机关依法要求</li>
                  <li><strong>用户授权</strong> - 您明确同意的情况</li>
                  <li><strong>服务提供商</strong> - 云存储、CDN 等技术服务商（已签订保密协议）</li>
                </ol>

                <h3>4.3 公开信息</h3>
                <p>以下信息可能被公开展示：企业主动公开的证书编号、产品名称、型号、公司名称、证书状态、DoC 声明、说明书和公开检测报告等产品资料。</p>
                <p className={styles.highlight}><strong>请勿上传商业秘密、个人隐私或不适合公开展示的内容。用户主动分享的资料链接，任何持有链接的人都可能访问。</strong></p>
              </section>

              <section>
                <h2>五、信息安全</h2>
                <h3>5.1 安全措施</h3>
                <ul>
                  <li><strong>加密传输</strong> - HTTPS 加密通信</li>
                  <li><strong>加密存储</strong> - 密码使用 bcrypt 加密</li>
                  <li><strong>访问控制</strong> - 严格的权限管理</li>
                  <li><strong>安全审计</strong> - 定期安全检查和漏洞扫描</li>
                  <li><strong>数据备份</strong> - 每日自动备份，异地容灾</li>
                </ul>

                <h3>5.2 安全事件</h3>
                <p>如发生数据泄露事件，我们将在 72 小时内通知受影响的用户，并向监管部门报告。</p>
              </section>

              <section>
                <h2>六、您的权利</h2>
                <ul>
                  <li><strong>访问权</strong> - 随时登录账户查看和下载您的个人信息</li>
                  <li><strong>更正权</strong> - 如发现信息有误，您可以自行修改</li>
                  <li><strong>删除权</strong> - 您可以删除证书信息或注销账户</li>
                  <li><strong>撤回授权</strong> - 您可以随时撤回授权（如邮件提醒）</li>
                </ul>
              </section>

              <section>
                <h2>七、联系我们</h2>
                <p>如对本隐私政策有任何疑问，或需要行使您的权利，请联系我们。</p>
              </section>
            </>
          ) : (
            // 英文版本
            <>
              <section>
                <h2>1. Introduction</h2>
                <p>EU-DOC ("we") values user privacy protection. This privacy policy explains how we collect, use, store, and protect your personal information.</p>
                <p className={styles.highlight}><strong>Please read this privacy policy carefully before using our platform.</strong></p>
              </section>

              <section>
                <h2>2. Information We Collect</h2>
                <h3>2.1 Account Information</h3>
                <ul>
                  <li>Username</li>
                  <li>Password (encrypted storage)</li>
                  <li>Company name (optional)</li>
                  <li>Contact information (optional)</li>
                </ul>

                <h3>2.2 Certificate Information</h3>
                <ul>
                  <li>Certificate number, product name, model</li>
                  <li>Issuing authority, validity period</li>
                  <li>Uploaded certificate files (PDF)</li>
                </ul>

                <h3>2.3 Log Information</h3>
                <ul>
                  <li>IP address, access time</li>
                  <li>Operation records (upload, delete, share)</li>
                  <li>Device information (browser type, operating system)</li>
                </ul>

                <h3>2.4 Cookies</h3>
                <p>We use cookies to maintain login status, remember user preferences, and analyze website usage.</p>
              </section>

              <section>
                <h2>3. How We Use Information</h2>
                <h3>3.1 Service Provision</h3>
                <ul>
                  <li>Store and display certificate information</li>
                  <li>Generate sharing links</li>
                  <li>Send expiry reminders (with user authorization)</li>
                </ul>

                <h3>3.2 Service Improvement</h3>
                <ul>
                  <li>Analyze user behavior to optimize features</li>
                  <li>Provide industry reports based on certificate statistics</li>
                </ul>

                <p className={styles.highlight}><strong>We will not use your personal information for any other purposes.</strong></p>
              </section>

              <section>
                <h2>4. Information Sharing</h2>
                <h3>4.1 Non-Sharing Principle</h3>
                <p>We will not sell, rent, or trade your personal information to any third party.</p>

                <h3>4.2 Exceptions</h3>
                <p>We may need to share your information in the following cases:</p>
                <ol>
                  <li><strong>Legal Requirements</strong> - As required by judicial authorities</li>
                  <li><strong>User Authorization</strong> - With your explicit consent</li>
                  <li><strong>Service Providers</strong> - Cloud storage, CDN, and other technical service providers (with confidentiality agreements)</li>
                </ol>

                <h3>4.3 Public Information</h3>
                <p>The following information may be publicly displayed: certificate number, product name, model, company name, certificate status.</p>
                <p className={styles.highlight}><strong>Note: Certificate links shared by users are accessible to anyone with the link.</strong></p>
              </section>

              <section>
                <h2>5. Information Security</h2>
                <h3>5.1 Security Measures</h3>
                <ul>
                  <li><strong>Encrypted Transmission</strong> - HTTPS encrypted communication</li>
                  <li><strong>Encrypted Storage</strong> - Passwords encrypted with bcrypt</li>
                  <li><strong>Access Control</strong> - Strict permission management</li>
                  <li><strong>Security Audits</strong> - Regular security checks and vulnerability scans</li>
                  <li><strong>Data Backup</strong> - Daily automatic backup with off-site disaster recovery</li>
                </ul>

                <h3>5.2 Security Incidents</h3>
                <p>In case of a data breach, we will notify affected users within 72 hours and report to regulatory authorities.</p>
              </section>

              <section>
                <h2>6. Your Rights</h2>
                <ul>
                  <li><strong>Access Right</strong> - View and download your personal information anytime</li>
                  <li><strong>Correction Right</strong> - Modify information if found incorrect</li>
                  <li><strong>Deletion Right</strong> - Delete certificate information or close your account</li>
                  <li><strong>Withdrawal Right</strong> - Withdraw authorization at any time (e.g., email reminders)</li>
                </ul>
              </section>

              <section>
                <h2>7. Contact Us</h2>
                <p>If you have any questions about this privacy policy or need to exercise your rights, please contact us.</p>
              </section>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <p>{isZh ? '感谢您信任 EU-DOC。我们将持续努力保护您的隐私安全。' : 'Thank you for trusting EU-DOC. We will continue to protect your privacy and security.'}</p>
        </div>
      </div>
    </div>
  );
}
