import fs from 'fs';
import path from 'path';
import winston from 'winston';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const DEFAULT_LOG_FILE_PATH = '/opt/csye6225/logs/webapp.log';

let logFilePath = process.env.LOG_FILE_PATH || DEFAULT_LOG_FILE_PATH;

try {
  fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
} catch {
  logFilePath = './logs/webapp.log';
  fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
}

const baseLogger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: logFilePath })
  ]
});

const normalizePayload = (payload, meta) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    if (payload.message) {
      return payload;
    }
    return { message: 'Log event', ...payload };
  }

  return {
    message: typeof payload === 'string' ? payload : 'Log event',
    ...(meta || {})
  };
};

export const logger = {
  info: (payload, meta) => baseLogger.info(normalizePayload(payload, meta)),
  warn: (payload, meta) => baseLogger.warn(normalizePayload(payload, meta)),
  error: (payload, meta) => baseLogger.error(normalizePayload(payload, meta)),
  debug: (payload, meta) => baseLogger.debug(normalizePayload(payload, meta))
};

export default logger;
