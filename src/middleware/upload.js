import multer from 'multer';

// Use memory storage — file stays in buffer, we upload to S3 ourselves
// No temp files written to disk
const storage = multer.memoryStorage();

const upload = multer({ storage });

export default upload;