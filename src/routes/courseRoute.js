import { Router } from 'express';
import basicAuth from '../middleware/basicAuth.js';
import upload from '../middleware/upload.js';
import { createCourse, listCourses, getCourse, updateCourse, deleteCourse } from '../controllers/courseController.js';
import { uploadSyllabus, getSyllabus, deleteSyllabus } from '../controllers/syllabusController.js';

const router = Router();

// Course CRUD — all require authentication
router.get('/', basicAuth, listCourses);
router.post('/', basicAuth, createCourse);
router.get('/:course_id', basicAuth, getCourse);
router.put('/:course_id', basicAuth, updateCourse);
router.delete('/:course_id', basicAuth, deleteCourse);

// Syllabus endpoints — nested under courses, all require authentication
// upload.single('file') parses the multipart/form-data and puts the file on req.file
router.get('/:course_id/syllabus', basicAuth, getSyllabus);
router.post('/:course_id/syllabus', basicAuth, upload.single('file'), uploadSyllabus);
router.delete('/:course_id/syllabus', basicAuth, deleteSyllabus);

export default router;