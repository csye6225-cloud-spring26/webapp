import * as courseService from '../services/courseService.js';
import {
  setBadRequestValidation,
  setNotFound,
  setConflict,
  setUnsupportedMediaType,
  setInternalServerError
} from '../utils/response-handlers.js';
import { logger } from '../utils/logger.js';

/**
 * POST /v1/courses — Create a new course
 */
export async function createCourse(req, res) {
  try {
    // Check Content-Type
    if (!req.is('application/json')) {
      logger.warn({
        message: 'Invalid Content-Type for course creation',
        method: req.method,
        path: req.originalUrl.split('?')[0],
        contentType: req.headers['content-type']
      });
      return setUnsupportedMediaType({ message: 'Content-Type must be application/json' }, req, res);
    }

    // Validate request body
    const validation = courseService.validateCreatePayload(req.body);
    if (!validation.valid) {
      logger.warn({
        message: 'Invalid request body for course creation',
        method: req.method,
        path: req.originalUrl.split('?')[0],
        reason: validation.message
      });
      return setBadRequestValidation({ message: validation.message }, req, res);
    }

    const result = await courseService.createCourse(req.body, req.user.username);

    if (result.error) {
      if (result.error.status === 409) {
        logger.warn({
          message: 'Course creation conflict',
          username: req.user?.username,
          reason: result.error.message
        });
        return setConflict({ message: result.error.message }, req, res);
      }
      logger.error({
        message: 'Course creation failed',
        username: req.user?.username,
        error: result.error.message
      });
      return setInternalServerError({ message: result.error.message }, req, res);
    }

    const response = courseService.formatCourseResponse(result.course);
    logger.info({
      message: 'Course created',
      courseId: result.course.id,
      department: result.course.department_code,
      number: result.course.number,
      userId: req.user?.id
    });
    res.setHeader('Location', `/v1/courses/${result.course.id}`);
    return res.status(201).json(response);
  } catch (error) {
    logger.error({ message: 'Failed to create course', error: error.message, stack: error.stack });
    return setInternalServerError({ message: 'An unexpected error occurred' }, req, res);
  }
}

/**
 * GET /v1/courses — List all courses
 */
export async function listCourses(req, res) {
  try {
    const courses = await courseService.getAllCourses();
    const response = courses.map(courseService.formatCourseResponse);
    logger.info({ message: 'Courses retrieved', count: courses.length, userId: req.user?.id });
    return res.status(200).json(response);
  } catch (error) {
    logger.error({ message: 'Failed to list courses', error: error.message, stack: error.stack });
    return setInternalServerError({ message: 'An unexpected error occurred' }, req, res);
  }
}

/**
 * GET /v1/courses/:course_id — Get a course by ID
 */
export async function getCourse(req, res) {
  try {
    const course = await courseService.getCourseById(req.params.course_id);
    if (!course) {
      logger.warn({ message: 'Course not found', courseId: req.params.course_id, userId: req.user?.id });
      return setNotFound({ message: 'Course not found' }, req, res);
    }

    const response = courseService.formatCourseResponse(course);
    logger.info({ message: 'Course retrieved', courseId: course.id, userId: req.user?.id });
    return res.status(200).json(response);
  } catch (error) {
    logger.error({
      message: 'Failed to get course',
      courseId: req.params.course_id,
      error: error.message,
      stack: error.stack
    });
    return setInternalServerError({ message: 'An unexpected error occurred' }, req, res);
  }
}

/**
 * PUT /v1/courses/:course_id — Update a course
 */
export async function updateCourse(req, res) {
  try {
    // Check Content-Type
    if (!req.is('application/json')) {
      logger.warn({
        message: 'Invalid Content-Type for course update',
        method: req.method,
        path: req.originalUrl.split('?')[0],
        contentType: req.headers['content-type']
      });
      return setUnsupportedMediaType({ message: 'Content-Type must be application/json' }, req, res);
    }

    // Validate request body
    const validation = courseService.validateUpdatePayload(req.body);
    if (!validation.valid) {
      logger.warn({
        message: 'Invalid request body for course update',
        courseId: req.params.course_id,
        reason: validation.message
      });
      return setBadRequestValidation({ message: validation.message }, req, res);
    }

    const result = await courseService.updateCourse(req.params.course_id, req.body, req.user.username);

    if (result.error) {
      if (result.error.status === 404) {
        logger.warn({ message: 'Course update failed - not found', courseId: req.params.course_id });
        return setNotFound({ message: result.error.message }, req, res);
      }
      logger.error({
        message: 'Course update failed',
        courseId: req.params.course_id,
        error: result.error.message
      });
      return setInternalServerError({ message: result.error.message }, req, res);
    }

    const response = courseService.formatCourseResponse(result.course);
    logger.info({ message: 'Course updated', courseId: result.course.id, userId: req.user?.id });
    return res.status(200).json(response);
  } catch (error) {
    logger.error({
      message: 'Failed to update course',
      courseId: req.params.course_id,
      error: error.message,
      stack: error.stack
    });
    return setInternalServerError({ message: 'An unexpected error occurred' }, req, res);
  }
}

/**
 * DELETE /v1/courses/:course_id — Delete a course
 */
export async function deleteCourse(req, res) {
  try {
    const result = await courseService.deleteCourse(req.params.course_id);

    if (result.error) {
      if (result.error.status === 404) {
        logger.warn({ message: 'Course delete failed - not found', courseId: req.params.course_id });
        return setNotFound({ message: result.error.message }, req, res);
      }
      if (result.error.status === 409) {
        logger.warn({
          message: 'Course delete conflict',
          courseId: req.params.course_id,
          reason: result.error.message
        });
        return setConflict({ message: result.error.message }, req, res);
      }
      logger.error({
        message: 'Course delete failed',
        courseId: req.params.course_id,
        error: result.error.message
      });
      return setInternalServerError({ message: result.error.message }, req, res);
    }

    logger.info({ message: 'Course deleted', courseId: req.params.course_id, userId: req.user?.id });
    return res.status(204).send();
  } catch (error) {
    logger.error({
      message: 'Failed to delete course',
      courseId: req.params.course_id,
      error: error.message,
      stack: error.stack
    });
    return setInternalServerError({ message: 'An unexpected error occurred' }, req, res);
  }
}