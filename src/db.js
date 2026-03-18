import { PrismaClient } from '@prisma/client';
import { timingMetric } from './utils/metrics.js';

const prismaClient = new PrismaClient({
  // Suppress Prisma's verbose error output - we handle errors in our own logger
  log: [],
});

const normalizeMetricPart = (value, fallback) => {
  return (value || fallback)
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
};

const prisma = typeof prismaClient.$extends === 'function'
  ? prismaClient.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const start = Date.now();
            try {
              return await query(args);
            } finally {
              const durationMs = Date.now() - start;
              const metricModel = normalizeMetricPart(model, 'unknown');
              const metricOperation = normalizeMetricPart(operation, 'unknown');
              timingMetric(`db.query.${metricModel}.${metricOperation}`, durationMs);
            }
          }
        }
      }
    })
  : prismaClient;

if (prisma === prismaClient && typeof prismaClient.$use === 'function') {
  prismaClient.$use(async (params, next) => {
    const start = Date.now();

    try {
      return await next(params);
    } finally {
      const durationMs = Date.now() - start;
      const model = normalizeMetricPart(params.model, 'unknown');
      const action = normalizeMetricPart(params.action, 'unknown');
      timingMetric(`db.query.${model}.${action}`, durationMs);
    }
  });
}

export default prisma;
