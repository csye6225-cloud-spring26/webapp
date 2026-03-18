import { logger } from '../utils/logger.js';

/**
 * Logs every HTTP request when the response is finished.
 */
export default function requestLogger(req, res, next) {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    const forwardedFor = req.headers['x-forwarded-for'];

    let ip = req.ip;
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      ip = forwardedFor.split(',')[0].trim();
    }

    logger.info({
      message: 'HTTP Request',
      method: req.method,
      path: req.originalUrl.split('?')[0],
      statusCode: res.statusCode,
      responseTimeMs: Math.round(durationMs),
      ip
    });
  });

  next();
}
