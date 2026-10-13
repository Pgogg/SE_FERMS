// main.jsx — App entry point: imports fonts, global styles, and mounts the React app into #root
import '@fontsource/bebas-neue/400.css';
import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/500.css';
import '@fontsource/work-sans/600.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/typography.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

async function prepareApp() {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
    });
    console.log('[MSW] Mock service worker started.');
  }
}

prepareApp()
  .catch((err) => {
    console.warn('[MSW] Mock service worker initialization failed, proceeding with app mount:', err);
  })
  .finally(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
