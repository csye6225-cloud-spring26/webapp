import bcrypt from 'bcrypt';
import prisma from '../db.js';
import { setUnauthorized } from '../utils/response-handlers.js';
import { logger } from '../utils/logger.js';

/**
 * HTTP Basic Authentication middleware
 * Decodes Base64 credentials, validates user existence, and verifies password
 * Attaches authenticated user to req.user on success
 */
export default async function basicAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith('Basic ')) {
      logger.warn('Authentication failed - missing or invalid authorization header', { 
        path: req.originalUrl.split('?')[0], 
        method: req.method,
        hasAuth: !!auth 
      });
      return setUnauthorized({ message: 'Authentication credentials are missing or invalid' }, req, res);
    }

    // Decode Base64 credentials from Authorization header
    const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString();
    const [username, password] = decoded.split(':');

    if (!username || !password) {
      logger.warn('Authentication failed - incomplete credentials', { 
        path: req.originalUrl.split('?')[0],
        hasUsername: !!username,
        hasPassword: !!password 
      });
      return setUnauthorized({ message: 'Authentication credentials are missing or invalid' }, req, res);
    }

    // Look up user in database
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      logger.warn('Authentication failed - user not found', { 
        username, 
        path: req.originalUrl.split('?')[0] 
      });
      return setUnauthorized({ message: 'Authentication credentials are missing or invalid' }, req, res);
    }

    // Verify password matches stored hash
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      logger.warn('Authentication failed - invalid password', { 
        username, 
        path: req.originalUrl.split('?')[0] 
      });
      return setUnauthorized({ message: 'Authentication credentials are missing or invalid' }, req, res);
    }

    logger.info('Authentication successful', { 
      username, 
      path: req.originalUrl.split('?')[0] 
    });
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error - unexpected exception', { 
      error: error.message,
      stack: error.stack,
      path: req.originalUrl.split('?')[0] 
    });
    return setUnauthorized({ message: 'Authentication credentials are missing or invalid' }, req, res);
  }
}
