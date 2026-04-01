import prisma from '../db.js';
import { logger } from '../utils/logger.js';

/**
 * Validates a user's email address using the token from the verification link.
 * GET /validateEmail?email=user@domain.com&token=<UUID>
 */
export async function validateEmail(req, res) {
    const { email, token } = req.query;

    if (!email || !token) {
        logger.warn({ message: 'Missing email or token in verification request' });
        return res.status(400).json({ message: 'Email and token are required' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { username: email.toLowerCase() },
        });

        if (!user) {
            logger.warn({ message: 'Verification failed - user not found', email });
            return res.status(400).json({ message: 'Invalid verification link' });
        }

        if (user.verified) {
            logger.info({ message: 'User already verified', email });
            return res.status(200).json({ message: 'Email is already verified' });
        }

        // Check if token matches
        if (user.verification_token !== token) {
            logger.warn({ message: 'Verification failed - token mismatch', email });
            return res.status(400).json({ message: 'Invalid verification link' });
        }

        // Check if token has expired
        if (new Date() > new Date(user.token_expiry)) {
            logger.warn({ message: 'Verification failed - token expired', email });
            return res.status(400).json({ message: 'Verification link has expired' });
        }

        // Mark user as verified
        await prisma.user.update({
            where: { username: email.toLowerCase() },
            data: { verified: true },
        });

        logger.info({ message: 'Email verified successfully', email });
        return res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
        logger.error({ message: 'Error during email verification', email, error: error.message });
        return res.status(500).json({ message: 'Internal server error' });
    }
}