import * as syllabusService from '../services/syllabusService.js';
import {
  setBadRequest,
  setNotFound,
  setConflict,
  setInternalServerError
} from '../utils/response-handlers.js';
import { logger } from '../utils/logger.js';

/**
 * POST /v1/courses/:course_id/syllabus — Upload a syllabus
 */
export async function uploadSyllabus(req, res) {
  try {
    // Check if file was provided
    if (!req.file) {
      logger.warn({
        message: 'Syllabus upload validation failed - missing file',
        courseId: req.params.course_id,
        method: req.method,
        path: req.originalUrl.split('?')[0]
      });
      return setBadRequest({ message: "A syllabus file must be provided in the 'file' form field" }, req, res);
    }

    // Check if file is empty
    if (req.file.size === 0) {
      logger.warn({
        message: 'Syllabus upload validation failed - empty file',
        courseId: req.params.course_id,
        fileName: req.file.originalname
      });
      return setBadRequest({ message: 'The uploaded file is empty' }, req, res);
    }

    const result = await syllabusService.uploadSyllabus(
      req.params.course_id,
      req.file,
      req.user.username
    );

    if (result.error) {
      if (result.error.status === 404) {
        logger.warn({ message: 'Syllabus upload failed - course not found', courseId: req.params.course_id });
        return setNotFound({ message: result.error.message }, req, res);
      }
      if (result.error.status === 409) {
        logger.warn({
          message: 'Syllabus upload conflict',
          courseId: req.params.course_id,
          reason: result.error.message
        });
        return setConflict({ message: result.error.message }, req, res);
      }
      logger.error({
        message: 'Syllabus upload failed',
        courseId: req.params.course_id,
        error: result.error.message
      });
      return setInternalServerError({ message: result.error.message }, req, res);
    }

    const response = syllabusService.formatSyllabusResponse(result.syllabus);
    logger.info({
      message: 'Syllabus uploaded',
      courseId: req.params.course_id,
      syllabusId: result.syllabus.id,
      fileName: result.syllabus.file_name,
      userId: req.user?.id
    });
    res.setHeader('Location', `/v1/courses/${req.params.course_id}/syllabus`);
    return res.status(201).json(response);
  } catch (error) {
    logger.error({
      message: 'Failed to upload syllabus',
      courseId: req.params.course_id,
      error: error.message,
      stack: error.stack
    });
    return setInternalServerError({ message: 'An unexpected error occurred' }, req, res);
  }
}

/**
 * GET /v1/courses/:course_id/syllabus — Get syllabus metadata
 */
export async function getSyllabus(req, res) {
  try {
    const result = await syllabusService.getSyllabus(req.params.course_id);

    if (result.error) {
      if (result.error.status === 404) {
        logger.warn({ message: 'Syllabus not found', courseId: req.params.course_id });
        return setNotFound({ message: result.error.message }, req, res);
      }
      logger.error({
        message: 'Failed to retrieve syllabus',
        courseId: req.params.course_id,
        error: result.error.message
      });
      return setInternalServerError({ message: result.error.message }, req, res);
    }

    const response = syllabusService.formatSyllabusResponse(result.syllabus);
    logger.info({
      message: 'Syllabus retrieved',
      courseId: req.params.course_id,
      syllabusId: result.syllabus.id,
      userId: req.user?.id
    });
    return res.status(200).json(response);
  } catch (error) {
    logger.error({
      message: 'Failed to get syllabus',
      courseId: req.params.course_id,
      error: error.message,
      stack: error.stack
    });
    return setInternalServerError({ message: 'An unexpected error occurred' }, req, res);
  }
}

/**
 * DELETE /v1/courses/:course_id/syllabus — Delete syllabus
 */
export async function deleteSyllabus(req, res) {
  try {
    const result = await syllabusService.deleteSyllabus(req.params.course_id);

    if (result.error) {
      if (result.error.status === 404) {
        logger.warn({ message: 'Syllabus delete failed - not found', courseId: req.params.course_id });
        return setNotFound({ message: result.error.message }, req, res);
      }
      logger.error({
        message: 'Syllabus delete failed',
        courseId: req.params.course_id,
        error: result.error.message
      });
      return setInternalServerError({ message: result.error.message }, req, res);
    }

    logger.info({ message: 'Syllabus deleted', courseId: req.params.course_id, userId: req.user?.id });
    return res.status(204).send();
  } catch (error) {
    logger.error({
      message: 'Failed to delete syllabus',
      courseId: req.params.course_id,
      error: error.message,
      stack: error.stack
    });
    return setInternalServerError({ message: 'An unexpected error occurred' }, req, res);
  }
}