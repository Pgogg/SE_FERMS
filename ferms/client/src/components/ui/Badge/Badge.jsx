// components/ui/Badge/Badge.jsx — Small pill badge for status labels, severity, and counts
import React from 'react';
import styles from './Badge.module.css';

export default function Badge({ children }) { return <span className={styles.root}>{children}</span>; }
