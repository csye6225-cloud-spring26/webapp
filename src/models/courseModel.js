import prisma from '../db.js';
import { logger } from '../utils/logger.js';

/**
 * Creates a new course record in the database
 * @param {Object} data - Course data
 * @returns {Object} Created course record
 */
export async function createCourse(data) {
  try {
    const course = await prisma.course.create({ data });
    logger.info({
      message: 'Course created successfully',
      id: course.id,
      department_code: course.department_code,
      number: course.number
    });
    return course;
  } catch (error) {
    logger.error({ message: 'Database error - failed to create course', error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Retrieves all courses sorted by department_code and number ascending
 * @returns {Array} List of all courses
 */
export async function getAllCourses() {
  try {
    const courses = await prisma.course.findMany({
      orderBy: [
        { department_code: 'asc' },
        { number: 'asc' }
      ]
    });
    logger.debug({ message: 'Retrieved all courses', count: courses.length });
    return courses;
  } catch (error) {
    logger.error({ message: 'Database error - failed to get courses', error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Retrieves a single course by its ID
 * @param {string} id - Course UUID
 * @returns {Object|null} Course record if found, null otherwise
 */
export async function getCourseById(id) {
  try {
    const course = await prisma.course.findUnique({ where: { id } });
    return course;
  } catch (error) {
    logger.error({ message: 'Database error - failed to get course by id', id, error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Finds a course by the unique combination of department_code and number
 * @param {string} department_code
 * @param {string} number
 * @returns {Object|null} Course record if found, null otherwise
 */
export async function getCourseByCodeAndNumber(department_code, number) {
  try {
    const course = await prisma.course.findUnique({
      where: {
        department_code_number: { department_code, number }
      }
    });
    return course;
  } catch (error) {
    logger.error({
      message: 'Database error - failed to find course by code and number',
      department_code,
      number,
      error: error.message
    });
    throw error;
  }
}

/**
 * Updates a course record
 * @param {string} id - Course UUID
 * @param {Object} data - Fields to update
 * @returns {Object} Updated course record
 */
export async function updateCourse(id, data) {
  try {
    const course = await prisma.course.update({
      where: { id },
      data
    });
    logger.info({ message: 'Course updated successfully', id });
    return course;
  } catch (error) {
    logger.error({ message: 'Database error - failed to update course', id, error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Deletes a course record
 * @param {string} id - Course UUID
 * @returns {Object} Deleted course record
 */
export async function deleteCourse(id) {
  try {
    const course = await prisma.course.delete({ where: { id } });
    logger.info({ message: 'Course deleted successfully', id });
    return course;
  } catch (error) {
    logger.error({ message: 'Database error - failed to delete course', id, error: error.message, stack: error.stack });
    throw error;
  }
}