import prisma from '../db.js';
import { logger } from '../utils/logger.js';

/**
 * Creates a syllabus metadata record and sets the parent course's has_syllabus to true
 * Uses a transaction to ensure both operations succeed or both fail
 * @param {Object} data - Syllabus metadata
 * @returns {Object} Created syllabus record
 */
export async function createSyllabus(data) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const syllabus = await tx.syllabus.create({ data });

      await tx.course.update({
        where: { id: data.course_id },
        data: { has_syllabus: true }
      });

      return syllabus;
    });

    logger.info('Syllabus created successfully', { id: result.id, course_id: data.course_id });
    return result;
  } catch (error) {
    logger.error('Database error - failed to create syllabus', { course_id: data.course_id, error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Retrieves syllabus metadata by course_id
 * @param {string} courseId - UUID of the parent course
 * @returns {Object|null} Syllabus record if found
 */
export async function getSyllabusByCourseId(courseId) {
  try {
    const syllabus = await prisma.syllabus.findUnique({
      where: { course_id: courseId }
    });
    return syllabus;
  } catch (error) {
    logger.error('Database error - failed to get syllabus', { course_id: courseId, error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Deletes a syllabus metadata record and sets the parent course's has_syllabus to false
 * Uses a transaction to ensure both operations succeed or both fail
 * @param {string} courseId - UUID of the parent course
 * @returns {Object} Deleted syllabus record
 */
export async function deleteSyllabus(courseId) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const syllabus = await tx.syllabus.delete({
        where: { course_id: courseId }
      });

      await tx.course.update({
        where: { id: courseId },
        data: { has_syllabus: false }
      });

      return syllabus;
    });

    logger.info('Syllabus deleted successfully', { course_id: courseId });
    return result;
  } catch (error) {
    logger.error('Database error - failed to delete syllabus', { course_id: courseId, error: error.message, stack: error.stack });
    throw error;
  }
}