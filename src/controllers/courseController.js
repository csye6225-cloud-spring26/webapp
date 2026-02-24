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
      return setUnsupportedMediaType({ message: 'Content-Type must be application/json' }, req, res);
    }

    // Validate request body
    const validation = courseService.validateCreatePayload(req.body);
    if (!validation.valid) {
      return setBadRequestValidation({ message: validation.message }, req, res);
    }

    const result = await courseService.createCourse(req.body, req.user.username);

    if (result.error) {
      if (result.error.status === 409) {
        return setConflict({ message: result.error.message }, req, res);
      }
      return setInternalServerError({ message: result.error.message }, req, res);
    }

    const response = courseService.formatCourseResponse(result.course);
    res.setHeader('Location', `/v1/courses/${result.course.id}`);
    return res.status(201).json(response);
  } catch (error) {
    logger.error('Error in createCourse controller', { error: error.message, stack: error.stack });
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
    return res.status(200).json(response);
  } catch (error) {
    logger.error('Error in listCourses controller', { error: error.message, stack: error.stack });
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
      return setNotFound({ message: 'Course not found' }, req, res);
    }

    const response = courseService.formatCourseResponse(course);
    return res.status(200).json(response);
  } catch (error) {
    logger.error('Error in getCourse controller', { error: error.message, stack: error.stack });
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
      return setUnsupportedMediaType({ message: 'Content-Type must be application/json' }, req, res);
    }

    // Validate request body
    const validation = courseService.validateUpdatePayload(req.body);
    if (!validation.valid) {
      return setBadRequestValidation({ message: validation.message }, req, res);
    }

    const result = await courseService.updateCourse(req.params.course_id, req.body, req.user.username);

    if (result.error) {
      if (result.error.status === 404) {
        return setNotFound({ message: result.error.message }, req, res);
      }
      return setInternalServerError({ message: result.error.message }, req, res);
    }

    const response = courseService.formatCourseResponse(result.course);
    return res.status(200).json(response);
  } catch (error) {
    logger.error('Error in updateCourse controller', { error: error.message, stack: error.stack });
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
        return setNotFound({ message: result.error.message }, req, res);
      }
      if (result.error.status === 409) {
        return setConflict({ message: result.error.message }, req, res);
      }
      return setInternalServerError({ message: result.error.message }, req, res);
    }

    return res.status(204).send();
  } catch (error) {
    logger.error('Error in deleteCourse controller', { error: error.message, stack: error.stack });
    return setInternalServerError({ message: 'An unexpected error occurred' }, req, res);
  }
}