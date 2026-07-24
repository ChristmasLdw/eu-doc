import { useState, useRef, useEffect } from 'react';
import './FloatingWindow.css';

export function FloatingWindow({
  steps,
  currentStep,
  onNext,
  onPrev,
  onClose,
  isPlaying,
  targetMissing
}) {
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const windowRef = useRef(null);

  const step = steps[currentStep];

  // 拖动逻辑
  const handleMouseDown = (e) => {
    if (e.target.closest('.tutorial-controls')) return; // 不要拖动按钮区域
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  if (!step) return null;

  if (minimized) {
    return (
      <div
        className="tutorial-minimized"
        onClick={() => setMinimized(false)}
      >
        📘 引导 {currentStep + 1}/{steps.length}
      </div>
    );
  }

  const windowStyle = position.x !== 0 || position.y !== 0
    ? {
        right: 'auto',
        bottom: 'auto',
        left: `${window.innerWidth - 400 - 20 + position.x}px`,
        top: `${window.innerHeight - windowRef.current?.offsetHeight - 20 + position.y}px`,
      }
    : {};

  return (
    <div
      ref={windowRef}
      className={`tutorial-window ${isDragging ? 'dragging' : ''}`}
      style={windowStyle}
    >
      <div
        className="tutorial-header"
        onMouseDown={handleMouseDown}
      >
        <div className="tutorial-title">
          <span>📘</span>
          <span>{step.title}</span>
        </div>
        <div className="tutorial-controls">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            title="最小化"
            aria-label="最小化引导"
          >
            −
          </button>
          <button
            type="button"
            onClick={onClose}
            title="结束引导，稍后可重新查看"
            aria-label="结束引导"
          >
            ×
          </button>
        </div>
      </div>

      <div className="tutorial-content">
        <div className="step-indicator">
          步骤 {currentStep + 1} / {steps.length}
        </div>

        <div className="step-description">
          {step.description}
        </div>

        {step.tip && (
          <div className="step-tip">
            {step.tip}
          </div>
        )}

        {targetMissing && (
          <div className="step-target-warning" role="status">
            当前页面未找到演示目标，你仍可阅读说明或进入下一步。
          </div>
        )}
      </div>

      <div className="tutorial-footer">
        {isPlaying ? (
          <div className="demo-status">
            <span className="demo-indicator">🎬</span>
            <span>正在演示操作，请观看...</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="btn-prev"
              onClick={onPrev}
              disabled={currentStep === 0}
            >
              上一步
            </button>
            <button
              type="button"
              className="btn-next"
              onClick={onNext}
            >
              {currentStep === steps.length - 1 ? '完成 ✓' : '下一步 →'}
            </button>
            <button
              type="button"
              className="btn-close-footer"
              onClick={onClose}
              title="结束引导，稍后可重新查看"
              aria-label="结束引导"
            >
              ⊗
            </button>
          </>
        )}
      </div>
    </div>
  );
}
