import { insertHealthCheck } from '../models/healthModel.js';
import { logger } from '../utils/logger.js';

/**
 * Health check endpoint that verifies database connectivity
 * Returns 200 on success, 503 if database is unavailable
 * Sets cache control headers to prevent response caching
 */
export async function healthCheck(req, res) {
  logger.debug('Health check request received');

  if (req.body && Object.keys(req.body).length > 0) {
    logger.warn('Health check rejected - body not allowed');
    return res.status(400).end();
  }

    // Prevent response from being cached by proxies and browsers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate;',
      'Pragma': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });

  try {
    // Record health check in database to verify connectivity
    await insertHealthCheck();
    logger.info('Health check passed - database is healthy');
    return res.status(200).end();
  } catch (error) {
    logger.error('Health check failed - database unavailable', { error: error.message, stack: error.stack });
    return res.status(503).end();
  }
}

