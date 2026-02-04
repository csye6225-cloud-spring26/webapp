import { registerUser, updateUserDetails, userExists } from '../services/userService.js';
import {
    setSuccess,
    setResourceCreated,
    setBadRequestValidation,
    setConflict,
    setUnsupportedMediaType,
    setInternalServerError,
} from '../utils/response-handlers.js';
import { logger } from '../utils/logger.js';

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Creates a new user with the provided credentials and profile information
 * Validates email format, password strength, and checks for existing users
 */
export async function createUser(req, res) {
    // Validate Content-Type
    const contentType = req.headers['content-type'];

    if(!contentType)
    if (!contentType || !contentType.includes('application/json')) {
        logger.warn('Invalid Content-Type for user creation', { contentType });
        return setUnsupportedMediaType({ message: 'Content-Type must be application/json' }, req, res);
    }

    const { username, password, first_name, last_name } = req.body;

    // Validate all required fields are present
    const requiredFields = ['username', 'password', 'first_name', 'last_name'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
        logger.warn('Missing required fields for user creation', { missingFields });
        return setBadRequestValidation({ 
            message: `Missing required fields: ${missingFields.join(', ')}` 
        }, req, res);
    }

    // Validate email format
    if (!EMAIL_REGEX.test(username)) {
        logger.warn('Invalid email format for user creation', { username });
        return setBadRequestValidation({ message: 'Username must be a valid email address' }, req, res);
    }

    // Validate password length
    if (password.length < 8) {
        logger.warn('Password too short for user creation', { username, passwordLength: password.length });
        return setBadRequestValidation({ message: 'Password must be at least 8 characters' }, req, res);
    }

    // Validate first name and last name are not empty strings
    if (first_name.trim() === '' || last_name.trim() === '') {
        logger.warn('Empty first name or last name for user creation');
        return setBadRequestValidation({ message: 'First name and last name are required' }, req, res);
    }

    try {
        // Check if username already exists
        const exists = await userExists(username);
        if (exists) {
            logger.warn('User creation failed - user already exists', { username });
            return setConflict({ message: 'A user with this email address already exists' }, req, res);
        }

        const user = await registerUser(req.body);
        // Exclude password from response payload for security
        const { password: _, ...response } = user;
        logger.info('User created successfully', { username });
        return res.status(201).json(response);
    } catch (error) {
        logger.error('Error creating user', { username, error: error.message, stack: error.stack });
        return setInternalServerError(error, req, res);
    }
}

/**
 * Retrieves the authenticated user's profile information
 * Requires valid Basic Authentication credentials
 */
export function getSelf(req, res) {
    logger.info('Retrieve user info', { username: req.user?.username, method: req.method, path: req.originalUrl.split('?')[0] });
    const { id, first_name, last_name, username, account_created, account_updated } = req.user;
    return res.status(200).json({ id, first_name, last_name, username, account_created, account_updated });
}

/**
 * Updates the authenticated user's profile or password
 * Only allows updates to first_name, last_name, and password fields
 */
export async function updateSelf(req, res) {

    // Validate Content-Type
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
        logger.warn('Invalid Content-Type for user update', { contentType });
        return setUnsupportedMediaType({ message: 'Content-Type must be application/json' }, req, res);
    }

    logger.info('Update user request', { username: req.user?.username, fields: Object.keys(req.body), method: req.method, path: req.originalUrl.split('?')[0] });

    const allowed = ['first_name', 'last_name', 'password'];
    const keys = Object.keys(req.body);

    // 400 if any non-updatable fields are present
    const invalidField = keys.find(k => !allowed.includes(k));
    if (invalidField) {
        logger.warn('Attempt to update non-updatable field', { invalidField });
        return setBadRequestValidation({ message: `Field ${invalidField} cannot be updated` }, req, res);
    }

    // 400 if no updatable fields are provided
    if (keys.length === 0) {
        return setBadRequestValidation({ message: 'At least one updatable field (first_name, last_name, password) must be provided' }, req, res);
    }

    // Validate password if present
    if (req.body.password && req.body.password.length < 8) {
        return setBadRequestValidation({ message: 'Password must be at least 8 characters' }, req, res);
    }

    // Validate first_name and last_name if present
    if (req.body.first_name !== undefined && req.body.first_name.trim() === '') {
        return setBadRequestValidation({ message: 'First name cannot be empty' }, req, res);
    }
    if (req.body.last_name !== undefined && req.body.last_name.trim() === '') {
        return setBadRequestValidation({ message: 'Last name cannot be empty' }, req, res);
    }

    try {
        await updateUserDetails(req.user.id, req.body);
        logger.info('User updated successfully', { username: req.user?.username });
        return res.status(204).end();
    } catch (error) {
        logger.error('Error updating user', { username: req.user?.username, error: error.message, stack: error.stack });
        return setInternalServerError(error, req, res);
    }
}
