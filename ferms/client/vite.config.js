// vite.config.js — Vite build configuration with React plugin and API proxy to Express server
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
