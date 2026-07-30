import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GuideCloud, GuideCursor } from './GuideVisuals';
import { getGuidePopoverStyle, useGuideTargetRect } from './useGuideTargetRect';
import './ContextualGuide.css';

const BATCH_STEP_KEY = 'eu-doc:guide:batch-upload:step';
const BATCH_FINISHED_EVENT = 'eu-doc:guide:batch-upload:finished';

const DEFAULT_STEP_BEHAVIOR = {
  showCursor: true,
  cursorTarget: 'self',
  cursorPosition: { x: 0.5, y: 0.5 },
  requiredAction: 'click',
};

const STEP_DEFINITIONS = {
  'batch-nav': {
    selector: '[data-tutorial="batch-upload-nav"]',
    title: '进入批量上传',
    description: '点击左侧“批量上传”。这里可以一次选择多份文件，或按住 Shift 点击选择整个文件夹。',
    next: 'company-or-upload',
  },
  'company-or-upload': {
    resolve: () => {
      const createCompany = document.querySelector('[data-tutorial="create-company-from-import"]');
      if (createCompany) {
        return {
          element: createCompany,
          title: '先创建公司申请',
          description: '上传资料必须归属于一家公司。先创建公司申请草稿，认证通过前不会公开。',
          next: 'company-submit',
        };
      }
      const companyPicker = document.querySelector('[data-tutorial="import-company-picker"]');
      if (companyPicker) {
        return {
          element: companyPicker,
          title: '先确认资料归属公司',
          description: '你的账号管理多家公司。请先确认本批资料要上传到哪家公司，再继续选择文件。',
          next: 'upload-files',
        };
      }
      const upload = document.querySelector('[data-tutorial="batch-upload-trigger"]');
      return upload ? {
        element: upload,
        title: '一次选择多份资料',
        description: '点击这里多选 PDF、图片，或按住 Shift 点击选择整个文件夹。文件会先进入待整理区。',
        next: 'import-group',
      } : null;
    },
  },
  'company-submit': {
    selector: '[data-tutorial="create-company-submit"]',
    title: '创建公司申请草稿',
    description: '填写公司名称后点击这里。创建成功后会自动回到批量上传，不需要先逐个创建产品。',
    next: 'upload-files',
  },
  'upload-files': {
    selector: '[data-tutorial="batch-upload-trigger"]',
    title: '批量选择产品资料',
    description: '建议把同一批产品的证书、DoC、说明书及其他公开资料一起上传，系统会辅助识别和分组。',
    next: 'import-group',
  },
  'import-group': {
    selector: '[data-tutorial="import-group-card"]',
    title: '打开系统推荐的资料组',
    description: '上传完成后，系统会根据文件名和 PDF 文字推荐分组。点击一张正常资料卡片开始确认。',
    waiting: '正在等待文件上传和系统识别完成…',
    next: 'question-1',
  },
  'split-group': {
    selector: '[data-tutorial="import-group-card"]',
    title: '已拆分，逐份重新检查',
    description: '系统已经把刚才的资料组拆成单份卡片。请打开第一张正常资料卡片，从产品归属开始分别整理。',
    waiting: '正在等待拆分后的资料卡片准备完成…',
    next: 'question-1',
  },
  'question-1': {
    selector: '[data-tutorial="import-question-1"]',
    title: '问题 1：先核对这一组文件',
    description: '先逐份查看文件名、系统识别的类型和语言，再判断它们是否属于同一个产品。两种选择都可以继续，不需要默认确认。',
    showCursor: false,
    requiredAction: 'product-group-choice',
    resolveNext: (event) => {
      const choice = event.target.closest('[data-import-choice]')?.dataset.importChoice;
      if (choice === 'same-product') return 'question-2';
      if (choice === 'split') return 'split-group';
      return null;
    },
  },
  'question-2': {
    selector: '[data-tutorial="import-question-2"]',
    actionTarget: '[data-tutorial="import-question-2-confirm"]',
    title: '问题 2：检查产品归属和基础信息',
    description: '先检查是关联已有产品还是创建新产品，再核对产品名称、适用型号和分类；需要时直接修改，最后再确认。',
    showCursor: false,
    requiredAction: 'review-and-confirm',
    next: 'question-3',
  },
  'question-3': {
    selector: '[data-tutorial="import-question-3"]',
    actionTarget: '[data-tutorial="import-question-3-confirm"]',
    title: '问题 3：逐份检查资料类型和语言',
    description: '不要直接确认。请逐行核对文件名、资料类型和语言，修改系统识别错误的项目后再继续。',
    showCursor: false,
    requiredAction: 'review-and-confirm',
    next: 'question-4',
  },
  'question-4': {
    selector: '[data-tutorial="import-question-4"]',
    title: '问题 4：检查归档结果后选择',
    description: '最后确认将关联已有产品还是创建新产品，以及本次归档的资料数量。你可以提交、稍后处理或删除整组资料。',
    showCursor: false,
    requiredAction: 'final-review-and-submit',
    resolveNext: (event) => {
      const choice = event.target.closest('[data-import-final-choice]')?.dataset.importFinalChoice;
      if (choice === 'submit') return 'expand-company-or-products';
      return null;
    },
  },
  'expand-company-or-products': {
    resolve: () => {
      const products = document.querySelector('[data-tutorial="products-nav"]');
      if (products) {
        return {
          element: products,
          title: '归档完成，进入产品资料',
          description: '产品和资料关系已经建立。点击“产品资料”查看资料完整度，并继续编辑产品。',
          next: 'product-edit',
        };
      }
      const companyToggle = document.querySelector('[data-tutorial="company-nav-toggle"]');
      return companyToggle ? {
        element: companyToggle,
        title: '展开当前公司菜单',
        description: '点击公司名称展开功能菜单，然后进入产品资料查看刚才的归档结果。',
        next: 'products-nav',
      } : null;
    },
  },
  'products-nav': {
    selector: '[data-tutorial="products-nav"]',
    title: '进入产品资料',
    description: '点击“产品资料”，查看刚才创建或关联的产品，以及仍然缺失的资料。',
    next: 'product-edit',
  },
  'product-edit': {
    selector: '[data-tutorial="product-edit"]',
    title: '本批资料已经归档完成',
    description: '当前产品已经可以查看和编辑。你可以打开产品编辑，或直接回到批量上传入口继续处理下一批资料。',
    showCursor: false,
    requiredAction: 'manual',
    spotlight: 'soft',
  },
};

