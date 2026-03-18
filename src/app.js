import express from 'express';
import cors from "cors";
import initializeRoutes from './routes/index.js';
import { notFoundHandler, jsonErrorHandler, rejectOptions, rejectHead, rejectQueryParams } from './middleware/errorHandler.js';
import requestLogger from './middleware/requestLogger.js';
import metricsMiddleware from './middleware/metricsMiddleware.js';
import { logger } from './utils/logger.js';

/**
 * Initializes Express application with middleware and routes
 * Enables CORS, JSON parsing, and URL-encoded body parsing
 * @param {Object} app - Express application instance
 */
const initialze = (app)=>{
    try {
        logger.info({ message: 'Initializing application' });
        app.use(requestLogger);
        app.use(metricsMiddleware);
        app.use(rejectOptions);
        app.use(rejectHead);
        
        logger.debug({ message: 'Setting up CORS middleware' });
        app.use(cors());
        
        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));
        app.use(rejectQueryParams);
        
        logger.debug({ message: 'Initializing application routes' });
        initializeRoutes(app);
        app.use(notFoundHandler);
        app.use(jsonErrorHandler);
        
        logger.info({ message: 'Application initialized successfully' });
    } catch (error) {
        logger.error({ 
            message: 'Failed to initialize application',
            error: error.message,
            stack: error.stack 
        });
        throw error;
    }
}

export default initialze;