/**
 * Custom application error class.
 * Distinguishes operational errors (expected) from programmer errors (bugs).
 */

class AppError extends Error {
    /**
     * @param {string} message - Human-readable error message.
     * @param {number} statusCode - HTTP status code (default 500).
     * @param {object} [details] - Optional extra details for the response.
     */
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
