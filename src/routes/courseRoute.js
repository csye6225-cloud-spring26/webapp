import { Router } from 'express';
import basicAuth from '../middleware/basicAuth.js';
import upload from '../middleware/upload.js';
import { createCourse, listCourses, getCourse, updateCourse, deleteCourse } from '../controllers/courseController.js';
import { uploadSyllabus, getSyllabus, deleteSyllabus } from '../controllers/syllabusController.js';
import { rejectQueryParams } from '../middleware/errorHandler.js';

const router = Router();

// Course CRUD — all require authentication
router.get('/', rejectQueryParams, basicAuth, listCourses);
router.post('/', rejectQueryParams,basicAuth, createCourse);
router.get('/:course_id', rejectQueryParams, basicAuth, getCourse);
router.put('/:course_id', rejectQueryParams, basicAuth, updateCourse);
router.delete('/:course_id', rejectQueryParams, basicAuth, deleteCourse);

// Syllabus endpoints — nested under courses, all require authentication
// upload.single('file') parses the multipart/form-data and puts the file on req.file
router.get('/:course_id/syllabus', rejectQueryParams, basicAuth, getSyllabus);
router.post('/:course_id/syllabus', rejectQueryParams, basicAuth, upload.single('file'), uploadSyllabus);
router.delete('/:course_id/syllabus', rejectQueryParams, basicAuth, deleteSyllabus);

export default router;