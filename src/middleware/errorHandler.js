import { logger } from '../utils/logger.js';
import { setBadRequest } from '../utils/response-handlers.js';

/**
 * Global middleware to handle 404 and 405 responses
 * Should be added at the END of app.js after all routes
 * Catches all requests that don't match defined routes
 */
export const notFoundHandler = (req, res) => {
  logger.warn('Invalid HTTP method or route not found', { 
    method: req.method, 
    path: req.originalUrl.split('?')[0] 
  });
  res.sendStatus(405);
};

/**
 * Global error handler for malformed JSON payloads
 */
export const jsonErrorHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn('Invalid JSON payload', { path: req.originalUrl });
    return setBadRequest({ message: 'Invalid JSON payload' }, req, res);
  }

  return next(err);
};