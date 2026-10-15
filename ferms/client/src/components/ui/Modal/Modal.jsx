// components/ui/Modal/Modal.jsx — Accessible modal dialog with focus trap, Escape close, and backdrop click
import React, { useEffect, useRef, useCallback } from 'react';
import styles from './Modal.module.css';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export default function Modal({ open, onClose, title, children, footer }) {
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);

  // Focus trap
  const trapFocus = useCallback((e) => {
    if (!dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    if (e.key === 'Escape') { onClose?.(); }
  }, [onClose]);

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement;
      // Focus first focusable inside dialog after paint
      requestAnimationFrame(() => {
        const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE);
        focusable?.[0]?.focus();
      });
      document.addEventListener('keydown', trapFocus);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', trapFocus);
      document.body.style.overflow = '';
      previousFocus.current?.focus();
    }
    return () => {
      document.removeEventListener('keydown', trapFocus);
      document.body.style.overflow = '';
    };
  }, [open, trapFocus]);

  if (!open) return null;

  const titleId = `modal-title-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className={styles.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
