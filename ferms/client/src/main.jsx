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

let isMounted = false;
function renderApp() {
  if (isMounted) return;
  isMounted = true;
  const rootEl = document.getElementById('root');
  if (rootEl) {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

async function prepareApp() {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    const startMsw = async () => {
      const { worker } = await import('./mocks/browser');
      await worker.start({
        onUnhandledRequest: 'bypass',
      });
      console.log('[MSW] Mock service worker started.');
    };

    // Timeout MSW after 1500ms so browser never hangs on an unmounted blank screen
    await Promise.race([
      startMsw(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('MSW start timed out after 1500ms')), 1500)
      ),
    ]);
  }
}

// Fallback: guaranteed render within 2000ms even if service worker hangs
const fallbackTimer = setTimeout(() => {
  console.warn('[FERMS] Fallback render triggered.');
  renderApp();
}, 2000);

prepareApp()
  .catch((err) => {
    console.warn('[MSW] Mock service worker initialization warning, proceeding with app mount:', err);
  })
  .finally(() => {
    clearTimeout(fallbackTimer);
    renderApp();
  });

