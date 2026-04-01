import express from 'express';
import { validateEmail } from '../controllers/verificationController.js';

const router = express.Router();

router.get('/', validateEmail);

export default router;