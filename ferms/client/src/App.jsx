import React from 'react';
import AppRouter from './routes/AppRouter';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './components/ui/Toast/Toast';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
