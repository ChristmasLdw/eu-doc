import { useEffect, useRef, useState } from 'react';
import './AnimatedCursor.css';

export function AnimatedCursor({ targetElement, onAnimationComplete }) {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const animationFrameRef = useRef(null);
  const clickTimerRef = useRef(null);
  const finishTimerRef = useRef(null);

  useEffect(() => {
    const element = document.querySelector(targetElement);
    if (!element) {
      onAnimationComplete?.();
      return undefined;
    }

    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    const startX = window.innerWidth / 2;
    const startY = 100;
    const duration = 1500;
    const startTime = performance.now();

    setIsVisible(true);
    setPosition({ x: startX, y: startY });

    const animate = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - ((-2 * progress + 2) ** 2) / 2;

      setPosition({
        x: startX + (targetX - startX) * easedProgress,
        y: startY + (targetY - startY) * easedProgress,
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      clickTimerRef.current = window.setTimeout(() => {
        setIsClicking(true);
        finishTimerRef.current = window.setTimeout(() => {
          setIsClicking(false);
          setIsVisible(false);
          onAnimationComplete?.();
        }, 600);
      }, 300);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.clearTimeout(clickTimerRef.current);
      window.clearTimeout(finishTimerRef.current);
    };
  }, [onAnimationComplete, targetElement]);

  if (!isVisible) return null;

  return (
    <div
      className={`animated-cursor ${isClicking ? 'clicking' : ''}`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      aria-hidden="true"
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path
          d="M8 4L8 24L13 19L16 28L20 26L17 17L24 17L8 4Z"
          fill="white"
          stroke="black"
          strokeWidth="1.5"
        />
      </svg>
      {isClicking && <div className="click-ripple" />}
    </div>
  );
}
