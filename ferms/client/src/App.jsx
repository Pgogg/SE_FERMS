// App.jsx — Root application component: wraps the app in context providers and renders AppRouter
import React from 'react';
import AppRouter from './routes/AppRouter';
import { ToastProvider } from './components/ui/Toast/Toast';

export default function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
}
