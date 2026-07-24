import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TutorialDemoPage.css';

const chapters = [
  { id: 'welcome', label: '进入网站', title: '找到企业入口', note: '新用户先知道 EU-DOC 能解决什么，再进入注册。' },
  { id: 'register', label: '注册账号', title: '使用工作邮箱注册', note: '当前真实逻辑：注册成功后自动登录并进入后台。' },
  { id: 'company', label: '申请公司', title: '创建公司申请草稿', note: '申请草稿不会公开，也不代表认证已经通过。' },
  { id: 'profile', label: '公司资料', title: '完善企业基础信息', note: '补充公司名称、网址、联系方式、主营分类和简介。' },
  { id: 'verification', label: '申请认证', title: '提交企业认证资料', note: '填写注册号、负责人和联系邮箱，并提交认证申请。' },
  { id: 'upload', label: '批量上传', title: '一次上传整批产品资料', note: '这是教程的核心：文件先进入待整理区，不会自动公开。' },
  { id: 'recognition', label: '智能分组', title: '系统自动识别和分组', note: '根据文件名和 PDF 文字，把资料整理成可能属于同一产品的卡片。' },
  { id: 'questionnaire', label: '问卷确认', title: '用四个问题完成归档', note: '确认同一产品、产品归属、资料类型与语言，最后提交。' },
  { id: 'result', label: '查看结果', title: '资料自动进入对应产品', note: '产品、型号和多份资料一次建立，不再逐份重复操作。' },
  { id: 'edit', label: '后续编辑', title: '继续编辑产品和资料', note: '可以修改产品信息、预览或替换文件，并补充缺失资料。' },
];

const uploadedFiles = [
  ['F66_CE_Certificate.pdf', '1.8 MB'],
  ['F66_UKCA_Certificate.pdf', '1.6 MB'],
  ['F66_DoC_EN.pdf', '620 KB'],
  ['F66_DoC_DE.pdf', '635 KB'],
  ['F20_CE_Certificate.pdf', '1.4 MB'],
  ['F20_Test_Report.pdf', '2.2 MB'],
  ['F20_DoC_EN.pdf', '590 KB'],
  ['F20_DoC_FR.pdf', '604 KB'],
  ['F20_User_Manual.pdf', '4.8 MB'],
  ['F60_Certificate.pdf', '1.3 MB'],
  ['F60_DoC_EN.pdf', '570 KB'],
  ['F60_Manual.pdf', '3.6 MB'],
];

const groupedFiles = [
  { model: 'F66-608 系列', count: 4, languages: 'EN / DE', confidence: '高可信', tone: 'high', docs: '2 份证书 · 2 份 DoC' },
  { model: 'F20 系列', count: 5, languages: 'EN / FR', confidence: '高可信', tone: 'high', docs: '证书 · 报告 · DoC · 说明书' },
  { model: 'F60 系列', count: 3, languages: 'EN', confidence: '需确认', tone: 'medium', docs: '证书 · DoC · 说明书' },
];

