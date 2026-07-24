import { useState, useEffect } from 'react';
import './DemoOverlay.css';

export function DemoOverlay({ isActive, message, onComplete }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  if (!show) return null;

  return (
    <>
      {/* 光影蒙层 */}
      <div className={`demo-overlay ${isActive ? 'active' : 'fading'}`}>
        <div className="demo-spotlight"></div>
      </div>

      {/* 演示提示 */}
      {isActive && (
        <div className="demo-banner">
          <div className="demo-banner-content">
            <span className="demo-icon">🎬</span>
            <span className="demo-text">{message || '演示中...'}</span>
            <button className="demo-skip" onClick={onComplete}>
              跳过演示
            </button>
          </div>
        </div>
      )}
    </>
  );
}
