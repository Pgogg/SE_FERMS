// components/ui/StatTile/StatTile.jsx — KPI tile with large Bebas numeral and caption
import React from 'react';
import styles from './StatTile.module.css';

export default function StatTile({
  value,
  label,
  tone = 'light',
  sublabel,
  icon,
  className = '',
  onClick,
}) {
  const isInteractive = typeof onClick === 'function';

  return (
    <div
      className={`${styles.root} ${styles[tone] || styles.light} ${isInteractive ? styles.clickable : ''} ${className}`}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className={styles.topRow}>
        <span className={styles.value}>{value}</span>
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>
      <span className={styles.label}>{label}</span>
      {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
    </div>
  );
}
