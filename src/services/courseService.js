import * as courseModel from '../models/courseModel.js';
import { logger } from '../utils/logger.js';

// Immutable fields that cannot be set or updated by the client
const IMMUTABLE_FIELDS = ['id', 'department_code', 'number', 'has_syllabus', 'date_created', 'date_updated'];

// Fields that can be updated via PUT
const UPDATABLE_FIELDS = ['title', 'credit_hours', 'classification', 'description', 'prerequisites'];

// Valid classification values
const VALID_CLASSIFICATIONS = ['core', 'elective'];

// Regex for department_code: 2-6 uppercase letters
const DEPT_CODE_REGEX = /^[A-Z]{2,6}$/;

/**
 * Validates course creation payload
 * @param {Object} body - Request body
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateCreatePayload(body) {
  // Check for immutable fields that should not be provided by the client
  for (const field of ['id', 'has_syllabus', 'date_created', 'date_updated']) {
    if (body[field] !== undefined) {
      return { valid: false, message: `Field '${field}' cannot be set by the client` };
    }
  }

  // Required fields
  const required = ['department_code', 'number', 'title', 'credit_hours', 'classification'];
  for (const field of required) {
    if (body[field] === undefined || body[field] === null) {
      return { valid: false, message: `${field} is required` };
    }
  }

  // department_code: uppercase letters, 2-6 chars
  if (typeof body.department_code !== 'string' || !DEPT_CODE_REGEX.test(body.department_code)) {
    return { valid: false, message: 'department_code must be 2-6 uppercase letters' };
  }

  // number: string, 1-6 chars
  if (typeof body.number !== 'string' || body.number.length < 1 || body.number.length > 6) {
    return { valid: false, message: 'number must be a string of 1-6 characters' };
  }

  // title: string, 1-255 chars
  if (typeof body.title !== 'string' || body.title.length < 1 || body.title.length > 255) {
    return { valid: false, message: 'title must be 1-255 characters' };
  }

  // credit_hours: integer, 1-8
  if (!Number.isInteger(body.credit_hours) || body.credit_hours < 1 || body.credit_hours > 8) {
    return { valid: false, message: 'credit_hours must be an integer between 1 and 8' };
  }

  // classification: core or elective
  if (!VALID_CLASSIFICATIONS.includes(body.classification)) {
    return { valid: false, message: 'classification must be one of: core, elective' };
  }

  // description: optional, max 2000 chars
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string' || body.description.length > 2000) {
      return { valid: false, message: 'description must be a string of max 2000 characters' };
    }
  }

  // prerequisites: optional, max 512 chars
  if (body.prerequisites !== undefined && body.prerequisites !== null) {
    if (typeof body.prerequisites !== 'string' || body.prerequisites.length > 512) {
      return { valid: false, message: 'prerequisites must be a string of max 512 characters' };
    }
  }

  // Check for unknown fields
  const allowedFields = ['department_code', 'number', 'title', 'credit_hours', 'classification', 'description', 'prerequisites'];
  for (const key of Object.keys(body)) {
    if (!allowedFields.includes(key)) {
      return { valid: false, message: `Unknown or disallowed field: '${key}'` };
    }
  }

  return { valid: true };
}

/**
 * Validates course update payload
 * @param {Object} body - Request body
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateUpdatePayload(body) {
  // Check for immutable fields
  for (const field of IMMUTABLE_FIELDS) {
    if (body[field] !== undefined) {
      return { valid: false, message: `Field '${field}' cannot be updated` };
    }
  }

  // At least one updatable field must be provided
  const hasUpdatable = UPDATABLE_FIELDS.some(f => body[f] !== undefined);
  if (!hasUpdatable) {
    return { valid: false, message: 'Request body must contain at least one field to update' };
  }

  // Check for unknown fields
  for (const key of Object.keys(body)) {
    if (!UPDATABLE_FIELDS.includes(key)) {
      return { valid: false, message: `Unknown or disallowed field: '${key}'` };
    }
  }

  // Validate individual fields if present
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.length < 1 || body.title.length > 255) {
      return { valid: false, message: 'title must be 1-255 characters' };
    }
  }

  if (body.credit_hours !== undefined) {
    if (!Number.isInteger(body.credit_hours) || body.credit_hours < 1 || body.credit_hours > 8) {
      return { valid: false, message: 'credit_hours must be an integer between 1 and 8' };
    }
  }

  if (body.classification !== undefined) {
    if (!VALID_CLASSIFICATIONS.includes(body.classification)) {
      return { valid: false, message: 'classification must be one of: core, elective' };
    }
  }

  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string' || body.description.length > 2000) {
      return { valid: false, message: 'description must be a string of max 2000 characters' };
    }
  }

  if (body.prerequisites !== undefined && body.prerequisites !== null) {
    if (typeof body.prerequisites !== 'string' || body.prerequisites.length > 512) {
      return { valid: false, message: 'prerequisites must be a string of max 512 characters' };
    }
  }

  return { valid: true };
}

/**
 * Formats a course record for API response (excludes audit fields)
 * @param {Object} course - Raw course record from database
 * @returns {Object} Formatted course response
 */
