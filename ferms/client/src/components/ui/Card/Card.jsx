// components/ui/Card/Card.jsx — Generic surface card container with border-radius and shadow tokens
import React from 'react';
import styles from './Card.module.css';

export default function Card({ children }) { return <div className={styles.root}>{children}</div>; }
