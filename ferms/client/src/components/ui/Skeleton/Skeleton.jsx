// components/ui/Skeleton/Skeleton.jsx — Animated loading placeholder for cards, text, and data
import React from 'react';
import styles from './Skeleton.module.css';

export default function Skeleton({
  lines = 1,
  height,
  width,
  className = '',
  circle = false,
  ...rest
}) {
  const lineCount = Math.max(1, parseInt(lines, 10) || 1);
  const items = Array.from({ length: lineCount });

  const getStyle = (index) => {
    const s = {};
    if (height !== undefined) {
      s.height = typeof height === 'number' ? `${height}px` : height;
    }
    if (width !== undefined) {
      // If multiple lines, make the last line shorter for realistic text simulation
      if (lineCount > 1 && index === lineCount - 1 && width === '100%') {
        s.width = '65%';
      } else {
        s.width = typeof width === 'number' ? `${width}px` : width;
      }
    }
    return s;
  };

  return (
    <div
      className={`${styles.container} ${className}`}
      aria-hidden="true"
      {...rest}
    >
      {items.map((_, i) => (
        <span
          key={i}
          className={`${styles.bone} ${circle ? styles.circle : ''}`}
          style={getStyle(i)}
        />
      ))}
    </div>
  );
}
