import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './PublicOnboardingGuide.css';

const SEEN_KEY = 'eu-doc:guide:public:seen';
const PENDING_KEY = 'eu-doc:guide:pending';

const GUIDE_STEPS = {
  'home-purpose': {
    selector: '[data-tutorial="home-purpose"]',
    eyebrow: '先认识 EU-DOC',
    title: '这里展示企业、产品与合规资料',
    description: '采购方和审核机构可以查找公开资料；企业上传后，也会以公司、产品和资料相互关联的方式展示在这里。',
  },
  'home-search': {
    selector: '[data-tutorial="home-search"]',
    eyebrow: '真实搜索入口',
    title: '先看看资料最终如何被找到',
    description: '你可以输入公司名、产品名、型号或资料编号并点击搜索，也可以用示例词直接查看真实搜索结果。',
    event: 'submit',
  },
  'search-modes': {
    selector: '[data-tutorial="search-modes"]',
    eyebrow: '搜索结果',
    title: '按需要切换查找对象',
    description: '“综合、产品、资料、企业”对应不同核验视角。点击任一分类，页面会显示真实的筛选结果。',
    event: 'click',
  },
  'search-results': {
    resolve: () => {
      const element = document.querySelector('[data-tutorial="search-result-list"]')
        || document.querySelector('[data-tutorial="search-results"]');
      return element ? { element } : null;
    },
    eyebrow: '公开展示结果',
    title: '上传的资料会围绕产品被组织起来',
    description: '用户不是在杂乱的文件夹里找文件，而是先找到企业或产品，再查看关联的证书、DoC、说明书和检测报告。',
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
  },
  'auth-choice': {
    selector: '[data-tutorial="login-card"]',
    eyebrow: '登录或注册',
    title: '第一次使用，请先建立账号',
    description: '已有账号可以直接填写登录表单；新企业用户先进入注册页。注册成功后会自动登录并进入企业工作台。',
  },
  'register-link': {
    selector: '[data-tutorial="register-link"]',
    eyebrow: '新企业用户',
    title: '点击这里创建账号',
    description: '注册只需要邮箱、显示名称和密码。完成后不需要再次登录，会直接进入后台。',
    event: 'click',
  },
  'login-form': {
    selector: '[data-tutorial="login-form"]',
    eyebrow: '已有账号',
    title: '使用真实账号登录',
    description: '填写账号和密码并提交。登录成功后，指引会在真实后台继续带你创建公司并批量上传资料。',
    event: 'submit',
  },
  'register-form': {
    selector: '[data-tutorial="register-form"]',
    eyebrow: '创建企业用户账号',
    title: '填写注册信息并同意协议',
    description: '完成注册后会自动登录。下一段指引将在后台继续，不会让你回到单独的教程页面。',
    event: 'submit',
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

export default function PublicOnboardingGuide() {
  const location = useLocation();
  const navigate = useNavigate();
  const [welcomeOpen, setWelcomeOpen] = useState(() => location.pathname === '/' && !localStorage.getItem(SEEN_KEY));
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [flow, setFlow] = useState(null);
  const [stepId, setStepId] = useState('home-purpose');
  const [resolvedStep, setResolvedStep] = useState(null);
  const [rect, setRect] = useState(null);
  const targetRef = useRef(null);

  const protectedAdminPage = isProtectedAdminPath(location.pathname);

  const clearTarget = useCallback(() => {
    targetRef.current?.classList.remove('public-guide-target');
    targetRef.current = null;
  }, []);

  const closeGuide = useCallback(({ keepPending = false } = {}) => {
    clearTarget();
    setActive(false);
    setWelcomeOpen(false);
    setMenuOpen(false);
    setResolvedStep(null);
    setRect(null);
    if (!keepPending) localStorage.removeItem(PENDING_KEY);
  }, [clearTarget]);

  const startFlow = useCallback((nextFlow) => {
    localStorage.setItem(SEEN_KEY, new Date().toISOString());
    if (nextFlow === 'business') localStorage.setItem(PENDING_KEY, 'batch-upload');
    else localStorage.removeItem(PENDING_KEY);
    setFlow(nextFlow);
    setStepId('home-purpose');
    setWelcomeOpen(false);
    setMenuOpen(false);
    setActive(true);
    if (location.pathname !== '/') navigate('/');
  }, [location.pathname, navigate]);

  const completePublicFlow = useCallback(() => {
    localStorage.setItem(`${SEEN_KEY}:completed`, new Date().toISOString());
    closeGuide();
  }, [closeGuide]);

  const goToExample = useCallback(() => {
    setStepId('search-modes');
    navigate('/search?q=F66');
  }, [navigate]);

  const advanceManualStep = useCallback(() => {
    if (stepId === 'home-purpose') setStepId('home-search');
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
        setRect(null);
        return;
      }

      if (targetRef.current !== nextResolved.element) {
        clearTarget();
        targetRef.current = nextResolved.element;
        nextResolved.element.classList.add('public-guide-target');
        nextResolved.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setResolvedStep(nextResolved);
      setRect(nextResolved.element.getBoundingClientRect());
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
    if (!active || !resolvedStep?.element || !resolvedStep.event) return undefined;
    const element = resolvedStep.element;

    const handleAction = () => {
      window.setTimeout(() => {
        if (stepId === 'home-search') {
          const query = element.querySelector('input')?.value.trim();
          if (query) setStepId('search-modes');
        }
        else if (stepId === 'search-modes') setStepId('search-results');
        else if (stepId === 'nav-login') {
          if (element.matches('[data-tutorial="nav-admin"]')) closeGuide({ keepPending: true });
          else setStepId('auth-choice');
        } else if (stepId === 'register-link') setStepId('register-form');
      }, 400);
    };

    element.addEventListener(resolvedStep.event, handleAction, { once: true });
    return () => element.removeEventListener(resolvedStep.event, handleAction);
  }, [active, closeGuide, resolvedStep, stepId]);

  useEffect(() => {
    if (!active) return undefined;
    const updateRect = () => {
      if (targetRef.current) setRect(targetRef.current.getBoundingClientRect());
    };
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [active]);

  const popoverStyle = useMemo(() => {
    if (!rect) return undefined;
    const width = Math.min(370, window.innerWidth - 32);
    if (rect.width > window.innerWidth * 0.62 || rect.height > window.innerHeight * 0.48) {
      return { right: 20, bottom: 20, width };
    }
    const roomRight = window.innerWidth - rect.right;
    if (roomRight > width + 28) {
      return { left: rect.right + 16, top: Math.max(16, Math.min(rect.top, window.innerHeight - 300)), width };
    }
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - width - 16);
    const top = window.innerHeight - rect.bottom > 250 ? rect.bottom + 16 : Math.max(16, rect.top - 230);
    return { left, top, width };
  }, [rect]);

  if (protectedAdminPage) return null;

  return (
    <>
      {!active && !welcomeOpen && (
        <div className="public-guide-launcher">
          {menuOpen && (
            <div className="public-guide-menu">
              <span>第一次来？选择你要完成的事</span>
              <button type="button" onClick={() => startFlow('explore')}>
                <strong>查找和核验资料</strong>
                <small>了解网站、搜索产品和查看公开资料</small>
              </button>
              <button type="button" onClick={() => startFlow('business')}>
                <strong>企业上传资料</strong>
                <small>从公开展示一路进入批量上传和整理</small>
              </button>
            </div>
          )}
          <button type="button" className="public-guide-trigger" onClick={() => setMenuOpen((open) => !open)}>新手指引</button>
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
        <div className="public-guide-layer">
          {rect && <div className="public-guide-focus" style={{ left: rect.left - 7, top: rect.top - 7, width: rect.width + 14, height: rect.height + 14 }} />}
          {rect && <div className="public-guide-cursor" key={`${stepId}-${Math.round(rect.left)}-${Math.round(rect.top)}`} style={{ left: rect.left + Math.min(rect.width * 0.72, rect.width - 18), top: rect.top + Math.min(rect.height * 0.55, rect.height - 14) }}><span /></div>}
          <aside className={`public-guide-popover ${!rect ? 'waiting' : ''}`} style={popoverStyle}>
            <div className="public-guide-popover-head">
              <span>{resolvedStep?.eyebrow || '正在衔接真实页面'}</span>
              <button type="button" onClick={() => closeGuide()}>×</button>
            </div>
            {resolvedStep ? (
              <>
                <h3>{resolvedStep.title}</h3>
                <p>{resolvedStep.description}</p>
                <div className="public-guide-actions">
                  {stepId === 'home-purpose' && <button type="button" className="primary" onClick={advanceManualStep}>知道了，看看怎么查</button>}
                  {stepId === 'home-search' && <button type="button" className="primary" onClick={goToExample}>用示例 F66 查看</button>}
                  {stepId === 'search-modes' && <button type="button" className="primary" onClick={advanceManualStep}>继续看展示结果</button>}
                  {stepId === 'search-results' && flow === 'explore' && <button type="button" className="primary" onClick={advanceManualStep}>我已经了解</button>}
                  {stepId === 'search-results' && flow === 'business' && <button type="button" className="primary" onClick={advanceManualStep}>继续：上传企业资料</button>}
                  {stepId === 'auth-choice' && (
                    <>
                      <button type="button" className="primary" onClick={() => setStepId('login-form')}>我有账号，直接登录</button>
                      <button type="button" onClick={() => setStepId('register-link')}>没有账号，先注册</button>
                    </>
                  )}
                </div>
                {resolvedStep.event && !['home-search', 'search-modes'].includes(stepId) && (
                  <small>请操作高亮的真实页面区域，完成后指引会自动接续。</small>
                )}
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
