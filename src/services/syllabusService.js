import * as syllabusModel from '../models/syllabusModel.js';
import * as courseModel from '../models/courseModel.js';
import * as s3Service from './s3Service.js';
import { logger } from '../utils/logger.js';

/**
 * Formats a syllabus record for API response (excludes audit fields)
 * @param {Object} syllabus - Raw syllabus record from database
 * @returns {Object} Formatted syllabus response
 */
export function formatSyllabusResponse(syllabus) {
  return {
    id: syllabus.id,
    course_id: syllabus.course_id,
    file_name: syllabus.file_name,
    s3_bucket_name: syllabus.s3_bucket_name,
    s3_object_key: syllabus.s3_object_key,
    content_type: syllabus.content_type,
    file_size: syllabus.file_size,
    url: syllabus.url,
    date_created: syllabus.date_created.toISOString(),
    date_updated: syllabus.date_updated.toISOString()
  };
}

/**
 * Uploads a syllabus file to S3 and persists metadata in the database
 * @param {string} courseId - UUID of the parent course
 * @param {Object} file - Multer file object
 * @param {string} userEmail - Email of the authenticated user (audit)
 * @returns {{ syllabus?: Object, error?: { status: number, message: string } }}
 */
export async function uploadSyllabus(courseId, file, userEmail) {
  try {
    // Check if course exists
    const course = await courseModel.getCourseById(courseId);
    if (!course) {
      return { error: { status: 404, message: 'Course not found' } };
    }

    // Check if course already has a syllabus
    if (course.has_syllabus) {
      return {
        error: {
          status: 409,
          message: `Course ${course.department_code} ${course.number} already has a syllabus. Delete the existing syllabus first.`
        }
      };
    }

    // Upload file to S3
    const s3Result = await s3Service.uploadFile(file, courseId);

    // Persist metadata in database
    const syllabus = await syllabusModel.createSyllabus({
      course_id: courseId,
      file_name: file.originalname,
      s3_bucket_name: s3Result.s3_bucket_name,
      s3_object_key: s3Result.s3_object_key,
      content_type: file.mimetype,
      file_size: file.size,
      url: s3Result.url,
      created_by: userEmail,
      updated_by: userEmail
    });

    return { syllabus };
  } catch (error) {
    logger.error({ message: 'Error uploading syllabus', courseId, error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Retrieves syllabus metadata for a course
 * @param {string} courseId - UUID of the parent course
 * @returns {{ syllabus?: Object, error?: { status: number, message: string } }}
 */
export async function getSyllabus(courseId) {
  try {
    // Check if course exists
    const course = await courseModel.getCourseById(courseId);
    if (!course) {
      return { error: { status: 404, message: 'Course not found' } };
    }

    const syllabus = await syllabusModel.getSyllabusByCourseId(courseId);
    if (!syllabus) {
      return { error: { status: 404, message: 'No syllabus found for this course' } };
    }

    return { syllabus };
  } catch (error) {
    logger.error({ message: 'Error getting syllabus', courseId, error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Deletes a syllabus — removes file from S3 and metadata from database
 * @param {string} courseId - UUID of the parent course
 * @returns {{ success?: boolean, error?: { status: number, message: string } }}
 */
export async function deleteSyllabus(courseId) {
  try {
    // Check if course exists
    const course = await courseModel.getCourseById(courseId);
    if (!course) {
      return { error: { status: 404, message: 'Course not found' } };
    }

    const syllabus = await syllabusModel.getSyllabusByCourseId(courseId);
    if (!syllabus) {
      return { error: { status: 404, message: 'No syllabus found for this course' } };
    }

    // Delete file from S3 first
    await s3Service.deleteFile(syllabus.s3_object_key);

    // Delete metadata from database (also sets has_syllabus = false)
    await syllabusModel.deleteSyllabus(courseId);

    return { success: true };
  } catch (error) {
    logger.error({ message: 'Error deleting syllabus', courseId, error: error.message, stack: error.stack });
    throw error;
  }
}