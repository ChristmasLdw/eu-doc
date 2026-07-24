import { useId } from 'react';
import './GuideVisuals.css';

export function GuideCloud({ compact = false, floating = false, spark = false, className = '' }) {
  const classes = [
    'guide-cloud',
    compact ? 'guide-cloud--compact' : '',
    floating ? 'guide-cloud--floating' : '',
    spark ? 'guide-cloud--spark' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} aria-hidden="true">
      <span className="guide-cloud__shape">
        <span className="guide-cloud__face">
          <i />
          <i />
          <b />
        </span>
      </span>
    </span>
  );
}

export function GuideCursor({ style, className = '' }) {
  const gradientId = useId().replace(/:/g, '');

  return (
    <div className={`guide-cursor ${className}`.trim()} style={style} aria-hidden="true">
      <svg viewBox="0 0 32 40">
        <defs>
          <linearGradient id={gradientId} x1="4" y1="2" x2="24" y2="35" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60A5FA" />
            <stop offset="1" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
        <path
          d="M3.2 2.6V30.2L10.2 23.5L15.2 36.4L21.1 33.8L15.9 21.1H26.2L3.2 2.6Z"
          fill={`url(#${gradientId})`}
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M10.2 23.5L15.2 36.4L21.1 33.8L15.9 21.1"
          fill="none"
          stroke="rgba(31, 42, 88, .42)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      <span className="guide-cursor__ripple" />
    </div>
  );
}
