import initialze from './src/app.js';
import dotenv from "dotenv";
import express from "express";
import { logger } from './src/utils/logger.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

logger.info('Starting application server', { port: PORT, environment: process.env.NODE_ENV || 'development' });

try {
  initialze(app);
  
  app.listen(PORT, () => {
    logger.info('Server started successfully', { port: PORT, url: `http://localhost:${PORT}` });
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  logger.error('Failed to start server', { 
    port: PORT,
    error: error.message,
    stack: error.stack 
  });
  process.exit(1);
}

