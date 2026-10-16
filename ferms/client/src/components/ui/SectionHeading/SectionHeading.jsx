// components/ui/SectionHeading/SectionHeading.jsx — Section header with eyebrow, condensed heading, and intro
import React from 'react';
import styles from './SectionHeading.module.css';

export default function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'left',
  className = '',
  children,
}) {
  const displayTitle = title || children;

  return (
    <div className={`${styles.root} ${styles[align]} ${className}`}>
      {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
      {displayTitle && <h2 className={styles.title}>{displayTitle}</h2>}
      {intro && <p className={styles.intro}>{intro}</p>}
    </div>
  );
}
