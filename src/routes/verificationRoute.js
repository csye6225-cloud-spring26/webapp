import express from 'express';
import { validateEmail,rejectNonGetMethods } from '../controllers/verificationController.js';

const router = express.Router();

router.get('/', rejectNonGetMethods, validateEmail);

export default router;