function resolveStep(stepId) {
  const definition = STEP_DEFINITIONS[stepId];
  if (!definition) return null;
  if (definition.resolve) {
    const resolved = definition.resolve();
    return resolved ? { ...DEFAULT_STEP_BEHAVIOR, ...definition, ...resolved } : null;
  }
  const element = document.querySelector(definition.selector);
  return element ? { ...DEFAULT_STEP_BEHAVIOR, ...definition, element } : null;
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

export function ContextualGuide() {
  const [taskMenuOpen, setTaskMenuOpen] = useState(() => !localStorage.getItem('eu-doc:guide:batch-upload:seen'));
  const [active, setActive] = useState(false);
  const [stepId, setStepId] = useState('batch-nav');
  const [resolvedStep, setResolvedStep] = useState(null);
  const [waitingText, setWaitingText] = useState('');
  const [hasPausedGuide, setHasPausedGuide] = useState(() => Boolean(localStorage.getItem(BATCH_STEP_KEY)));
  const targetRef = useRef(null);
  const rect = useGuideTargetRect(active, resolvedStep?.element);

  const pauseGuide = useCallback(() => {
    targetRef.current?.classList.remove('context-guide-target');
    targetRef.current = null;
    setActive(false);
    setResolvedStep(null);
    setWaitingText('');
    setTaskMenuOpen(false);
    setHasPausedGuide(Boolean(localStorage.getItem(BATCH_STEP_KEY)));
  }, []);

  const stopGuide = useCallback(() => {
    localStorage.removeItem(BATCH_STEP_KEY);
    setHasPausedGuide(false);
    pauseGuide();
  }, [pauseGuide]);

  const completeGuide = useCallback(() => {
    localStorage.setItem('eu-doc:guide:batch-upload:completed', new Date().toISOString());
    localStorage.removeItem(BATCH_STEP_KEY);
    setHasPausedGuide(false);
    pauseGuide();
  }, [pauseGuide]);

  const startBatchGuide = useCallback(() => {
    localStorage.setItem('eu-doc:guide:batch-upload:seen', new Date().toISOString());
    localStorage.removeItem(BATCH_STEP_KEY);
    setHasPausedGuide(false);
    setTaskMenuOpen(false);
    setStepId('batch-nav');
    setActive(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    localStorage.setItem(BATCH_STEP_KEY, stepId);
    setHasPausedGuide(true);
  }, [active, stepId]);

  useEffect(() => {
    if (localStorage.getItem('eu-doc:guide:pending') !== 'batch-upload') return;
    localStorage.removeItem('eu-doc:guide:pending');
    startBatchGuide();
  }, [startBatchGuide]);

  useEffect(() => {
    const handleFinished = () => {
      if (active) stopGuide();
    };
    window.addEventListener(BATCH_FINISHED_EVENT, handleFinished);
    return () => window.removeEventListener(BATCH_FINISHED_EVENT, handleFinished);
  }, [active, stopGuide]);

  useEffect(() => {
    if (!active) return undefined;

    let cancelled = false;
    let observer;
    let timeoutId;

    const attach = () => {
      if (cancelled) return;
      const nextResolved = resolveStep(stepId);
      if (!nextResolved) {
        targetRef.current?.classList.remove('context-guide-target');
        targetRef.current = null;
        setResolvedStep(null);
        setWaitingText(STEP_DEFINITIONS[stepId]?.waiting || '正在等待当前页面准备完成…');
        return;
      }

      setWaitingText('');
      if (targetRef.current !== nextResolved.element) {
        targetRef.current?.classList.remove('context-guide-target');
        targetRef.current = nextResolved.element;
        nextResolved.element.classList.add('context-guide-target');
        setResolvedStep(nextResolved);
        nextResolved.element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    };

    attach();
    observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-tutorial', 'class', 'hidden'] });
    timeoutId = window.setInterval(attach, 250);

    return () => {
      cancelled = true;
      observer?.disconnect();
      window.clearInterval(timeoutId);
      targetRef.current?.classList.remove('context-guide-target');
      targetRef.current = null;
    };
  }, [active, stepId]);

  useEffect(() => {
    if (!active || !resolvedStep?.element) return undefined;

    const element = resolvedStep.element;
    const actionElement = resolveNestedElement(resolvedStep, resolvedStep.actionTarget);
    if (!actionElement) return undefined;

    let advanceFrameId;
    const handleTargetClick = (event) => {
      const nextStep = resolvedStep.resolveNext
        ? resolvedStep.resolveNext(event)
        : resolvedStep.next;
      if (!nextStep) return;

      window.cancelAnimationFrame(advanceFrameId);
      advanceFrameId = window.requestAnimationFrame(() => {
        if (nextStep === 'complete') completeGuide();
        else if (nextStep === 'stop-guide') stopGuide();
        else setStepId(nextStep);
      });
    };
    actionElement.addEventListener('click', handleTargetClick);
    return () => {
      window.cancelAnimationFrame(advanceFrameId);
      actionElement.removeEventListener('click', handleTargetClick);
    };
  }, [active, completeGuide, resolvedStep, stopGuide]);

  const cursorPoint = useMemo(() => getCursorPoint(resolvedStep), [rect, resolvedStep]);
  const popoverStyle = useMemo(() => getGuidePopoverStyle(rect, { width: 350, height: 285 }), [rect]);

  return (
    <>
      {!active && (
        <div className="context-guide-launcher">
          {taskMenuOpen && (
            <div className="context-guide-menu">
              <span>我想要…</span>
              <button onClick={startBatchGuide}><strong>{hasPausedGuide ? '重新开始批量上传指引' : '批量上传产品资料'}</strong><small>{hasPausedGuide ? '从批量上传入口重新开始' : '从入口、上传到问卷归档和产品编辑'}</small></button>
              <button disabled><strong>申请企业认证</strong><small>后续加入</small></button>
              <button disabled><strong>邀请团队成员</strong><small>后续加入</small></button>
            </div>
          )}
          <button className="context-guide-trigger" onClick={() => setTaskMenuOpen((open) => !open)}>
            <GuideCloud compact />
            <span><small>EU-DOC 助手</small><strong>操作指引</strong></span>
          </button>
        </div>
      )}

      {active && (
        <div className={`context-guide-layer ${resolvedStep?.spotlight === 'soft' ? 'is-soft' : ''}`}>
          {rect && <div className="context-guide-focus" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />}
          {cursorPoint && <GuideCursor style={cursorPoint} />}
          <aside className={`context-guide-popover ${!rect ? 'waiting' : ''}`} style={rect ? popoverStyle : undefined}>
            <div className="context-guide-head">
              <div className="context-guide-agent"><GuideCloud compact /><span>批量上传指引</span></div>
              <button onClick={pauseGuide}>×</button>
            </div>
            {resolvedStep ? (
              <>
                <h3>{resolvedStep.title}</h3>
                <p>{resolvedStep.description}</p>
                {stepId === 'product-edit' && (
                  <div className="context-guide-actions">
                    <button type="button" className="primary" onClick={() => { resolvedStep.element.click(); completeGuide(); }}>查看 / 编辑当前产品</button>
                    <button type="button" onClick={() => setStepId('batch-nav')}>继续上传下一批</button>
                    <button type="button" onClick={completeGuide}>完成指引</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="context-guide-loader" />
                <h3>等待下一项操作</h3>
                <p>{waitingText}</p>
                <small>你可以继续完成上传或等待页面加载，不需要关闭指引。</small>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