function Field({ label, value, wide = false }) {
  return (
    <label className={`sim-field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      <div>{value}</div>
    </label>
  );
}

function AdminFrame({ active = '开始使用', title, subtitle, children }) {
  const menus = ['开始使用', '公司资料', '企业认证', '产品资料', '批量导入', '资料管理'];
  return (
    <div className="sim-admin">
      <aside className="sim-admin-sidebar">
        <div className="sim-admin-brand"><b>EU-DOC</b><span>企业后台</span></div>
        <div className="sim-company-chip"><span>RF</span><div><strong>锐风安全用品</strong><small>申请草稿</small></div></div>
        <nav>
          {menus.map((menu) => <span key={menu} className={menu === active ? 'active' : ''}>{menu}</span>)}
        </nav>
      </aside>
      <section className="sim-admin-main">
        <header><div><small>锐风安全用品</small><h2>{title}</h2></div><span className="sim-user">陈经理 · 企业申请人</span></header>
        {subtitle && <p className="sim-page-subtitle">{subtitle}</p>}
        <div className="sim-admin-content">{children}</div>
      </section>
    </div>
  );
}

function WelcomeScreen({ onAdvance }) {
  return (
    <div className="sim-public-page">
      <nav><strong>EU-DOC</strong><div><span>搜索资料</span><span>解决方案</span><button onClick={onAdvance}>企业登录 / 注册</button></div></nav>
      <div className="sim-public-hero">
        <div>
          <span className="sim-kicker">PRODUCT DOCUMENT CLOUD</span>
          <h2>把产品资料，<br />变成可信的公开页面。</h2>
          <p>企业集中上传和管理 DoC、证书、说明书与检测报告，并按产品和型号清晰归档。</p>
          <button onClick={onAdvance}>我是企业用户，开始使用 <b>→</b></button>
        </div>
        <div className="sim-value-stack">
          <article><span>12</span><div><strong>多份资料一次上传</strong><small>不用逐个创建、逐个填写</small></div></article>
          <article><span>03</span><div><strong>系统自动识别产品分组</strong><small>文件名与 PDF 文字辅助识别</small></div></article>
          <article><span>04</span><div><strong>问卷确认后自动归档</strong><small>产品、型号、类型和语言一次确认</small></div></article>
        </div>
      </div>
    </div>
  );
}

function RegisterScreen({ onAdvance }) {
  return (
    <div className="sim-auth-page">
      <div className="sim-auth-context"><span>STEP 01</span><h2>创建企业账号</h2><p>使用工作邮箱注册。注册完成后，系统会自动登录并进入企业后台。</p><div><b>✓</b> 密码至少 6 位</div><div><b>✓</b> 同意服务条款和隐私政策</div></div>
      <form className="sim-auth-card" onSubmit={(event) => { event.preventDefault(); onAdvance(); }}>
        <div className="sim-auth-logo">EU-DOC</div>
        <h3>注册账号</h3>
        <p>注册后开始创建和管理企业资料</p>
        <label><span>邮箱 *</span><input readOnly value="manager@ruifeng-safety.com" /></label>
        <label><span>显示名称</span><input readOnly value="陈经理" /></label>
        <label><span>密码 *</span><input readOnly type="password" value="tutorial123" /></label>
        <label><span>确认密码 *</span><input readOnly type="password" value="tutorial123" /></label>
        <label className="sim-check"><input readOnly checked type="checkbox" /> 我已阅读并同意服务条款与隐私政策</label>
        <button type="submit">注册并自动登录</button>
        <small>已经有账号？返回登录</small>
      </form>
    </div>
  );
}

function CompanyScreen({ onAdvance }) {
  return (
    <AdminFrame active="开始使用" title="开始使用" subtitle="先创建或选择公司，再批量上传产品资料。">
      <div className="sim-blocked-preview"><div /><div /><div /></div>
      <div className="sim-modal company-modal">
        <div className="sim-modal-head"><div><h3>创建 / 认领公司</h3><p>这里创建的是公司申请草稿，认证通过前不会公开展示。</p></div><span>×</span></div>
        <div className="sim-tabs"><button className="active">创建新公司</button><button>认领已有公司 <small>待完善</small></button></div>
        <div className="sim-form-grid">
          <Field label="公司名称" value="广州锐风安全用品有限公司" />
          <Field label="英文名称（可选）" value="Guangzhou Ruifeng Safety Products Co., Ltd." />
          <Field label="联系邮箱（可选）" value="contact@ruifeng-safety.com" wide />
        </div>
        <div className="sim-modal-actions"><button>取消</button><button className="primary" onClick={onAdvance}>创建申请草稿</button></div>
      </div>
      <div className="sim-toast">公司申请草稿已创建，可以先批量上传产品资料</div>
    </AdminFrame>
  );
}

function ProfileScreen({ onAdvance }) {
  return (
    <AdminFrame active="公司资料" title="公司资料" subtitle="管理企业公开信息、联系方式和主营分类。">
      <div className="sim-next-card"><div><span>下一步</span><h3>完善公司资料并提交认证</h3><p>资料准备期间也可以先批量上传产品文件。</p></div><button onClick={onAdvance}>前往企业认证</button></div>
      <div className="sim-company-layout">
        <aside><div className="sim-logo-box">RF</div><h3>广州锐风安全用品有限公司</h3><p>c-000128</p><span>我的角色 <b>企业申请人</b></span><span>认证状态 <b>待认证</b></span><span>公开状态 <b>未公开</b></span></aside>
        <div className="sim-form-card">
          <div className="sim-card-head"><div><h3>基本信息</h3><p>这些信息会用于企业资料和后续公开展示。</p></div><button>预览公司页</button></div>
          <div className="sim-form-grid">
            <Field label="公司名称" value="广州锐风安全用品有限公司" />
            <Field label="英文名称" value="Guangzhou Ruifeng Safety Products Co., Ltd." />
            <Field label="联系邮箱" value="contact@ruifeng-safety.com" />
            <Field label="联系电话" value="+86 20 8888 6622" />
            <Field label="官方网站" value="https://ruifeng-safety.com" />
            <Field label="主营分类" value="个人防护装备" />
            <Field label="办公地址" value="广州市白云区安全产业园 18 号" wide />
            <Field label="公司简介" value="专注呼吸防护、听力防护和工业安全用品的研发与制造。" wide />
          </div>
          <div className="sim-form-actions"><button>取消</button><button className="primary">保存公司信息</button></div>
        </div>
      </div>
    </AdminFrame>
  );
}

function VerificationScreen({ onAdvance }) {
  return (
    <AdminFrame active="企业认证" title="企业认证" subtitle="提交真实企业资料，审核通过后再决定是否公开展示。">
      <div className="sim-verify-steps"><div className="done"><b>1</b><span><strong>创建企业</strong><small>已完成</small></span></div><div className="current"><b>2</b><span><strong>提交资料</strong><small>当前步骤</small></span></div><div><b>3</b><span><strong>平台审核</strong><small>待审核</small></span></div></div>
      <div className="sim-verify-grid">
        <div className="sim-form-card">
          <div className="sim-card-head"><div><h3>认证资料</h3><p>如果公司信息变化，后续可重新提交认证。</p></div></div>
          <div className="sim-form-grid">
            <Field label="认证公司名称" value="Guangzhou Ruifeng Safety Products Co., Ltd." />
            <Field label="统一社会信用代码 / 注册号" value="91440101MA9RF2026X" />
            <Field label="法人 / 负责人姓名" value="陈伟" />
            <Field label="联系邮箱" value="verification@ruifeng-safety.com" />
          </div>
          <button className="sim-wide-primary" onClick={onAdvance}>提交认证申请</button>
        </div>
        <div className="sim-qualification-card"><h3>资质资料</h3><div><span>营业执照 / 注册资料</span><b>已上传</b></div><div><span>法人身份证明</span><b>已上传</b></div><div><span>企业授权书</span><em>可选</em></div><p>教程演示不会上传真实敏感资料。</p></div>
      </div>
    </AdminFrame>
  );
}

function UploadScreen({ onAdvance }) {
  return (
    <AdminFrame active="批量导入" title="批量导入" subtitle="先把资料一股脑上传到待整理资料池，再慢慢关联到产品。">
      <div className="sim-upload-top"><div><span className="sim-kicker">核心功能</span><h3>一次选择 12 份产品资料</h3><p>支持多选 PDF、图片或整个文件夹；资料不会自动公开。</p></div><div><button>上传整个文件夹</button><button className="primary" onClick={onAdvance}>选择资料批量上传</button></div></div>
      <div className="sim-upload-progress"><div><span>上传完成，系统正在识别资料信息</span><strong>100%</strong></div><i><b /></i><small>12 份资料 · 广州锐风安全用品有限公司</small></div>
      <div className="sim-file-list">
        {uploadedFiles.map(([name, size], index) => <div key={name}><span className="sim-pdf">PDF</span><strong>{name}</strong><small>{size}</small><em style={{ '--delay': `${index * 40}ms` }}>已上传</em></div>)}
      </div>
      <div className="sim-aha"><span>12</span><div><strong>一次上传，稍后集中确认</strong><small>不需要先创建 3 个产品，也不需要逐份填写 12 次表单。</small></div></div>
    </AdminFrame>
  );
}

function RecognitionScreen({ onAdvance }) {
  return (
    <AdminFrame active="批量导入" title="待整理资料" subtitle="系统正在根据文件名和 PDF 文字辅助分组。">
      <div className="sim-recognition-summary"><div><strong>12</strong><span>已上传文件</span></div><div><strong>3</strong><span>推荐产品分组</span></div><div><strong>0</strong><span>自动公开</span></div><button onClick={onAdvance}>开始问卷确认 →</button></div>
      <div className="sim-group-grid">
        {groupedFiles.map((group, index) => <button key={group.model} className={index === 0 ? 'selected' : ''} onClick={index === 0 ? onAdvance : undefined}><div><span className="sim-doc-icon">DOC</span><em className={group.tone}>{group.confidence}</em></div><h3>{group.model}</h3><p>{group.count} 份资料 · {group.languages}</p><small>{group.docs}</small><footer><span>PDF 文字层已提取</span><b>{index === 0 ? '点击继续整理' : '待整理'}</b></footer></button>)}
      </div>
      <div className="sim-recognition-note"><b>系统建议，不是自动决定：</b> 用户仍然通过问卷确认产品、型号、资料类型和语言。</div>
    </AdminFrame>
  );
}

function QuestionnaireScreen({ onAdvance }) {
  return (
    <AdminFrame active="批量导入" title="批量导入" subtitle="处理 F66-608 系列的 4 份资料。">
      <div className="sim-question-modal">
        <header><div><small>待整理资料</small><h3>F66-608 系列</h3></div><span className="sim-confidence">高可信 · 型号与文件名一致</span></header>
        <div className="sim-recognized-files"><strong>F66_CE_Certificate.pdf</strong><strong>F66_UKCA_Certificate.pdf</strong><strong>F66_DoC_EN.pdf</strong><strong>F66_DoC_DE.pdf</strong></div>
        <div className="sim-questions">
          <section className="done"><b>✓</b><div><h4>这些资料是否属于同一个产品？</h4><p>已确认：四份资料属于 F66-608 系列。</p><button>已确认同一产品</button></div></section>
          <section className="done"><b>✓</b><div><h4>确认归属产品</h4><div className="sim-inline-fields"><Field label="归档方式" value="创建新产品" /><Field label="产品 / 系列名称" value="F66-608 系列" /><Field label="适用型号" value="F66-608 · F66-609" /></div></div></section>
          <section className="done"><b>✓</b><div><h4>确认每份资料的类型和语言</h4><div className="sim-doc-table"><span>F66_CE_Certificate.pdf <b>资质证书</b><em>EN</em></span><span>F66_UKCA_Certificate.pdf <b>资质证书</b><em>EN</em></span><span>F66_DoC_EN.pdf <b>DoC 声明</b><em>EN</em></span><span>F66_DoC_DE.pdf <b>DoC 声明</b><em>DE</em></span></div></div></section>
          <section className="current"><b>4</b><div><h4>最终提交</h4><p>将创建新产品，并归档 4 份保留资料。</p><div className="sim-final-actions"><button className="primary" onClick={onAdvance}>确认提交归档</button><button>跳过整理，稍后处理</button></div></div></section>
        </div>
      </div>
    </AdminFrame>
  );
}

function ResultScreen({ onAdvance }) {
  return (
    <AdminFrame active="产品资料" title="产品资料" subtitle="批量上传和问卷确认后，产品与资料已经自动建立关联。">
      <div className="sim-success-banner"><span>✓</span><div><strong>F66-608 系列已创建，4 份资料已归档</strong><small>另外 8 份资料仍保留在待整理区，可以继续处理。</small></div></div>
      <div className="sim-product-card">
        <header><div><span className="sim-product-thumb">F66</span><div><h3>F66-608 系列</h3><p>适用型号：F66-608 · F66-609</p></div></div><button onClick={onAdvance}>编辑产品</button></header>
        <div className="sim-completeness"><span>资料完整度</span><i><b /></i><strong>75%</strong></div>
        <div className="sim-product-docs"><article><span>CE</span><div><strong>CE Certificate</strong><small>EN · 已归档</small></div></article><article><span>UK</span><div><strong>UKCA Certificate</strong><small>EN · 已归档</small></div></article><article><span>DoC</span><div><strong>Declaration of Conformity</strong><small>EN / DE · 2 份</small></div></article><article className="missing"><span>+</span><div><strong>使用说明书</strong><small>尚未上传</small></div></article></div>
      </div>
      <div className="sim-time-saved"><strong>一次操作完成</strong><span>创建 1 个产品</span><span>关联 2 个型号</span><span>归档 4 份资料</span></div>
    </AdminFrame>
  );
}

function EditScreen() {
  return (
    <AdminFrame active="产品资料" title="产品资料" subtitle="继续维护产品信息和已归档资料。">
      <div className="sim-edit-modal">
        <header><div><small>编辑产品</small><h3>F66-608 系列</h3></div><button>保存修改</button></header>
        <div className="sim-edit-tabs"><span className="active">基础信息</span><span>更多信息</span><span>关联资料 4</span></div>
        <div className="sim-form-grid">
          <Field label="产品 / 系列名称" value="F66-608 系列" />
          <Field label="型号" value="F66-608, F66-609" />
          <Field label="品牌" value="Ruifeng Safety" />
          <Field label="公开状态" value="认证通过后可公开" />
          <Field label="产品描述" value="适用于工业粉尘环境的可更换滤棉式呼吸防护产品。" wide />
        </div>
        <div className="sim-linked-docs"><h4>关联资料</h4><div><span>F66_CE_Certificate.pdf</span><button>预览</button><button>替换</button><button>编辑信息</button></div><div><span>F66_UKCA_Certificate.pdf</span><button>预览</button><button>替换</button><button>编辑信息</button></div><div><span>F66_DoC_EN.pdf</span><button>预览</button><button>替换</button><button>编辑信息</button></div><div className="missing"><span>使用说明书尚未上传</span><button>补充资料</button></div></div>
      </div>
    </AdminFrame>
  );
}

const screenComponents = [WelcomeScreen, RegisterScreen, CompanyScreen, ProfileScreen, VerificationScreen, UploadScreen, RecognitionScreen, QuestionnaireScreen, ResultScreen, EditScreen];

export default function TutorialDemoPage({ liveMode = false }) {
  const navigate = useNavigate();
  const requestedStep = new URLSearchParams(window.location.search).get('step');
  const requestedIndex = chapters.findIndex((chapterItem) => chapterItem.id === requestedStep);
  const [current, setCurrent] = useState(liveMode ? Math.max(requestedIndex, 2) : 0);
  const [playing, setPlaying] = useState(false);
  const [playbackKey, setPlaybackKey] = useState(0);
  const Screen = screenComponents[current];
  const chapter = chapters[current];
  const progress = ((current + 1) / chapters.length) * 100;

  const advance = () => {
    setCurrent((step) => Math.min(step + 1, chapters.length - 1));
    setPlaybackKey((key) => key + 1);
  };

  const previous = () => {
    setCurrent((step) => Math.max(step - 1, 0));
    setPlaybackKey((key) => key + 1);
  };

  useEffect(() => {
    if (!playing) return undefined;
    if (current === chapters.length - 1) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(advance, current === 5 || current === 7 ? 6500 : 4800);
    return () => window.clearTimeout(timer);
  }, [current, playing]);

  const chapterGroups = useMemo(() => [
    ['建立企业身份', chapters.slice(0, 5)],
    ['体验批量上传', chapters.slice(5, 8)],
    ['管理上传结果', chapters.slice(8)],
  ], []);

  useEffect(() => {
    if (!liveMode) return;
    const nextUrl = `/tutorial-live?tutorial=1&step=${chapters[current].id}`;
    window.history.replaceState(null, '', nextUrl);
  }, [current, liveMode]);

  if (liveMode) {
    const livePrevious = () => {
      if (current <= 2) {
        navigate('/admin/register?tutorial=1');
        return;
      }
      previous();
    };

    return (
      <div className="live-tutorial-preview">
        <div className="live-tutorial-banner">
          <div><span>教程预览模式</span><strong>不会创建真实账号、公司或资料</strong></div>
          <div className="live-tutorial-mini-progress">
            {chapters.slice(2).map((item, index) => (
              <button key={item.id} className={`${current === index + 2 ? 'active' : ''} ${current > index + 2 ? 'done' : ''}`} onClick={() => setCurrent(index + 2)} title={item.title}>
                {current > index + 2 ? '✓' : index + 3}
              </button>
            ))}
          </div>
          <button onClick={() => navigate('/')}>退出预览</button>
        </div>

        <div className="live-tutorial-stage" key={`live-${current}-${playbackKey}`}>
          <Screen onAdvance={advance} />
        </div>

        <aside className="live-tutorial-coach">
          <div className="live-coach-number">{String(current + 1).padStart(2, '0')}</div>
          <div><span>{chapter.label}</span><h2>{chapter.title}</h2><p>{chapter.note}</p></div>
          <div className="live-coach-actions">
            <button onClick={livePrevious}>上一步</button>
            <button className="primary" onClick={advance} disabled={current === chapters.length - 1}>{current === chapters.length - 1 ? '教程完成' : '下一步'}</button>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="tutorial-experience">
      <header className="tutorial-topbar">
        <div className="tutorial-brand"><span>EU</span><div><strong>EU-DOC</strong><small>企业用户交互教程</small></div></div>
        <div className="tutorial-top-actions"><span>演示数据，不会提交真实资料</span><button onClick={() => { setCurrent(0); setPlaying(false); }}>重新开始</button><button className="primary" onClick={() => setPlaying((value) => !value)}>{playing ? '暂停演示' : '自动播放'}</button></div>
      </header>

      <main className="tutorial-layout">
        <aside className="tutorial-chapters">
          <div className="tutorial-progress-copy"><span>完整教程</span><strong>{current + 1}<small> / {chapters.length}</small></strong><i><b style={{ width: `${progress}%` }} /></i></div>
          {chapterGroups.map(([group, items]) => <div className="tutorial-chapter-group" key={group}><h3>{group}</h3>{items.map((item) => { const index = chapters.findIndex((chapterItem) => chapterItem.id === item.id); return <button key={item.id} className={`${index === current ? 'active' : ''} ${index < current ? 'done' : ''}`} onClick={() => { setCurrent(index); setPlaybackKey((key) => key + 1); }}><span>{index < current ? '✓' : String(index + 1).padStart(2, '0')}</span><div><strong>{item.label}</strong><small>{item.title}</small></div></button>; })}</div>)}
        </aside>

        <section className="tutorial-player">
          <div className="tutorial-stage" key={`${current}-${playbackKey}`}><Screen onAdvance={advance} /></div>
          <div className="tutorial-coach">
            <div className="tutorial-coach-index">{String(current + 1).padStart(2, '0')}</div>
            <div><span>{chapter.label}</span><h2>{chapter.title}</h2><p>{chapter.note}</p></div>
            <div className="tutorial-controls"><button onClick={previous} disabled={current === 0}>上一步</button><button className="primary" onClick={advance} disabled={current === chapters.length - 1}>{current === chapters.length - 1 ? '教程完成' : '下一步'}</button></div>
          </div>
        </section>
      </main>
    </div>
  );
}
