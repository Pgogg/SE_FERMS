// components/ui/SeverityPicker/SeverityPicker.jsx — Segmented severity selector with four large interactive cards
import React from 'react';
import styles from './SeverityPicker.module.css';

const SEVERITIES = [
  {
    key: 'low',
    label: 'Low',
    desc: 'Small trash, smoke, or minor brush',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2c0 3-3 5-3 8a6 6 0 0 0 12 0c0-3-3-5-3-8z" />
      </svg>
    ),
  },
  {
    key: 'medium',
    label: 'Medium',
    desc: 'Single room, vehicle, or contained area',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2c0 4-4 6-4 10a8 8 0 0 0 16 0c0-4-4-6-4-10z" />
        <path d="M12 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      </svg>
    ),
  },
  {
    key: 'high',
    label: 'High',
    desc: 'Structure fire, fast spreading, or trapped',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    ),
  },
  {
    key: 'critical',
    label: 'Critical',
    desc: 'Major multi-alarm, explosion, hospital/school',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
];

export default function SeverityPicker({
  value,
  onChange,
  error,
  disabled = false,
  className = '',
}) {
  const handleSelect = (key) => {
    if (disabled) return;
    if (onChange) onChange(key);
  };

  const handleKeyDown = (e, index) => {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (index + 1) % SEVERITIES.length;
      handleSelect(SEVERITIES[next].key);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (index - 1 + SEVERITIES.length) % SEVERITIES.length;
      handleSelect(SEVERITIES[prev].key);
    }
  };

  return (
    <div className={`${styles.root} ${error ? styles.hasError : ''} ${className}`}>
      <div
        className={styles.grid}
        role="radiogroup"
        aria-label="Incident Severity"
      >
        {SEVERITIES.map((s, idx) => {
          const isSelected = value === s.key;
          return (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => handleSelect(s.key)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`${styles.card} ${styles[s.key]} ${isSelected ? styles.selected : ''}`}
            >
              <div className={styles.header}>
                <span className={styles.icon}>{s.icon}</span>
                <span className={styles.badge}>{s.label}</span>
              </div>
              <p className={styles.desc}>{s.desc}</p>
            </button>
          );
        })}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
