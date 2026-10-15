// components/ui/FormField/FormField.jsx — Accessible form field wrapper with label, hint, and error linking per §14.6
import React from 'react';
import styles from './FormField.module.css';

export default function FormField({
  label,
  name,
  id,
  error,
  hint,
  required = false,
  children,
  className = '',
  ...inputProps
}) {
  const fieldId = id || (name ? `field-${name}` : undefined);
  const hintId = hint && fieldId ? `${fieldId}-hint` : undefined;
  const errorId = error && fieldId ? `${fieldId}-error` : undefined;

  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`${styles.field} ${className}`.trim()}>
      {label && (
        <label htmlFor={fieldId} className={styles.label}>
          <span>{label}</span>
          {required && (
            <span className={styles.required} aria-hidden="true">
              {' '}*
            </span>
          )}
        </label>
      )}

      {children ? (
        <div className={styles.inputWrapper}>
          {React.isValidElement(children)
            ? React.cloneElement(children, {
                id: children.props.id || fieldId,
                name: children.props.name || name,
                'aria-describedby': children.props['aria-describedby'] || describedBy,
                'aria-invalid': error ? 'true' : children.props['aria-invalid'],
                required: required || children.props.required,
              })
            : children}
        </div>
      ) : (
        <input
          id={fieldId}
          name={name}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          className={`${styles.input} ${error ? styles.inputError : ''}`.trim()}
          {...inputProps}
        />
      )}

      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}

      {error && (
        <span id={errorId} role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
