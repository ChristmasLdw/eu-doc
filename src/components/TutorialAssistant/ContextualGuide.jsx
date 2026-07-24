import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ContextualGuide.css';

const STEP_DEFINITIONS = {
  'batch-nav': {
    selector: '[data-tutorial="batch-upload-nav"]',
    title: '进入批量上传',
    description: '点击左侧“批量上传”。这里可以一次选择多份文件或整个资料文件夹。',
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
      const upload = document.querySelector('[data-tutorial="batch-upload-trigger"]');
      return upload ? {
        element: upload,
        title: '一次选择多份资料',
        description: '点击这里多选 PDF、图片，或者使用旁边的“上传整个文件夹”。文件会先进入待整理区。',
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
    description: '建议把同一批产品的证书、DoC、说明书和检测报告一起上传，系统会辅助识别和分组。',
    next: 'import-group',
  },
  'import-group': {
    selector: '[data-tutorial="import-group-card"]',
    title: '打开系统推荐的资料组',
    description: '上传完成后，系统会根据文件名和 PDF 文字推荐分组。点击一张正常资料卡片开始确认。',
    waiting: '正在等待文件上传和系统识别完成…',
    next: 'question-1',
  },
  'question-1': {
    selector: '[data-tutorial="import-question-1"]',
    title: '问题 1：是否属于同一个产品？',
    description: '确认这组文件是否属于同一产品。如果系统分错了，可以选择拆分整理。',
    next: 'question-2',
  },
  'question-2': {
    selector: '[data-tutorial="import-question-2"]',
    title: '问题 2：确认归属产品',
    description: '选择已有产品，或者直接创建新产品，并确认产品系列名称与适用型号。',
    next: 'question-3',
  },
  'question-3': {
    selector: '[data-tutorial="import-question-3"]',
    title: '问题 3：核对类型和语言',
    description: '逐份确认资料属于证书、DoC、说明书还是其他资料，并检查语言。',
    next: 'question-4',
  },
  'question-4': {
    selector: '[data-tutorial="import-question-submit"]',
    title: '问题 4：确认提交归档',
    description: '系统会按前面的回答创建或关联产品，并一次归档这一组资料。',
    next: 'expand-company-or-products',
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
    title: '后续可以继续编辑产品',
    description: '点击“编辑产品”可修改名称、型号、分类和描述，也可以继续补充或批量导入资料。',
    next: 'complete',
  },
};

function resolveStep(stepId) {
  const definition = STEP_DEFINITIONS[stepId];
  if (!definition) return null;
  if (definition.resolve) return definition.resolve();
  const element = document.querySelector(definition.selector);
  return element ? { ...definition, element } : null;
}

export function ContextualGuide() {
  const [taskMenuOpen, setTaskMenuOpen] = useState(() => !localStorage.getItem('eu-doc:guide:batch-upload:seen'));
  const [active, setActive] = useState(false);
  const [stepId, setStepId] = useState('batch-nav');
  const [resolvedStep, setResolvedStep] = useState(null);
  const [rect, setRect] = useState(null);
  const [waitingText, setWaitingText] = useState('');
  const targetRef = useRef(null);

  const stopGuide = useCallback(() => {
    targetRef.current?.classList.remove('context-guide-target');
    targetRef.current = null;
    setActive(false);
    setResolvedStep(null);
    setRect(null);
    setWaitingText('');
    setTaskMenuOpen(false);
  }, []);

  const completeGuide = useCallback(() => {
    localStorage.setItem('eu-doc:guide:batch-upload:completed', new Date().toISOString());
    stopGuide();
  }, [stopGuide]);

  const startBatchGuide = useCallback(() => {
    localStorage.setItem('eu-doc:guide:batch-upload:seen', new Date().toISOString());
    setTaskMenuOpen(false);
    setStepId('batch-nav');
    setActive(true);
  }, []);

  useEffect(() => {
    if (localStorage.getItem('eu-doc:guide:pending') !== 'batch-upload') return;
    localStorage.removeItem('eu-doc:guide:pending');
    startBatchGuide();
  }, [startBatchGuide]);

  useEffect(() => {
    if (!active) return undefined;

    let cancelled = false;
    let observer;
    let timeoutId;

    const attach = () => {
      if (cancelled) return;
      const nextResolved = resolveStep(stepId);
      if (!nextResolved) {
        setResolvedStep(null);
        setRect(null);
        setWaitingText(STEP_DEFINITIONS[stepId]?.waiting || '正在等待当前页面准备完成…');
        return;
      }

      setWaitingText('');
      targetRef.current?.classList.remove('context-guide-target');
      targetRef.current = nextResolved.element;
      nextResolved.element.classList.add('context-guide-target');
      nextResolved.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setResolvedStep(nextResolved);
      const nextRect = nextResolved.element.getBoundingClientRect();
      setRect(nextRect);
    };

    attach();
    observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    timeoutId = window.setInterval(attach, 700);

    return () => {
      cancelled = true;
      observer?.disconnect();
      window.clearInterval(timeoutId);
      targetRef.current?.classList.remove('context-guide-target');
    };
  }, [active, stepId]);

  useEffect(() => {
    if (!active || !resolvedStep?.element) return undefined;

    const element = resolvedStep.element;
    const handleTargetClick = () => {
      const nextStep = resolvedStep.next;
      window.setTimeout(() => {
        if (nextStep === 'complete') completeGuide();
        else setStepId(nextStep);
      }, 350);
    };
    const updateRect = () => setRect(element.getBoundingClientRect());

    element.addEventListener('click', handleTargetClick, { once: true });
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      element.removeEventListener('click', handleTargetClick);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [active, completeGuide, resolvedStep]);

  const popoverStyle = useMemo(() => {
    if (!rect) return {};
    const width = 330;
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - width - 16);
    const roomBelow = window.innerHeight - rect.bottom;
    const top = roomBelow > 230 ? rect.bottom + 16 : Math.max(16, rect.top - 190);
    return { left, top, width };
  }, [rect]);

  return (
    <>
      {!active && (
        <div className="context-guide-launcher">
          {taskMenuOpen && (
            <div className="context-guide-menu">
              <span>我想要…</span>
              <button onClick={startBatchGuide}><strong>批量上传产品资料</strong><small>从入口、上传到问卷归档和产品编辑</small></button>
              <button disabled><strong>申请企业认证</strong><small>后续加入</small></button>
              <button disabled><strong>邀请团队成员</strong><small>后续加入</small></button>
            </div>
          )}
          <button className="context-guide-trigger" onClick={() => setTaskMenuOpen((open) => !open)}>操作指引</button>
        </div>
      )}

      {active && (
        <div className="context-guide-layer">
          {rect && <div className="context-guide-focus" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />}
          {rect && <div className="context-guide-cursor" key={`${stepId}-${rect.left}-${rect.top}`} style={{ left: rect.left + rect.width / 2, top: rect.top + rect.height / 2 }}><span /></div>}
          <aside className={`context-guide-popover ${!rect ? 'waiting' : ''}`} style={rect ? popoverStyle : undefined}>
            <div className="context-guide-head"><span>批量上传指引</span><button onClick={stopGuide}>×</button></div>
            {resolvedStep ? (
              <>
                <h3>{resolvedStep.title}</h3>
                <p>{resolvedStep.description}</p>
                <small>请在真实页面中点击高亮位置，完成后会自动进入下一步。</small>
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
