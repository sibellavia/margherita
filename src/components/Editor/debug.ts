const DEBUG = process.env.NODE_ENV === 'development';

export const debug = {
  log: (message: string, data?: unknown) => {
    if (DEBUG) {
      console.log(`[Editor] ${message}`, data);
    }
  },
  warn: (message: string, data?: unknown) => {
    if (DEBUG) {
      console.warn(`[Editor] ${message}`, data);
    }
  },
  error: (message: string, error?: unknown) => {
    if (DEBUG) {
      console.error(`[Editor] ${message}`, error);
    }
  }
};