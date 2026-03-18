import { incrementMetric, timingMetric } from '../utils/metrics.js';

function normalizePath(path) {
  if (!path || path === '/') {
    return '/';
  }
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

function sanitizeSegment(segment) {
  return segment
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function segmentToMetricToken(segment) {
  if (!segment) {
    return null;
  }

  if (segment.startsWith(':')) {
    const paramName = sanitizeSegment(segment.slice(1));
    if (!paramName) {
      return null;
    }
    return `by_${paramName}`;
  }

  if (/^v\d+$/i.test(segment)) {
    return null;
  }

  return sanitizeSegment(segment);
}

function getEndpointName(req) {
  const method = req.method.toLowerCase();

  const routePath = typeof req.route?.path === 'string' ? req.route.path : '';
  const baseUrl = typeof req.baseUrl === 'string' ? req.baseUrl : '';
  const resolvedRoutePath = normalizePath(`${baseUrl}${routePath}`);

  if (!routePath) {
    return 'unknown';
  }

  const tokens = resolvedRoutePath
    .split('/')
    .filter(Boolean)
    .map(segmentToMetricToken)
    .filter(Boolean);

  if (tokens.length === 0) {
    return method;
  }

  return `${method}_${tokens.join('_')}`;
}

export default function metricsMiddleware(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const endpointName = getEndpointName(req);
    const durationMs = Date.now() - startTime;

    incrementMetric(`api.${endpointName}.count`);
    timingMetric(`api.${endpointName}.response_time`, durationMs);
  });

  next();
}
