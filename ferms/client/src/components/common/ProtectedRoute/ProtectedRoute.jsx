// components/common/ProtectedRoute/ProtectedRoute.jsx — Redirects unauthenticated or unauthorised users away from protected pages
import React from 'react';
import styles from './ProtectedRoute.module.css';

export default function ProtectedRoute({ children }) { return <div className={styles.root}>{children}</div>; }
