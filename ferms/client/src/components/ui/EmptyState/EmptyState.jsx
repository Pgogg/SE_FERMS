// components/ui/EmptyState/EmptyState.jsx — Illustrated empty-state feedback component
import React from 'react';
import styles from './EmptyState.module.css';

export default function EmptyState({
  title = 'No items found',
  description = 'There are no records matching your criteria.',
  action = null,
  icon = null,
  className = '',
}) {
  return (
    <div className={`${styles.root} ${className}`} role="status">
      <div className={styles.iconWrap}>
        {icon || (
          <svg
            className={styles.defaultIcon}
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2c0 4.5-5 7-5 11a7 7 0 0 0 14 0c0-4-5-6.5-5-11z" />
            <path d="M12 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
          </svg>
        )}
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.actionWrap}>{action}</div>}
    </div>
  );
}
