import prisma from '../db.js';
import { logger } from '../utils/logger.js';

/**
 * Creates a new user record in the database
 * @param {Object} data - User data object with username, password, first_name, last_name, timestamps
 * @returns {Object} Created user record
 */
export async function createUser(data) {
  try {
    const user = await prisma.user.create({ data });
    return user;
  } catch (error) {
    logger.error({
      message: 'Database error - failed to create user',
      username: data.username,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Updates an existing user record
 * @param {string} id - The user's unique identifier
 * @param {Object} data - Fields to update
 * @returns {Object} Updated user record
 */
export async function updateUser(id, data) {
  try {
    const user = await prisma.user.update({
      where: { id },
      data,
    });
    return user;
  } catch (error) {
    logger.error({
      message: 'Database error - failed to update user',
      id,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Retrieves a user by their username (email address)
 * @param {string} username - The email address to search for
 * @returns {Object|null} User record if found, null otherwise
 */
export async function getUserByUsername(username) {
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (user) {
      logger.debug({ message: 'User found in database', username });
    } else {
      logger.debug({ message: 'User not found in database', username });
    }
    return user;
  } catch (error) {
    logger.error({
      message: 'Database error - failed to get user by username',
      username,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}
