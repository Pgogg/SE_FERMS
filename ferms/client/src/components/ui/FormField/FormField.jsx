// components/ui/FormField/FormField.jsx — Labelled form field wrapper with error message support
import React from 'react';
import styles from './FormField.module.css';

export default function FormField({ children }) { return <div className={styles.root}>{children}</div>; }
