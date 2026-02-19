import { logger } from '../utils/logger.js';
import { setBadRequest } from '../utils/response-handlers.js';

/**
 * Global middleware to reject all OPTIONS requests
 * Returns 405 Method Not Allowed for any OPTIONS request
 */
export const rejectOptions = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    logger.warn('OPTIONS request rejected globally', {
      method: req.method,
      path: req.originalUrl
    });
    return res.status(405).end();
  }
  next();
};

/**
 * Global middleware to reject all HEAD requests
 * Returns 405 Method Not Allowed for any HEAD request
 */
export const rejectHead = (req, res, next) => {
  if (req.method === 'HEAD') {
    logger.warn('HEAD request rejected globally', {
      method: req.method,
      path: req.originalUrl
    });
    return res.status(405).end();
  }
  next();
};

/**
 * Middleware to reject requests with query parameters
 * Returns 400 Bad Request if any query parameters are present
 */
export const rejectQueryParams = (req, res, next) => {
  if (Object.keys(req.query).length > 0) {
    logger.warn('Request rejected - query parameters not allowed', {
      method: req.method,
      path: req.originalUrl
    });
    return setBadRequest({ message: 'Query parameters are not allowed' }, req, res);
  }
  next();
};

/**
 * Middleware to reject requests with authentication headers
 * Returns 400 Bad Request if Authorization header is present
 */
export const rejectAuthHeaders = (req, res, next) => {
  if (req.headers.authorization) {
    logger.warn('Request rejected - authentication not allowed on public endpoint', {
      method: req.method,
      path: req.originalUrl
    });
    return res.status(400).end();
  }
  next();
};

/**
 * Middleware to reject specific HTTP methods
 * Returns 400 Bad Request for non-GET methods
 */
export const rejectNonGetMethods = (req, res, next) => {
  if (req.method !== 'GET') {
    logger.warn('Request rejected - only GET method allowed', {
      method: req.method,
      path: req.originalUrl
    });
    return res.status(405).end();
  }
  next();
};

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
  res.status(405).end();
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