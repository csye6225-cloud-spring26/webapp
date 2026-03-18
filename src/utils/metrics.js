import StatsD from 'hot-shots';

const statsd = new StatsD({
  host: process.env.STATSD_HOST || 'localhost',
  port: parseInt(process.env.STATSD_PORT, 10) || 8125,
  prefix: 'csye6225.webapp.',
  mock: process.env.NODE_ENV === 'test',
  errorHandler: (error) => {
    console.error('StatsD error:', error);
  }
});

export function incrementMetric(name, value = 1) {
  try {
    statsd.increment(name, value);
  } catch {
  }
}

export function timingMetric(name, durationMs) {
  try {
    statsd.timing(name, durationMs);
  } catch {
  }
}

export default statsd;
