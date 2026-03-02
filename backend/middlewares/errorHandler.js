/**
 * Global Error Handler Middleware.
 * Catches all errors and returns a consistent JSON response.
 */

const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    // Default values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let details = err.details || null;

    // Log the full error in development / always for server errors
    if (statusCode >= 500 || !env.IS_PRODUCTION) {
        console.error(`[ERROR] ${req.method} ${req.originalUrl}`, {
            statusCode,
            message,
            stack: err.stack,
        });
    }

    // Don't leak internal details in production
    if (statusCode >= 500 && env.IS_PRODUCTION) {
        message = 'An unexpected error occurred. Please try again later.';
        details = null;
    }

    return res.status(statusCode).json({
        success: false,
        message,
        ...(details && { errors: details }),
        ...((!env.IS_PRODUCTION) && { stack: err.stack }),
    });
};

module.exports = errorHandler;
