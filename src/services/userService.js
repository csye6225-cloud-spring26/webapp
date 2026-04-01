import bcrypt from 'bcrypt';
import { createUser, updateUser, getUserByUsername } from '../models/userModel.js';
import { logger } from '../utils/logger.js';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { randomUUID } from 'crypto';

const SALT_ROUNDS = 10;
const sns = new SNSClient();

/**
 * Checks if a user with the given username already exists in the database
 * @param {string} username - The email address to check
 * @returns {boolean} True if user exists, false otherwise
 */
export async function userExists(username) {
  try {
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
 * Generates a verification token and publishes to SNS for email verification
 * @param {Object} userData - User registration data including username, password, first_name, last_name
 * @returns {Object} Created user object with hashed password
 */
export async function registerUser({ username, password, first_name, last_name }) {
    try {
        const lowercaseUsername = username.toLowerCase();
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        const now = new Date();

        // Generate verification token and expiry (1 minute)
        const verification_token = randomUUID();
        const token_expiry = new Date(now.getTime() + 60 * 1000);

        const user = await createUser({
            username: lowercaseUsername,
            password: hash,
            first_name,
            last_name,
            account_created: now,
            account_updated: now,
            verified: false,
            verification_token,
            token_expiry,
        });

        // Publish to SNS for email verification
        if (process.env.SNS_TOPIC_ARN) {
            try {
                await sns.send(new PublishCommand({
                    TopicArn: process.env.SNS_TOPIC_ARN,
                    Message: JSON.stringify({
                        email: lowercaseUsername,
                        firstName: first_name,
                        token: verification_token,
                    }),
                }));
                logger.info({ message: 'Published signup notification to SNS', username: lowercaseUsername });
            } catch (snsError) {
                logger.error({ message: 'Failed to publish to SNS', username: lowercaseUsername, error: snsError.message });
                // Don't throw — user is created, email is best-effort
            }
        }

        logger.info({ message: 'User registered successfully', username: lowercaseUsername });
        return user;
    } catch (error) {
        logger.error({ message: 'Error registering user', username, error: error.message, stack: error.stack });
        throw error;
    }
}

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