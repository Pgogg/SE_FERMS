// components/ui/Tabs/Tabs.jsx — Pill tab bar for switching sections with accessible keyboard navigation
import React, { useRef } from 'react';
import styles from './Tabs.module.css';

export default function Tabs({
  tabs = [],
  value,
  onChange,
  className = '',
}) {
  const tabListRef = useRef(null);

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (index + 1) % tabs.length;
      if (onChange) onChange(tabs[next].key);
      const buttons = tabListRef.current?.querySelectorAll('button');
      buttons?.[next]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (index - 1 + tabs.length) % tabs.length;
      if (onChange) onChange(tabs[prev].key);
      const buttons = tabListRef.current?.querySelectorAll('button');
      buttons?.[prev]?.focus();
    }
  };

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-label="Navigation Tabs"
      className={`${styles.tablist} ${className}`}
    >
      {tabs.map((tab, idx) => {
        const isSelected = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange && onChange(tab.key)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`${styles.tab} ${isSelected ? styles.selected : ''}`}
          >
            {tab.icon && <span className={styles.icon}>{tab.icon}</span>}
            <span className={styles.label}>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={styles.countBadge}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
