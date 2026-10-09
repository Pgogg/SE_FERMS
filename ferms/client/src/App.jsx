// App.jsx — Root application component: wraps the app in context providers and renders AppRouter
import React from 'react';
import AppRouter from './routes/AppRouter';

export default function App() {
  return <AppRouter />;
}
