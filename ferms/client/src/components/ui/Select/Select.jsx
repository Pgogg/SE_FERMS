// components/ui/Select/Select.jsx — Styled select dropdown wrapping a native <select> element
import React from 'react';
import styles from './Select.module.css';

export default function Select({ children, ...props }) { return <select className={styles.root} {...props}>{children}</select>; }
