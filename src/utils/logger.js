/**
 * Logging utility for consistent log formatting across the application
 * Uses CloudWatch-style log format for better readability
 */

const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG'
};

const log = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  
  // Build metadata string - exclude stack traces in production
  const metaKeys = Object.keys(meta).filter(key => {
    // Skip stack traces to keep logs clean
    if (key === 'stack') return false;
    return true;
  });
  
  const metaStr = metaKeys.length > 0 
    ? ' - ' + metaKeys.map(key => {
        const value = typeof meta[key] === 'string' ? meta[key] : JSON.stringify(meta[key]);
        return `${key}=${value}`;
      }).join(', ')
    : '';
  
  // CloudWatch-style format: ISO_TIMESTAMP [LEVEL] MESSAGE - metadata
  const logEntry = `${timestamp} [${level}] ${message}${metaStr}`;
  console.log(logEntry);
};

export const logger = {
  info: (message, meta) => log(LOG_LEVELS.INFO, message, meta),
  warn: (message, meta) => log(LOG_LEVELS.WARN, message, meta),
  error: (message, meta) => log(LOG_LEVELS.ERROR, message, meta),
  debug: (message, meta) => log(LOG_LEVELS.DEBUG, message, meta)
};
