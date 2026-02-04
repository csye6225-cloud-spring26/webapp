import express from 'express';
import basicAuth from '../middleware/basicAuth.js';
import {
  createUser,
  getSelf,
  updateSelf,
} from '../controllers/userController.js';

const router = express.Router();

router.post('/', createUser);
router.get('/self', basicAuth, getSelf);
router.put('/self', basicAuth, updateSelf);

export default router;
