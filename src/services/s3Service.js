import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

// SDK automatically picks up credentials from EC2 instance profile
// No access keys needed — this is the secure, recommended approach
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

/**
 * Uploads a file to S3 with a collision-proof key
 * Key format: {course_id}/{uuid}/{original_file_name}
 * @param {Object} file - Multer file object (buffer, originalname, mimetype, size)
 * @param {string} courseId - UUID of the parent course
 * @returns {Object} S3 upload metadata (bucket, key, url)
 */
export async function uploadFile(file, courseId) {
  const uniqueId = randomUUID();
  const objectKey = `${courseId}/${uniqueId}/${file.originalname}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
    Body: file.buffer,
    ContentType: file.mimetype
  });

  try {
    await s3Client.send(command);
    logger.info({ message: 'File uploaded to S3', bucket: BUCKET_NAME, key: objectKey, courseId });

    return {
      s3_bucket_name: BUCKET_NAME,
      s3_object_key: objectKey,
      url: `https://${BUCKET_NAME}.s3.amazonaws.com/${objectKey}`
    };
  } catch (error) {
    logger.error({
      message: 'S3 upload failed',
      bucket: BUCKET_NAME,
      key: objectKey,
      courseId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Deletes a file from S3
 * @param {string} objectKey - The S3 object key to delete
 */
export async function deleteFile(objectKey) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey
  });

  try {
    await s3Client.send(command);
    logger.info({ message: 'File deleted from S3', bucket: BUCKET_NAME, key: objectKey });
  } catch (error) {
    logger.error({
      message: 'S3 delete failed',
      bucket: BUCKET_NAME,
      key: objectKey,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}