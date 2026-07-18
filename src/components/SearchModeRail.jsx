/**
 * 搜索模式切换轨道组件
 * 实现"像手机拍照滤镜一样"的模式切换体验
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SearchModeRail.module.css';

const SEARCH_MODES = [
  { value: 'all', label: '综合', labelEn: 'All', color: '#6b7280' },
  { value: 'product', label: '产品', labelEn: 'Products', color: '#3b82f6' },
  { value: 'document', label: '资料', labelEn: 'Documents', color: '#10b981' },
  { value: 'company', label: '企业', labelEn: 'Companies', color: '#f59e0b' },
];

export default function SearchModeRail({ currentMode, onModeChange, counts = {} }) {
  const { i18n } = useTranslation();
  const railRef = useRef(null);
  const indicatorRef = useRef(null);
  const containerRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollAccumulatorRef = useRef(0);

  // 获取当前模式的颜色
  const getCurrentColor = () => {
    const mode = SEARCH_MODES.find(m => m.value === currentMode);
    return mode?.color || '#6b7280';
  };

  // 更新指示器位置和颜色
  const updateIndicator = () => {
    if (!railRef.current || !indicatorRef.current) return;

    const activeItem = railRef.current.querySelector(`[data-mode="${currentMode}"]`);
    if (!activeItem) return;

    const railRect = railRef.current.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();

    const left = itemRect.left - railRect.left;
    const width = itemRect.width;

    indicatorRef.current.style.left = `${left}px`;
    indicatorRef.current.style.width = `${width}px`;
    indicatorRef.current.style.background = getCurrentColor();
  };

  // 模式切换时更新指示器
  useEffect(() => {
    updateIndicator();
    const timer = setTimeout(updateIndicator, 50);
    return () => clearTimeout(timer);
  }, [currentMode, i18n.language]);

  // 窗口大小变化时更新指示器
  useEffect(() => {
    const handleResize = () => updateIndicator();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 横向滚轮处理
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const SCROLL_THRESHOLD = 80; // 切换阈值

    const handleWheel = (e) => {
      const deltaX = e.deltaX;
      const deltaY = e.deltaY;

      // 如果横向滚动占主导，拦截事件
      if (Math.abs(deltaX) > Math.abs(deltaY) * 0.3) {
        e.preventDefault();

        // 累积滚动距离
        scrollAccumulatorRef.current += deltaX;

        // 视觉反馈：轻微位移
        const progress = Math.max(-50, Math.min(50, scrollAccumulatorRef.current));
        setScrollProgress(progress);

        // 达到阈值后切换
        if (scrollAccumulatorRef.current > SCROLL_THRESHOLD) {
          // 向右滚（向左切换）
          const currentIndex = SEARCH_MODES.findIndex(m => m.value === currentMode);
          if (currentIndex > 0) {
            onModeChange(SEARCH_MODES[currentIndex - 1].value);
          }
          scrollAccumulatorRef.current = 0;
          setScrollProgress(0);
        } else if (scrollAccumulatorRef.current < -SCROLL_THRESHOLD) {
          // 向左滚（向右切换）
          const currentIndex = SEARCH_MODES.findIndex(m => m.value === currentMode);
          if (currentIndex < SEARCH_MODES.length - 1) {
            onModeChange(SEARCH_MODES[currentIndex + 1].value);
          }
          scrollAccumulatorRef.current = 0;
          setScrollProgress(0);
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [currentMode, onModeChange]);

  // 重置滚动进度
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Math.abs(scrollAccumulatorRef.current) < 80) {
        scrollAccumulatorRef.current = 0;
        setScrollProgress(0);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [scrollProgress]);

  // 键盘支持
  useEffect(() => {
    const handleKeyDown = (e) => {
      const currentIndex = SEARCH_MODES.findIndex(m => m.value === currentMode);

      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        onModeChange(SEARCH_MODES[currentIndex - 1].value);
      } else if (e.key === 'ArrowRight' && currentIndex < SEARCH_MODES.length - 1) {
        e.preventDefault();
        onModeChange(SEARCH_MODES[currentIndex + 1].value);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMode, onModeChange]);

  return (
    <div
      className={styles.container}
      ref={containerRef}
      data-mode={currentMode}
    >
      <div
        className={styles.rail}
        ref={railRef}
        role="tablist"
        aria-label="搜索模式"
        style={{
          transform: `translateX(${-scrollProgress * 0.3}px)`,
          transition: scrollProgress === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {SEARCH_MODES.map((mode) => {
          const isActive = currentMode === mode.value;
          const count = counts[mode.value];
          const label = i18n.language === 'en' ? mode.labelEn : mode.label;

          return (
            <button
              key={mode.value}
              type="button"
              className={`${styles.modeItem} ${isActive ? styles.active : ''}`}
              data-mode={mode.value}
              onClick={() => onModeChange(mode.value)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`mode-panel-${mode.value}`}
            >
              <span className={styles.modeLabel}>{label}</span>
              {/* 移除数字徽章显示，避免布局跳动 */}
            </button>
          );
        })}
        <div
          ref={indicatorRef}
          className={styles.indicator}
          aria-hidden="true"
        />
      </div>
      {/* 滚动进度提示 */}
      {Math.abs(scrollProgress) > 10 && (
        <div className={styles.scrollHint}>
          {scrollProgress > 0 ? '← 继续滚动切换' : '继续滚动切换 →'}
        </div>
      )}
    </div>
  );
}
