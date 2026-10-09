// components/ui/SectionHeading/SectionHeading.jsx — Styled section title using --font-display with optional subtitle
import React from 'react';
import styles from './SectionHeading.module.css';

export default function SectionHeading({ children }) { return <h2 className={styles.root}>{children}</h2>; }
