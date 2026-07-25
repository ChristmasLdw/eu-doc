import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GuideCloud, GuideCursor } from './GuideVisuals';
import { getGuidePopoverStyle, useGuideTargetRect } from './useGuideTargetRect';
import './PublicOnboardingGuide.css';

const SEEN_KEY = 'eu-doc:guide:public:seen';
const PENDING_KEY = 'eu-doc:guide:pending';

// 示例搜索输入配置
const EXAMPLE_SEARCH = {
  sequence: ['F', 'F6', 'F66'],  // 逐步输入的字符序列
  interval: 190,                  // 每个字符之间的间隔（毫秒）
};

const GUIDE_STEPS = {
  'home-purpose': {
    selector: '[data-tutorial="home-purpose-copy"]',
    eyebrow: '先认识 EU-DOC',
    title: '这里展示企业、产品与合规资料',
    description: '采购方和审核机构可以查找公开资料；企业上传后，也会以公司、产品和资料相互关联的方式展示在这里。',
    showCursor: false,
    requiredAction: 'manual',
    spotlight: 'soft',
  },
  'business-purpose': {
    selector: '[data-tutorial="home-purpose-copy"]',
    eyebrow: '企业资料入口',
    title: '一次上传整批资料，系统帮你整理到产品',
    description: '登录企业工作台后，可以批量上传证书、DoC、说明书和报告，再通过问卷快速确认资料归属。',
    showCursor: false,
    requiredAction: 'manual',
    spotlight: 'soft',
  },
  'home-search-input': {
    selector: '[data-tutorial="home-search"]',
    eyebrow: '真实搜索入口',
    title: '先输入想查找的内容',
    description: '可以输入公司名、产品名、型号或资料编号。停止输入后，鼠标会移动到真实搜索按钮；也可以直接播放示例 F66。',
    event: 'submit',
    showCursor: true,
    cursorTarget: 'input',
    cursorPosition: { x: 0.82, y: 0.5 },
    requiredAction: 'input-or-example',
  },
  'home-search-submit': {
    selector: '[data-tutorial="home-search"]',
    eyebrow: '提交真实搜索',
    title: '点击搜索按钮查看结果',
    description: '关键词已经填写完成。请点击真实页面中的搜索按钮，页面会通过原有表单进入搜索结果。',
    event: 'submit',
    showCursor: true,
    cursorTarget: 'button[type="submit"]',
    cursorPosition: { x: 0.5, y: 0.5 },
    requiredAction: 'submit-search',
  },
  'search-modes': {
    selector: '[data-tutorial="search-modes"]',
    eyebrow: '搜索结果',
    title: '按需要切换查找对象',
    description: '“综合、产品、资料、企业”对应不同核验视角。请点击真实页面中的“资料”，查看用户如何核验一份具体文件。',
    event: 'click',
    showCursor: true,
    cursorTarget: 'button[data-mode="document"]',
    actionTarget: 'button[data-mode="document"]',
    cursorPosition: { x: 0.5, y: 0.5 },
    requiredAction: 'click',
  },
  'search-document-types': {
    selector: '[data-tutorial="search-document-types"]',
    eyebrow: '资料类型筛选',
    title: '选择证书查看完整核验信息',
    description: '资料还可以按 DoC、证书、说明书和检测报告筛选。请点击“证书”，查看资料编号、状态、有效期和文件预览。',
    event: 'click',
    showCursor: true,
    cursorTarget: 'button[data-document-type="certificate"]',
    actionTarget: 'button[data-document-type="certificate"]',
    cursorPosition: { x: 0.5, y: 0.5 },
    requiredAction: 'click',
  },
  'search-results': {
    resolve: () => {
      const certificate = document.querySelector('[data-tutorial="search-result-card"][data-result-kind="certificate"]');
      const element = certificate
        || document.querySelector('[data-tutorial="search-result-card"]');
      if (!element) return null;
      const isCertificate = element.dataset.resultKind === 'certificate';
      return {
        element,
        title: isCertificate ? '这是一张真实的资料核验卡片' : '这是一张真实的公开资料卡片',
        description: isCertificate
          ? '卡片集中显示企业和产品、适用型号、资料编号、当前状态、标准和有效期；点击卡片或“查看”可以进入文件详情与预览。'
          : '卡片显示资料名称、所属产品与企业、语言和文件信息；点击卡片或“查看资料”可以进入详情与预览。',
      };
    },
    eyebrow: '第一张真实结果',
    showCursor: false,
    requiredAction: 'manual',
    spotlight: 'soft',
  },
  'nav-login': {
    resolve: () => {
      const login = document.querySelector('[data-tutorial="nav-login"]');
      if (login) return { element: login };
      const admin = document.querySelector('[data-tutorial="nav-admin"]');
      return admin ? { element: admin } : null;
    },
    eyebrow: '企业上传入口',
    title: '从这里进入企业工作台',
    description: '已有账号请登录；如果你已经登录，点击“我的上传 / 管理后台”即可继续。进入后台后会自动接续批量上传指引。',
    event: 'click',
    showCursor: true,
    cursorTarget: 'self',
    cursorPosition: { x: 0.5, y: 0.5 },
    requiredAction: 'click',
  },
  'auth-choice': {
    resolve: () => {
      const selector = window.innerWidth <= 700
        ? '[data-tutorial="login-choice-heading"]'
        : '[data-tutorial="login-card"]';
      const element = document.querySelector(selector);
      return element ? { element } : null;
    },
    eyebrow: '登录或注册',
    title: '你是否已经有企业账号？',
    description: '有账号可以直接登录；没有账号就先创建一个。注册成功后会自动登录并进入企业工作台，不需要再返回登录页。',
    showCursor: false,
    requiredAction: 'manual',
    spotlight: 'soft',
  },
  'register-link': {
    selector: '[data-tutorial="register-link"]',
    eyebrow: '新企业用户',
    title: '点击这里创建账号',
    description: '注册只需要邮箱、显示名称和密码。完成后不需要再次登录，会直接进入后台。',
    event: 'click',
    showCursor: true,
    cursorTarget: 'self',
    cursorPosition: { x: 0.5, y: 0.5 },
    requiredAction: 'click',
  },
  'login-form': {
    selector: '[data-tutorial="login-form"]',
    eyebrow: '已有账号',
    title: '使用真实账号登录',
    description: '填写账号和密码并提交。登录成功后，指引会在真实后台继续带你创建公司并批量上传资料。',
    event: 'submit',
    showCursor: true,
    cursorTarget: '#username',
    cursorPosition: { x: 0.82, y: 0.5 },
    requiredAction: 'input-and-submit',
  },
  'register-form': {
    selector: '[data-tutorial="register-form"]',
    eyebrow: '创建企业用户账号',
    title: '填写注册信息并同意协议',
    description: '完成注册后会自动登录。下一段指引将在后台继续，不会让你回到单独的教程页面。',
    event: 'submit',
    showCursor: true,
    cursorTarget: '#email',
    cursorPosition: { x: 0.82, y: 0.5 },
    requiredAction: 'input-and-submit',
  },
};

