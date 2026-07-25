import { useCallback, useEffect, useRef, useState } from 'react';

function findScrollableAncestor(element) {
  let current = element?.parentElement;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    if (/(auto|scroll|overlay)/.test(`${style.overflow} ${style.overflowY} ${style.overflowX}`)) return current;
    current = current.parentElement;
  }
  return document.documentElement;
}

function isRelatedLayoutTarget(source, target) {
  if (!(source instanceof Element) || !target) return false;
  return source === target || source.contains(target) || target.contains(source);
}

export function getGuidePopoverStyle(rect, { width = 370, height = 270, gap = 16, margin = 16 } = {}) {
  if (!rect) return undefined;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const safeWidth = Math.min(width, viewportWidth - margin * 2);
  const safeHeight = Math.min(height, viewportHeight - margin * 2);
  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
  const target = {
    left: rect.left - gap,
    right: rect.right + gap,
    top: rect.top - gap,
    bottom: rect.bottom + gap,
  };
  const candidates = [
    { left: rect.right + gap, top: rect.top },
    { left: rect.left - safeWidth - gap, top: rect.top },
    { left: rect.left + (rect.width - safeWidth) / 2, top: rect.bottom + gap },
    { left: rect.left + (rect.width - safeWidth) / 2, top: rect.top - safeHeight - gap },
    { left: viewportWidth - safeWidth - margin, top: margin },
    { left: viewportWidth - safeWidth - margin, top: viewportHeight - safeHeight - margin },
    { left: margin, top: margin },
    { left: margin, top: viewportHeight - safeHeight - margin },
  ].map((candidate, index) => ({
    left: clamp(candidate.left, margin, viewportWidth - safeWidth - margin),
    top: clamp(candidate.top, margin, viewportHeight - safeHeight - margin),
    index,
  }));

  const overlapArea = (candidate) => {
    const right = candidate.left + safeWidth;
    const bottom = candidate.top + safeHeight;
    return Math.max(0, Math.min(right, target.right) - Math.max(candidate.left, target.left))
      * Math.max(0, Math.min(bottom, target.bottom) - Math.max(candidate.top, target.top));
  };

  const best = candidates.reduce((current, candidate) => {
    const score = overlapArea(candidate) * 1000 + candidate.index;
    return !current || score < current.score ? { ...candidate, score } : current;
  }, null);

  return { left: best.left, top: best.top, width: safeWidth, maxHeight: `calc(100vh - ${margin * 2}px)` };
}

export function useGuideTargetRect(active, element) {
  const [rect, setRect] = useState(null);
  const frameRef = useRef(null);

  const measure = useCallback(() => {
    if (!active || !element?.isConnected) {
      setRect(null);
      return;
    }

    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      if (element.isConnected) setRect(element.getBoundingClientRect());
    });
  }, [active, element]);

  useEffect(() => {
    if (!active || !element) {
      setRect(null);
      return undefined;
    }

    const scrollParent = findScrollableAncestor(element);
    const settleTimers = [0, 80, 240, 520].map((delay) => window.setTimeout(measure, delay));
    const handleLayoutMotion = (event) => {
      if (isRelatedLayoutTarget(event.target, element)) measure();
    };
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);

    resizeObserver?.observe(element);
    if (element.parentElement) resizeObserver?.observe(element.parentElement);
    if (scrollParent && scrollParent !== element.parentElement) resizeObserver?.observe(scrollParent);

    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    document.addEventListener('transitionrun', handleLayoutMotion, true);
    document.addEventListener('transitionend', handleLayoutMotion, true);
    document.addEventListener('animationstart', handleLayoutMotion, true);
    document.addEventListener('animationend', handleLayoutMotion, true);
    let disposed = false;
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!disposed) measure();
      }).catch(() => {});
    }

    return () => {
      disposed = true;
      settleTimers.forEach((timer) => window.clearTimeout(timer));
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      document.removeEventListener('transitionrun', handleLayoutMotion, true);
      document.removeEventListener('transitionend', handleLayoutMotion, true);
      document.removeEventListener('animationstart', handleLayoutMotion, true);
      document.removeEventListener('animationend', handleLayoutMotion, true);
      window.cancelAnimationFrame(frameRef.current);
    };
  }, [active, element, measure]);

  return rect;
}
