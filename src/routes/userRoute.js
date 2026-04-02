import express from 'express';
import basicAuth from '../middleware/basicAuth.js';
import { rejectAuthHeaders } from '../middleware/errorHandler.js';
import {
  createUser,
  getSelf,
  updateSelf,
} from '../controllers/userController.js';
import { rejectQueryParams } from '../middleware/errorHandler.js';

const router = express.Router();

router.post('/', rejectAuthHeaders, rejectQueryParams, createUser);
router.get('/self', rejectQueryParams, basicAuth, getSelf);
router.put('/self', rejectQueryParams, basicAuth, updateSelf);

export default router;
