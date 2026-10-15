// components/ui/StepCard/StepCard.jsx — Numbered step card for multi-step flows and landing page
import React from 'react';
import Card from '../Card/Card';
import styles from './StepCard.module.css';

export default function StepCard({
  number,
  title,
  description,
  icon,
  active = false,
  className = '',
  children,
  ...rest
}) {
  const formattedNumber =
    typeof number === 'number'
      ? String(number).padStart(2, '0')
      : number;

  return (
    <Card
      variant={active ? 'warm' : 'light'}
      className={`${styles.card} ${active ? styles.active : ''} ${className}`}
      {...rest}
    >
      <div className={styles.header}>
        {formattedNumber && (
          <span className={`${styles.number} ${active ? styles.numberActive : ''}`}>
            {formattedNumber}
          </span>
        )}
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>

      {title && <h3 className={styles.title}>{title}</h3>}
      {description && <p className={styles.description}>{description}</p>}
      {children}
    </Card>
  );
}
