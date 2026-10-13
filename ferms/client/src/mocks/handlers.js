// mocks/handlers.js — Composes MSW handlers from Track 1 and Track 2 with real-API bypass filtering
import { track1Handlers } from './handlers/track1.handlers.js';
import { track2Handlers } from './handlers/track2.handlers.js';

const realPrefixes = (import.meta.env?.VITE_REAL_API_PREFIXES || '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

const allHandlers = [...(track1Handlers || []), ...(track2Handlers || [])];

export const handlers = realPrefixes.length === 0
  ? allHandlers
  : allHandlers.filter((handler) => {
      const rawPath = String(handler.info?.path || '');
      const path = rawPath.startsWith('*') ? rawPath.slice(1) : rawPath;
      return !realPrefixes.some((prefix) => path.startsWith(prefix));
    });

export default handlers;
