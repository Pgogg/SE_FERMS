// components/common/AppLayout/AppLayout.jsx — Top-level shell wrapping pages with AppNavbar, container, and ToastProvider
import React from 'react';
import { Outlet } from 'react-router-dom';
import AppNavbar from '../AppNavbar/AppNavbar';
import { ToastProvider, useToast } from '../../ui/Toast/Toast';
import styles from './AppLayout.module.css';

function InnerLayout({ children, fullWidth, noNavbar }) {
  return (
    <div className={styles.layout}>
      {!noNavbar && <AppNavbar />}
      <main className={`${styles.main} ${fullWidth ? styles.fullWidth : styles.contained}`}>
        {children || <Outlet />}
      </main>
    </div>
  );
}

export default function AppLayout({ children, fullWidth = false, noNavbar = false }) {
  let hasToast = false;
  try {
    useToast();
    hasToast = true;
  } catch {
    hasToast = false;
  }

  if (hasToast) {
    return <InnerLayout fullWidth={fullWidth} noNavbar={noNavbar}>{children}</InnerLayout>;
  }

  return (
    <ToastProvider>
      <InnerLayout fullWidth={fullWidth} noNavbar={noNavbar}>{children}</InnerLayout>
    </ToastProvider>
  );
}
