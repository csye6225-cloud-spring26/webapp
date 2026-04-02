import express from 'express';
import { validateEmail } from '../controllers/verificationController.js';
import { rejectNonGetMethods } from '../middleware/errorHandler.js';

const router = express.Router();

router.get('/', rejectNonGetMethods, validateEmail);

export default router;