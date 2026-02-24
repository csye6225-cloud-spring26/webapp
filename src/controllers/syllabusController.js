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
      return setBadRequest({ message: "A syllabus file must be provided in the 'file' form field" }, req, res);
    }

    // Check if file is empty
    if (req.file.size === 0) {
      return setBadRequest({ message: 'The uploaded file is empty' }, req, res);
    }

    const result = await syllabusService.uploadSyllabus(
      req.params.course_id,
      req.file,
      req.user.username
    );

    if (result.error) {
      if (result.error.status === 404) {
        return setNotFound({ message: result.error.message }, req, res);
      }
      if (result.error.status === 409) {
        return setConflict({ message: result.error.message }, req, res);
      }
      return setInternalServerError({ message: result.error.message }, req, res);
    }

    const response = syllabusService.formatSyllabusResponse(result.syllabus);
    res.setHeader('Location', `/v1/courses/${req.params.course_id}/syllabus`);
    return res.status(201).json(response);
  } catch (error) {
    logger.error('Error in uploadSyllabus controller', { error: error.message, stack: error.stack });
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
        return setNotFound({ message: result.error.message }, req, res);
      }
      return setInternalServerError({ message: result.error.message }, req, res);
    }

    const response = syllabusService.formatSyllabusResponse(result.syllabus);
    return res.status(200).json(response);
  } catch (error) {
    logger.error('Error in getSyllabus controller', { error: error.message, stack: error.stack });
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
        return setNotFound({ message: result.error.message }, req, res);
      }
      return setInternalServerError({ message: result.error.message }, req, res);
    }

    return res.status(204).send();
  } catch (error) {
    logger.error('Error in deleteSyllabus controller', { error: error.message, stack: error.stack });
    return setInternalServerError({ message: 'An unexpected error occurred' }, req, res);
  }
}