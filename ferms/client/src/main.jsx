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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
