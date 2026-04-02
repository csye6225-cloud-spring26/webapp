import express from 'express';
import { healthCheck } from '../controllers/healthController.js';
import { rejectNonGetMethods, rejectAuthHeaders, rejectQueryParams } from '../middleware/errorHandler.js';

const router = express.Router();

// Apply middleware to reject non-GET methods, auth headers, then handle health check
router.all('/', rejectNonGetMethods, rejectAuthHeaders, rejectQueryParams, healthCheck);

export default router;
