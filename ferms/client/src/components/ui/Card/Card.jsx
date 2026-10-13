// components/ui/Card/Card.jsx — Card container with polymorphic as prop and variants per §14.6
import React from 'react';
import styles from './Card.module.css';

export default function Card({
  variant = 'light',
  as: Component = 'div',
  children,
  className = '',
  ...props
}) {
  const cardClasses = [
    styles.card,
    styles[variant] || styles.light,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={cardClasses} {...props}>
      {children}
    </Component>
  );
}
