/**
 * Centralized logger utility for the frontend.
 * Prepares the application for integration with external logging services
 * like Sentry or Datadog, and standardizes console output.
 */

const isDev = import.meta.env.DEV;

export const logger = {
  info: (message, ...args) => {
    if (isDev) console.info(`[INFO] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message, error, ...args) => {
    console.error(`[ERROR] ${message}`, error, ...args);
    // In production, you would send this to Sentry or similar:
    // if (!isDev) Sentry.captureException(error);
  },
  debug: (message, ...args) => {
    if (isDev) console.debug(`[DEBUG] ${message}`, ...args);
  },
};
