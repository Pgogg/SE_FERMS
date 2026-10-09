// components/ui/Marquee/Marquee.jsx — Horizontally scrolling ticker for live incident counts or announcements
import React from 'react';
import styles from './Marquee.module.css';

export default function Marquee({ children }) { return <div className={styles.root}>{children}</div>; }