function isProtectedAdminPath(pathname) {
  return (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/admin-v2'))
    && !pathname.startsWith('/admin/login')
    && !pathname.startsWith('/admin/register');
}

function resolveGuideStep(stepId) {
  const definition = GUIDE_STEPS[stepId];
  if (!definition) return null;
  if (definition.resolve) {
    const resolved = definition.resolve();
    return resolved ? { ...definition, ...resolved } : null;
  }
  const element = document.querySelector(definition.selector);
  return element ? { ...definition, element } : null;
}

function resolveNestedElement(step, selector) {
  if (!step?.element || !selector || selector === 'self') return step?.element || null;
  return step.element.querySelector(selector) || document.querySelector(selector);
}

function resolveCursorElement(step) {
  if (!step?.showCursor) return null;
  return resolveNestedElement(step, step.cursorTarget);
}

function getCursorPoint(step) {
  const element = resolveCursorElement(step);
  if (!element) return null;
  const cursorRect = element.getBoundingClientRect();
  const { x = 0.5, y = 0.5 } = step.cursorPosition || {};
  return {
    left: cursorRect.left + cursorRect.width * x,
    top: cursorRect.top + cursorRect.height * y,
  };
}

export default function PublicOnboardingGuide() {
  const location = useLocation();
  const navigate = useNavigate();
  const [welcomeOpen, setWelcomeOpen] = useState(() => location.pathname === '/' && !localStorage.getItem(SEEN_KEY));
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [flow, setFlow] = useState(null);
  const [stepId, setStepId] = useState('home-purpose');
  const [resolvedStep, setResolvedStep] = useState(null);
  const targetRef = useRef(null);
  const launcherRef = useRef(null);
  const examplePlaybackRef = useRef(false);
  const exampleTimersRef = useRef([]);
  const protectedAdminPage = isProtectedAdminPath(location.pathname);
  const rect = useGuideTargetRect(active && !protectedAdminPage, resolvedStep?.element);

  const clearExamplePlayback = useCallback(() => {
    exampleTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    exampleTimersRef.current = [];
    examplePlaybackRef.current = false;
  }, []);

  const clearTarget = useCallback(() => {
    targetRef.current?.classList.remove('public-guide-target');
    targetRef.current = null;
  }, []);

  const closeGuide = useCallback(({ keepPending = false } = {}) => {
    clearExamplePlayback();
    clearTarget();
    setActive(false);
    setWelcomeOpen(false);
    setMenuOpen(false);
    setResolvedStep(null);
    if (!keepPending) localStorage.removeItem(PENDING_KEY);
  }, [clearExamplePlayback, clearTarget]);

  const startFlow = useCallback((nextFlow) => {
    clearExamplePlayback();
    localStorage.setItem(SEEN_KEY, new Date().toISOString());
    if (nextFlow === 'business') localStorage.setItem(PENDING_KEY, 'batch-upload');
    else localStorage.removeItem(PENDING_KEY);
    setFlow(nextFlow);
    setStepId(nextFlow === 'business' ? 'business-purpose' : 'home-purpose');
    setWelcomeOpen(false);
    setMenuOpen(false);
    setActive(true);
    if (location.pathname !== '/') navigate('/');
  }, [clearExamplePlayback, location.pathname, navigate]);

  const completePublicFlow = useCallback(() => {
    localStorage.setItem(`${SEEN_KEY}:completed`, new Date().toISOString());
    closeGuide();
  }, [closeGuide]);

  const continueToBusiness = useCallback(() => {
    localStorage.setItem(PENDING_KEY, 'batch-upload');
    setFlow('business');
    setStepId('nav-login');
  }, []);

  const goToExample = useCallback(() => {
    clearExamplePlayback();
    const input = document.querySelector('[data-tutorial="home-search"] input');
    if (!input) return;

    examplePlaybackRef.current = true;
    input.focus();
    const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    EXAMPLE_SEARCH.sequence.forEach((value, index) => {
      const timer = window.setTimeout(() => {
        nativeValueSetter?.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }, index * EXAMPLE_SEARCH.interval);
      exampleTimersRef.current.push(timer);
    });
  }, [clearExamplePlayback]);

  const advanceManualStep = useCallback(() => {
    if (stepId === 'home-purpose') setStepId('home-search-input');
    else if (stepId === 'business-purpose') setStepId('nav-login');
    else if (stepId === 'search-modes') setStepId('search-results');
    else if (stepId === 'search-results') {
      if (flow === 'business') setStepId('nav-login');
      else completePublicFlow();
    }
  }, [completePublicFlow, flow, stepId]);

  useEffect(() => {
    const pending = localStorage.getItem(PENDING_KEY) === 'batch-upload';
    if (!pending || active) return;
    if (location.pathname === '/admin/login') {
      setFlow('business');
      setStepId('auth-choice');
      setActive(true);
    } else if (location.pathname === '/admin/register') {
      setFlow('business');
      setStepId('register-form');
      setActive(true);
    }
  }, [active, location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeMenuFromOutside = (event) => {
      if (!launcherRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeMenuWithKeyboard = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeMenuFromOutside, true);
    document.addEventListener('keydown', closeMenuWithKeyboard);
    return () => {
      document.removeEventListener('pointerdown', closeMenuFromOutside, true);
      document.removeEventListener('keydown', closeMenuWithKeyboard);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!active) return undefined;

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        closeGuide();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [active, closeGuide]);

  useEffect(() => {
    if (!active || protectedAdminPage) return undefined;

    let cancelled = false;
    let observer;
    let intervalId;

    const attach = () => {
      if (cancelled) return;
      const nextResolved = resolveGuideStep(stepId);
      if (!nextResolved) {
        clearTarget();
        setResolvedStep(null);
        return;
      }

      if (targetRef.current !== nextResolved.element) {
        clearTarget();
        targetRef.current = nextResolved.element;
        nextResolved.element.classList.add('public-guide-target');
        setResolvedStep(nextResolved);
        nextResolved.element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    };

    attach();
    observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    intervalId = window.setInterval(attach, 700);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearInterval(intervalId);
      clearTarget();
    };
  }, [active, clearTarget, protectedAdminPage, stepId]);

  useEffect(() => {
    if (!active || stepId !== 'home-search-input' || !resolvedStep?.element) return undefined;
    const input = resolvedStep.element.querySelector('input');
    if (!input) return undefined;

    let settleTimer;
    const handleInput = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (input.value.trim()) setStepId('home-search-submit');
      }, 480);
    };

    input.addEventListener('input', handleInput);
    return () => {
      window.clearTimeout(settleTimer);
      input.removeEventListener('input', handleInput);
    };
  }, [active, resolvedStep, stepId]);

  useEffect(() => {
    if (!active || stepId !== 'home-search-submit' || !examplePlaybackRef.current || !resolvedStep?.element) return undefined;
    const form = resolvedStep.element;
    const timer = window.setTimeout(() => {
      if (!examplePlaybackRef.current) return;
      examplePlaybackRef.current = false;
      const submitButton = form.querySelector('button[type="submit"]');
      form.requestSubmit(submitButton || undefined);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [active, resolvedStep, stepId]);

  useEffect(() => {
    if (!active || !resolvedStep?.element || !resolvedStep.event) return undefined;
    const element = resolvedStep.element;
    const actionElement = resolveNestedElement(resolvedStep, resolvedStep.actionTarget);
    if (!actionElement) return undefined;

    const handleAction = () => {
      window.setTimeout(() => {
        if (['home-search-input', 'home-search-submit'].includes(stepId)) {
          const query = element.querySelector('input')?.value.trim();
          if (query) {
            examplePlaybackRef.current = false;
            setStepId('search-modes');
          }
        }
        else if (stepId === 'search-modes') setStepId('search-document-types');
        else if (stepId === 'search-document-types') setStepId('search-results');
        else if (stepId === 'nav-login') {
          if (element.matches('[data-tutorial="nav-admin"]')) closeGuide({ keepPending: true });
          else setStepId('auth-choice');
        } else if (stepId === 'register-link') setStepId('register-form');
      }, 400);
    };

    actionElement.addEventListener(resolvedStep.event, handleAction, { once: true });
    return () => actionElement.removeEventListener(resolvedStep.event, handleAction);
  }, [active, closeGuide, resolvedStep, stepId]);

  const cursorPoint = useMemo(() => getCursorPoint(resolvedStep), [rect, resolvedStep]);
  const popoverStyle = useMemo(() => getGuidePopoverStyle(rect, { width: 370, height: 285 }), [rect]);

  if (protectedAdminPage) return null;

  return (
    <>
      {!active && !welcomeOpen && (
        <div ref={launcherRef} className={`public-guide-launcher ${menuOpen ? 'is-open' : ''}`}>
          {menuOpen && (
            <div className="public-guide-menu">
              <span>想让我帮你做什么？</span>
              <button type="button" onClick={() => startFlow('explore')}>
                <strong>查找和核验资料</strong>
                <small>了解网站、搜索产品和查看公开资料</small>
              </button>
              <button type="button" onClick={() => startFlow('business')}>
                <strong>企业上传资料</strong>
                <small>直接进入登录、注册、批量上传和整理</small>
              </button>
            </div>
          )}
          <button
            type="button"
            className="public-guide-trigger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="打开 EU-DOC 新手指引"
          >
            <GuideCloud floating spark />
            <span className="public-guide-pet-prompt">
              <small>EU-DOC 助手</small>
              <strong>{menuOpen ? '请选择需要的帮助' : '需要我帮你吗？'}</strong>
            </span>
          </button>
        </div>
      )}

      {welcomeOpen && (
        <div className="public-guide-welcome-layer">
          <section className="public-guide-welcome" aria-modal="true" role="dialog" aria-label="EU-DOC 新手指引">
            <button type="button" className="public-guide-close" onClick={() => { localStorage.setItem(SEEN_KEY, new Date().toISOString()); closeGuide(); }}>×</button>
            <span className="public-guide-kicker">WELCOME TO EU-DOC</span>
            <h2>第一次使用，你想先做什么？</h2>
            <p>指引会直接出现在真实页面上。你看到的搜索、登录、注册和上传入口都可以实际操作，不是另外制作的演示页面。</p>
            <div className="public-guide-paths">
              <button type="button" onClick={() => startFlow('explore')}>
                <span className="public-guide-path-number">01</span>
                <strong>查找和核验资料</strong>
                <small>适合采购方、审核机构，以及想了解公开展示方式的用户</small>
                <em>开始了解网站 →</em>
              </button>
              <button type="button" onClick={() => startFlow('business')}>
                <span className="public-guide-path-number">02</span>
                <strong>企业上传资料</strong>
                <small>适合需要注册公司、批量上传并管理产品资料的企业</small>
                <em>开始企业上传 →</em>
              </button>
            </div>
          </section>
        </div>
      )}

      {active && (
        <div className={`public-guide-layer ${resolvedStep?.spotlight === 'soft' ? 'is-soft' : ''}`}>
          {rect && <div className="public-guide-focus" style={{ left: rect.left - 7, top: rect.top - 7, width: rect.width + 14, height: rect.height + 14 }} />}
          {cursorPoint && <GuideCursor style={cursorPoint} />}
          <aside className={`public-guide-popover ${!rect ? 'waiting' : ''}`} style={popoverStyle}>
            <div className="public-guide-popover-head">
              <div className="public-guide-popover-agent">
                <GuideCloud compact />
                <span className="public-guide-popover-eyebrow">{resolvedStep?.eyebrow || '正在衔接真实页面'}</span>
              </div>
              <button type="button" onClick={() => closeGuide()}>×</button>
            </div>
            {resolvedStep ? (
              <>
                <h3>{resolvedStep.title}</h3>
                <p>{resolvedStep.description}</p>
                <div className="public-guide-actions">
                  {stepId === 'home-purpose' && <button type="button" className="primary" onClick={advanceManualStep}>知道了，看看怎么查</button>}
                  {stepId === 'business-purpose' && (
                    <>
                      <button type="button" className="primary" onClick={advanceManualStep}>直接进入企业工作台</button>
                      <button type="button" onClick={() => setStepId('home-purpose')}>先了解资料如何公开展示</button>
                    </>
                  )}
                  {stepId === 'home-search-input' && <button type="button" className="primary" onClick={goToExample}>直接看示例 F66</button>}
                  {stepId === 'search-results' && flow === 'explore' && (
                    <>
                      <button type="button" className="primary" onClick={completePublicFlow}>开始自己搜索</button>
                      <button type="button" onClick={continueToBusiness}>继续企业上传</button>
                    </>
                  )}
                  {stepId === 'search-results' && flow === 'business' && <button type="button" className="primary" onClick={advanceManualStep}>继续：上传企业资料</button>}
                  {stepId === 'auth-choice' && (
                    <>
                      <button type="button" className="primary" onClick={() => setStepId('login-form')}>我有账号，直接登录</button>
                      <button type="button" onClick={() => setStepId('register-link')}>没有账号，先注册</button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="public-guide-loader" />
                <h3>正在等待页面</h3>
                <p>页面加载完成后，下一项真实操作会自动高亮。</p>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
