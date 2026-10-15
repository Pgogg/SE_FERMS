// mocks/browser.js — MSW browser service worker setup for intercepting API requests during development
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers.js';

export const worker = setupWorker(...handlers);
