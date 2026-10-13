// components/ui/Button/Button.jsx — Button component with primary, dark, and ghost variants per §14.6
import React from 'react';
import styles from './Button.module.css';

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  as: Component = 'button',
  children,
  className = '',
  ...props
}) {
  const isButton = Component === 'button';
  const isDisabled = disabled || loading;

  const buttonClasses = [
    styles.button,
    styles[variant] || styles.primary,
    styles[size] || styles.md,
    loading ? styles.loading : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component
      className={buttonClasses}
      disabled={isButton ? isDisabled : undefined}
      aria-disabled={isDisabled ? 'true' : undefined}
      aria-busy={loading ? 'true' : undefined}
      {...props}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span className={styles.label}>{children}</span>
    </Component>
  );
}
