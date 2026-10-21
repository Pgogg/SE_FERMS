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
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (index + 1) % tabs.length;
      if (onChange) onChange(tabs[next].key);
      const buttons = tabListRef.current?.querySelectorAll('button');
      buttons?.[next]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (index - 1 + tabs.length) % tabs.length;
      if (onChange) onChange(tabs[prev].key);
      const buttons = tabListRef.current?.querySelectorAll('button');
      buttons?.[prev]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (onChange && tabs.length > 0) onChange(tabs[0].key);
      const buttons = tabListRef.current?.querySelectorAll('button');
      buttons?.[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = tabs.length - 1;
      if (onChange && last >= 0) onChange(tabs[last].key);
      const buttons = tabListRef.current?.querySelectorAll('button');
      buttons?.[last]?.focus();
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
