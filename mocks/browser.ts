/**
 * MSW Browser Setup
 *
 * Initializes MSW service worker for browser mocking during development.
 * This enables frontend development without a backend.
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
