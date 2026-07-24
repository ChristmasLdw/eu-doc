import './WelcomeDialog.css';

export function WelcomeDialog({ onClose, onSelectPath }) {
  return (
    <div className="welcome-overlay" role="dialog" aria-modal="true" aria-labelledby="business-welcome-title">
      <div className="welcome-dialog">
        <div className="welcome-icon">🏢</div>
        <h2 id="business-welcome-title">第一次使用企业后台？</h2>
        <p className="welcome-subtitle">
          我们会带你了解注册账号、申请公司、创建产品和上传文件的完整流程。
        </p>

        <div className="path-options">
          <button
            type="button"
            className="path-option"
            onClick={() => onSelectPath('manage')}
          >
            <div className="path-icon">📤</div>
            <div className="path-content">
              <h3>开始企业用户指引</h3>
              <p>约 2 分钟了解首次上传所需步骤</p>
              <span className="path-badge">企业用户</span>
            </div>
          </button>

          <button
            type="button"
            className="path-option path-option-simple"
            onClick={onClose}
          >
            <div className="path-icon">👁️</div>
            <div className="path-content">
              <h3>暂时不用</h3>
              <p>稍后可以从帮助入口重新打开</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
