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
    // Convert to lowercase for case-insensitive check
    const lowercaseUsername = username.toLowerCase();
        logger.debug({ message: 'Checking if user exists', username: lowercaseUsername });
    const user = await getUserByUsername(lowercaseUsername);
    const exists = user !== null;
    return exists;
  } catch (error) {
        logger.error({ message: 'Error checking user existence', username, error: error.message });
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
        // Ensure username is lowercase
        const lowercaseUsername = username.toLowerCase();
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        const now = new Date();
        const user = await createUser({
            username: lowercaseUsername,
            password: hash,
            first_name,
            last_name,
            account_created: now,
            account_updated: now,
        });
        return user;
    } catch (error) {
        logger.error({ message: 'Error registering user', username, error: error.message, stack: error.stack });
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
        const data = {};

        if (payload.first_name) data.first_name = payload.first_name;
        if (payload.last_name) data.last_name = payload.last_name;

        // Hash password before storing in database
        if (payload.password) {
            logger.debug({ message: 'Hashing new password for user', userId });
            data.password = await bcrypt.hash(payload.password, SALT_ROUNDS);
        }

        const updatedUser = await updateUser(userId, data);
        return updatedUser;
    } catch (error) {
        logger.error({ message: 'Error updating user details', userId, error: error.message, stack: error.stack });
        throw error;
    }
}
