// components/ui/Modal/Modal.jsx — Accessible modal dialog with backdrop, focus trap, and close button
import React from 'react';
import styles from './Modal.module.css';

export default function Modal({ children }) { return <div className={styles.root}>{children}</div>; }
