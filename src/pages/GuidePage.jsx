/**
 * EU-DOC - 使用指南页面
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './LegalPage.module.css';

export default function GuidePage() {
  const [activeTab, setActiveTab] = useState('c-end');

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>使用指南</h1>

        {/* 标签切换 */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('c-end')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'c-end' ? 'var(--accent-gradient)' : 'var(--bg-card)',
              color: activeTab === 'c-end' ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            C端用户
          </button>
          <button
            onClick={() => setActiveTab('b-end')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'b-end' ? 'var(--accent-gradient)' : 'var(--bg-card)',
              color: activeTab === 'b-end' ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            B端企业
          </button>
          <button
            onClick={() => setActiveTab('regulator')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'regulator' ? 'var(--accent-gradient)' : 'var(--bg-card)',
              color: activeTab === 'regulator' ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            审批机构
          </button>
        </div>

        {/* C端用户指南 */}
        {activeTab === 'c-end' && (
          <div className={styles.section}>
            <h2>C端用户使用指南</h2>
            <p>作为消费者、采购商或普通用户，您可以通过本平台：</p>
            
            <h3>1. 搜索产品</h3>
            <ul>
              <li>在首页搜索框输入产品名称、型号或企业名称</li>
              <li>使用搜索建议快速找到目标产品</li>
              <li>点击搜索结果查看产品详情</li>
            </ul>

            <h3>2. 查看合规文档</h3>
            <ul>
              <li>在产品详情页查看所有相关文档</li>
              <li>证书：查看产品是否通过相关认证</li>
              <li>DoC声明：查看企业自我声明文件</li>
              <li>说明书：了解产品使用方法</li>
            </ul>

            <h3>3. 下载文档</h3>
            <ul>
              <li>点击"下载"按钮保存文档到本地</li>
              <li>点击"查看"按钮在线预览文档</li>
            </ul>

            <h3>4. 报告问题</h3>
            <ul>
              <li>如发现文档信息错误，可在证书详情页点击"报告错误"</li>
              <li>填写问题描述后提交，我们会尽快处理</li>
            </ul>

            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-sm)' }}>
              <strong>提示：</strong>所有文档均由企业自行上传，平台不对文档真实性负责。如有疑问，请直接联系企业核实。
            </div>
          </div>
        )}

        {/* B端企业指南 */}
        {activeTab === 'b-end' && (
          <div className={styles.section}>
            <h2>B端企业使用指南</h2>
            <p>作为企业用户，您可以通过本平台展示产品合规文档：</p>

            <h3>1. 注册账号</h3>
            <ul>
              <li>访问 <Link to="/admin/register">注册页面</Link></li>
              <li>使用企业邮箱注册账号</li>
              <li>填写企业名称（可选）</li>
            </ul>

            <h3>2. 创建企业</h3>
            <ul>
              <li>登录后进入管理后台</li>
              <li>在"成员管理"页面创建企业</li>
              <li>创建者自动成为企业所有者</li>
            </ul>

            <h3>3. 创建产品</h3>
            <ul>
              <li>在"产品管理"页面点击"创建产品"</li>
              <li>填写产品名称、型号、分类等信息</li>
              <li>选择所属企业</li>
            </ul>

            <h3>4. 上传文档</h3>
            <ul>
              <li>在产品详情页点击"上传文档"</li>
              <li>选择文档类型（证书、DoC、说明书等）</li>
              <li>填写文档信息（证书编号、有效期等）</li>
              <li>确认声明事项后上传</li>
            </ul>

            <h3>5. 邀请成员</h3>
            <ul>
              <li>在"成员管理"页面邀请团队成员</li>
              <li>设置成员角色（管理员、上传者、查看者）</li>
              <li>不同角色有不同的操作权限</li>
            </ul>

            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 'var(--radius-sm)' }}>
              <strong>企业认证：</strong>完成企业认证后，您的文档将获得认证标识，提升可信度。
              <Link to="/enterprise-agreement" style={{ marginLeft: '8px' }}>了解认证流程</Link>
            </div>
          </div>
        )}

        {/* 审批机构指南 */}
        {activeTab === 'regulator' && (
          <div className={styles.section}>
            <h2>审批机构使用指南</h2>
            <p>作为审批机构，您可以通过本平台查看企业DoC声明文档：</p>

            <h3>1. 搜索企业</h3>
            <ul>
              <li>在首页搜索框输入企业名称</li>
              <li>点击搜索结果查看企业详情</li>
            </ul>

            <h3>2. 查看DoC声明</h3>
            <ul>
              <li>在产品详情页找到"DoC声明"类型文档</li>
              <li>点击查看或下载DoC声明文件</li>
              <li>DoC声明是企业自我声明产品符合相关标准的文件</li>
            </ul>

            <h3>3. 验证证书</h3>
            <ul>
              <li>查看证书编号、签发机构、有效期等信息</li>
              <li>下载证书PDF文件进行存档</li>
              <li>如有疑问，可使用"报告错误"功能</li>
            </ul>

            <h3>4. 多语言支持</h3>
            <ul>
              <li>平台支持中英文界面切换</li>
              <li>DoC声明可能包含多语言版本</li>
            </ul>

            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: 'var(--radius-sm)' }}>
              <strong>免责声明：</strong>平台仅提供文档展示服务，不对文档真实性负责。如需验证文档真伪，请直接联系相关企业或认证机构。
            </div>
          </div>
        )}

        {/* 常见问题 */}
        <div className={styles.section} style={{ marginTop: '32px' }}>
          <h2>常见问题</h2>
          
          <h3>Q: 文档打不开怎么办？</h3>
          <p>A: 请检查网络连接，或尝试使用其他浏览器。如问题持续，请联系技术支持。</p>

          <h3>Q: 发现文档信息错误怎么办？</h3>
          <p>A: 可在证书详情页点击"报告错误"提交问题，我们会联系企业核实。</p>

          <h3>Q: 如何成为企业用户？</h3>
          <p>A: 注册账号后，在管理后台创建企业并上传产品文档即可。</p>

          <h3>Q: 文档多久审核一次？</h3>
          <p>A: 普通用户上传的文档需要管理员审核，企业认证用户上传的文档自动通过。</p>
        </div>

        <div className={styles.footer}>
          <Link to="/">返回首页</Link>
          <Link to="/contact">联系我们</Link>
        </div>
      </div>
    </div>
  );
}
