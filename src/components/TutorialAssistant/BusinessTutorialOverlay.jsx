import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './BusinessTutorialOverlay.css';

export function BusinessTutorialOverlay() {
  const location = useLocation();
  const navigate = useNavigate();
  const enabled = new URLSearchParams(location.search).get('tutorial') === '1';

  useEffect(() => {
    if (!enabled || location.pathname !== '/') return undefined;
    const target = document.querySelector('a[href="/admin/login"]');
    target?.classList.add('business-tutorial-target');
    return () => target?.classList.remove('business-tutorial-target');
  }, [enabled, location.pathname]);

  if (!enabled || !['/', '/admin/register'].includes(location.pathname)) return null;

  const isRegister = location.pathname === '/admin/register';

  return (
    <aside className="business-guide-card" aria-live="polite">
      <div className="business-guide-progress">
        <span>{isRegister ? '02' : '01'}</span>
        <i><b style={{ width: isRegister ? '20%' : '10%' }} /></i>
        <small>企业新手教程</small>
      </div>
      <span className="business-guide-kicker">{isRegister ? '注册企业账号' : '找到企业入口'}</span>
      <h2>{isRegister ? '使用工作邮箱完成注册' : '先从真实网站进入企业端'}</h2>
      <p>{isRegister
        ? '表单已经填入演示数据。点击注册后不会创建真实账号，而是进入无写入的后台教程。'
        : '这是当前真实首页。教程会从注册开始，继续演示公司申请和批量上传。'}</p>
      <div className="business-guide-actions">
        {!isRegister && <button className="primary" onClick={() => navigate('/admin/register?tutorial=1')}>进入真实注册页</button>}
        <button onClick={() => navigate(location.pathname)}>退出教程预览</button>
      </div>
    </aside>
  );
}
