import prisma from '../db.js';
import { logger } from '../utils/logger.js';

/**
 * Records a health check entry in the database
 * Used to verify database connectivity and performance
 * @returns {Object} Created health check record with timestamp
 */
export async function insertHealthCheck() {
  try {
    logger.debug('Inserting health check record');
    const healthCheck = await prisma.healthCheck.create({});
    return healthCheck;
  } catch (error) {
    throw error;
  }
}
