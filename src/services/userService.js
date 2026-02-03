import bcrypt from 'bcrypt';
import { createUser, updateUser, getUserByUsername } from '../models/userModel.js';
import { logger } from '../utils/logger.js';

const SALT_ROUNDS = 10;

/**
 * Checks if a user with the given username already exists in the database
 * @param {string} username - The email address to check
 * @returns {boolean} True if user exists, false otherwise
 */
export async function userExists(username) {
  try {
    logger.debug('Checking if user exists', { username });
    const user = await getUserByUsername(username);
    const exists = user !== null;
    return exists;
  } catch (error) {
    logger.error('Error checking user existence', { username, error: error.message });
    throw error;
  }
}

/**
 * Registers a new user with hashed password and initial timestamps
 * @param {Object} userData - User registration data including username, password, first_name, last_name
 * @returns {Object} Created user object with hashed password
 */
export async function registerUser({ username, password, first_name, last_name }) {
    try {
        logger.info('Registering new user', { username, first_name, last_name });
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        const now = new Date();
        const user = await createUser({
            username,
            password: hash,
            first_name,
            last_name,
            account_created: now,
            account_updated: now,
        });
        logger.info('User registered successfully', { username });
        return user;
    } catch (error) {
        logger.error('Error registering user', { username, error: error.message, stack: error.stack });
        throw error;
    }
};

/**
 * Updates user profile details and/or password
 * Hashes new password before storage if password field is present
 * @param {string} userId - The ID of the user to update
 * @param {Object} payload - Object containing fields to update (first_name, last_name, password)
 * @returns {Object} Updated user object
 */
export async function updateUserDetails(userId, payload) {
    try {
        logger.info('Updating user details', { fields: Object.keys(payload) });
        const data = {};

        if (payload.first_name) data.first_name = payload.first_name;
        if (payload.last_name) data.last_name = payload.last_name;

        // Hash password before storing in database
        if (payload.password) {
            logger.debug('Hashing new password for user');
            data.password = await bcrypt.hash(payload.password, SALT_ROUNDS);
        }

        const updatedUser = await updateUser(userId, data);
        logger.info('User details updated successfully');
        return updatedUser;
    } catch (error) {
        logger.error('Error updating user details', { userId, error: error.message, stack: error.stack });
        throw error;
    }
}
