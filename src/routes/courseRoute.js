
import { Router } from 'express';
import basicAuth from '../middleware/basicAuth.js';
import { createCourse, listCourses, getCourse, updateCourse, deleteCourse } from '../controllers/courseController.js';

const router = Router();

// All course endpoints require authentication
router.get('/', basicAuth, listCourses);
router.post('/', basicAuth, createCourse);
router.get('/:course_id', basicAuth, getCourse);
router.put('/:course_id', basicAuth, updateCourse);
router.delete('/:course_id', basicAuth, deleteCourse);

export default router;