/**
 * EU-DOC - 上传承诺书
 */

import { Link } from 'react-router-dom';
import styles from './LegalPage.module.css';

export default function UploadCommitmentPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>文档上传承诺书</h1>
        <p className={styles.updateDate}>最后更新：2026年6月24日</p>

        <section className={styles.section}>
          <h2>上传者声明与承诺</h2>
          <p>
            在上传任何文档到 EU-DOC 平台之前，上传者必须仔细阅读并同意以下承诺条款。
            点击"确认"即表示您已理解并接受本承诺书的全部内容。
          </p>
        </section>

        <section className={styles.section}>
          <h2>1. 文档真实性承诺</h2>
          <p>本人郑重声明并承诺：</p>
          <ul>
            <li>上传的文档内容真实、准确、完整</li>
            <li>文档中的所有信息均来自合法、可靠的来源</li>
            <li>文档未经篡改、伪造或虚构</li>
            <li>文档的扫描件、照片与原件一致</li>
            <li>证书编号、有效期、认证标准、适用型号、语言版本等关键信息准确无误</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. 授权确认</h2>
          <p>本人确认：</p>
          <ul>
            <li>有权代表相关企业或组织上传该文档</li>
            <li>已获得企业管理层或相关权利人的明确授权</li>
            <li>有权将该文档在 EU-DOC 平台上公开展示</li>
            <li>上传行为不违反任何内部规章制度或保密协议</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. 知识产权声明</h2>
          <p>本人承诺：</p>
          <ul>
            <li>上传的文档不侵犯任何第三方的知识产权</li>
            <li>文档中的商标、标识、技术数据等均有合法使用权</li>
            <li>如涉及第三方内容，已获得相应的授权或许可</li>
            <li>对文档内容可能引发的知识产权纠纷承担全部责任</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. 法律责任承诺</h2>
          <p>本人理解并同意：</p>
          <ul>
            <li>对上传文档的真实性、合法性承担全部法律责任</li>
            <li>如因上传虚假、违法或侵权文档导致的一切法律后果，由本人承担</li>
            <li>平台有权在发现问题时立即下架或删除相关文档</li>
            <li>如给平台或第三方造成损失，本人承担赔偿责任</li>
            <li>严重违规行为可能导致账号被封禁，并追究法律责任</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. 信息准确性维护</h2>
          <p>本人承诺：</p>
          <ul>
            <li>定期检查已上传文档的有效性</li>
            <li>在文档过期、失效或信息变更时及时更新或删除</li>
            <li>对文档相关的查询或质疑及时作出回应</li>
            <li>配合平台或相关机构的合规性审查</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. 免责声明接受</h2>
          <p>本人确认已阅读并接受：</p>
          <ul>
            <li>
              平台的<Link to="/disclaimer">免责声明</Link>
            </li>
            <li>
              <Link to="/terms">服务条款</Link>
            </li>
            <li>
              <Link to="/privacy">隐私政策</Link>
            </li>
            <li>
              <Link to="/enterprise-agreement">企业入驻协议</Link>（如适用）
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>7. 平台状态理解</h2>
          <p>本人理解并同意：</p>
          <ul>
            <li>企业认证、文件公开、平台审核或页面展示，不代表平台对文件真实性或产品合规性作出背书</li>
            <li>如文件被举报、质疑或监管机构要求核查，平台有权先行隐藏、标记核查中或下架相关文件</li>
            <li>上传方应在平台要求的合理期限内提供原件、发证机构证明或其他补充资料</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>8. 记录与审计</h2>
          <p>本人知晓并同意：</p>
          <ul>
            <li>上传操作将被完整记录，包括时间、IP地址、操作设备等信息</li>
            <li>本承诺书的确认记录将被永久保存，作为法律证据</li>
            <li>平台管理员可查看所有上传确认记录</li>
            <li>相关机构或执法部门可依法调取上传记录</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>9. 违规处理</h2>
          <p>如发现违反本承诺书的行为，平台有权：</p>
          <ul>
            <li>立即下架或删除相关文档</li>
            <li>暂停或终止违规账号</li>
            <li>向相关企业或组织通报</li>
            <li>向执法机关报告</li>
            <li>追究法律责任并索赔损失</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>10. 承诺书效力</h2>
          <p>
            本承诺书自上传者点击"确认"时生效，对每一次文档上传行为均具有约束力。
            上传者每次上传文档时都必须重新确认本承诺书。
          </p>
        </section>

        <section className={styles.section}>
          <h2>11. 联系方式</h2>
          <p>
            如对本承诺书有任何疑问，请联系我们：
          </p>
          <p>
            邮箱：contact@eu-doc.com<br />
            平台地址：<Link to="/">EU-DOC 首页</Link>
          </p>
        </section>

        <div className={styles.footer}>
          <Link to="/">返回首页</Link>
          <Link to="/disclaimer">免责声明</Link>
          <Link to="/terms">服务条款</Link>
          <Link to="/privacy">隐私政策</Link>
        </div>
      </div>
    </div>
  );
}