export function formatCourseResponse(course) {
  return {
    id: course.id,
    department_code: course.department_code,
    number: course.number,
    title: course.title,
    credit_hours: course.credit_hours,
    classification: course.classification,
    description: course.description || null,
    prerequisites: course.prerequisites || null,
    has_syllabus: course.has_syllabus,
    date_created: course.date_created.toISOString(),
    date_updated: course.date_updated.toISOString()
  };
}

/**
 * Creates a new course after checking for duplicates
 * @param {Object} data - Validated course data
 * @param {string} userEmail - Email of the authenticated user (audit)
 * @returns {{ course?: Object, error?: { status: number, message: string } }}
 */
export async function createCourse(data, userEmail) {
  try {
    // Check for duplicate department_code + number
    const existing = await courseModel.getCourseByCodeAndNumber(data.department_code, data.number);
    if (existing) {
      return { error: { status: 409, message: `Course ${data.department_code} ${data.number} already exists` } };
    }

    const course = await courseModel.createCourse({
      department_code: data.department_code,
      number: data.number,
      title: data.title,
      credit_hours: data.credit_hours,
      classification: data.classification,
      description: data.description || null,
      prerequisites: data.prerequisites || null,
      created_by: userEmail,
      updated_by: userEmail
    });

    return { course };
  } catch (error) {
    logger.error({ message: 'Error creating course', error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Retrieves all courses
 * @returns {Array} List of courses
 */
export async function getAllCourses() {
  return courseModel.getAllCourses();
}

/**
 * Retrieves a course by ID
 * @param {string} id - Course UUID
 * @returns {Object|null}
 */
export async function getCourseById(id) {
  return courseModel.getCourseById(id);
}

/**
 * Updates a course
 * @param {string} id - Course UUID
 * @param {Object} data - Validated update data
 * @param {string} userEmail - Email of the authenticated user (audit)
 * @returns {{ course?: Object, error?: { status: number, message: string } }}
 */
export async function updateCourse(id, data, userEmail) {
  try {
    const existing = await courseModel.getCourseById(id);
    if (!existing) {
      return { error: { status: 404, message: 'Course not found' } };
    }

    const updateData = { updated_by: userEmail };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.credit_hours !== undefined) updateData.credit_hours = data.credit_hours;
    if (data.classification !== undefined) updateData.classification = data.classification;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.prerequisites !== undefined) updateData.prerequisites = data.prerequisites;

    const course = await courseModel.updateCourse(id, updateData);
    return { course };
  } catch (error) {
    logger.error({ message: 'Error updating course', id, error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Deletes a course (only if no syllabus is attached)
 * @param {string} id - Course UUID
 * @returns {{ success?: boolean, error?: { status: number, message: string } }}
 */
export async function deleteCourse(id) {
  try {
    const existing = await courseModel.getCourseById(id);
    if (!existing) {
      return { error: { status: 404, message: 'Course not found' } };
    }

    if (existing.has_syllabus) {
      return {
        error: {
          status: 409,
          message: `Cannot delete course ${existing.department_code} ${existing.number} because it has a syllabus attached. Delete the syllabus first.`
        }
      };
    }

    await courseModel.deleteCourse(id);
    return { success: true };
  } catch (error) {
    logger.error({ message: 'Error deleting course', id, error: error.message, stack: error.stack });
    throw error;
  }
}