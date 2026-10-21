// components/ui/FlameCard/FlameCard.jsx — Flame-shaped role card for the landing page (§14.1, §14.8 §5)
// Shape: original CSS clip-path — a vertical teardrop narrowing at the base, NOT copied from any brand.
import React from 'react';
import styles from './FlameCard.module.css';

/**
 * FlameCard – white card clipped to an original flame/teardrop silhouette.
 *
 * @param {React.ReactNode} icon     – a Lucide icon element (size ≈ 28, strokeWidth 1.5)
 * @param {string}          title    – short label rendered in Bebas Neue
 * @param {React.ReactNode} children – optional body text
 */
export default function FlameCard({ icon, title, children }) {
  return (
    <article className={styles.card} aria-label={title}>
      {/* Orange icon badge */}
      <div className={styles.iconBadge} aria-hidden="true">
        {icon}
      </div>

      {/* Text */}
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        {children && <p className={styles.desc}>{children}</p>}
      </div>
    </article>
  );
}
