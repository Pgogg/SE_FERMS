// components/ui/Stepper/Stepper.jsx — Progress stepper with numbered 01, 02, 03 items and active orange badge
import React from 'react';
import styles from './Stepper.module.css';

export default function Stepper({
  steps = [],
  currentKey,
  onStepClick,
  className = '',
}) {
  const currentIndex = steps.findIndex((s) => s.key === currentKey);

  return (
    <nav className={`${styles.root} ${className}`} aria-label="Progress">
      <ol className={styles.list}>
        {steps.map((step, idx) => {
          const isCurrent = step.key === currentKey;
          const isCompleted = currentIndex > -1 && idx < currentIndex;
          const isClickable = Boolean(onStepClick && (isCompleted || isCurrent));

          // Format index as two digits: 01, 02, etc.
          const stepNumber = String(idx + 1).padStart(2, '0');

          return (
            <li
              key={step.key}
              className={`${styles.item} ${isCurrent ? styles.current : ''} ${isCompleted ? styles.completed : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <button
                type="button"
                disabled={!isClickable}
                onClick={isClickable ? () => onStepClick(step.key) : undefined}
                className={`${styles.stepButton} ${isClickable ? styles.clickable : ''}`}
              >
                <span className={styles.badge}>
                  {isCompleted ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </span>
                <span className={styles.label}>{step.label}</span>
              </button>

              {idx < steps.length - 1 && (
                <div
                  className={`${styles.line} ${isCompleted ? styles.lineCompleted : ''}`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
