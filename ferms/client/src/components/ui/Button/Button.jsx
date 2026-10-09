// components/ui/Button/Button.jsx — Reusable button with variant (primary, secondary, danger) and size props
import React from 'react';
import styles from './Button.module.css';

export default function Button({ children, ...props }) { return <button className={styles.root} {...props}>{children}</button>; }
