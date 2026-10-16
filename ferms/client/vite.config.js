// vite.config.js — Vite build configuration with React plugin and API proxy to Express server
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';

// If running inside a symlink/junction (e.g. OneDrive shortcut), change CWD to realpath
// so Vite/esbuild internal path resolution never suffers from symlink mismatch errors.
try {
  const realCwd = fs.realpathSync(process.cwd());
  if (realCwd !== process.cwd()) {
    process.chdir(realCwd);
  }
} catch {
  // ignore
}

export default defineConfig({
  plugins: [react()],
});
