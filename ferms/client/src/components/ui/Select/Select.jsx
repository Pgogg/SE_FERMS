// components/ui/Select/Select.jsx — Accessible select dropdown matching FERMS form aesthetics
import React, { useId } from 'react';
import styles from './Select.module.css';

export default function Select({
  label,
  name,
  options = [],
  value,
  onChange,
  error,
  hint,
  required = false,
  disabled = false,
  placeholder = 'Select an option',
  id: customId,
  className = '',
  ...rest
}) {
  const autoId = useId();
  const selectId = customId || name || autoId;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;

  return (
    <div className={`${styles.root} ${error ? styles.hasError : ''} ${className}`}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {required && <span className={styles.requiredMark} aria-hidden="true">*</span>}
        </label>
      )}

      <div className={styles.selectWrapper}>
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
          }
          className={styles.select}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={optVal} value={optVal}>
                {optLabel}
              </option>
            );
          })}
        </select>

        <span className={styles.arrowIcon} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>

      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
