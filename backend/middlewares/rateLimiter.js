/**
 * Rate Limiting Middleware.
 * Prevents brute-force attacks and API abuse.
 */

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: env.RATE_LIMIT.windowMs,
    max: env.RATE_LIMIT.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please try again later.',
    },
});

// Strict limiter for auth endpoints (prevent brute-force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,                  // Increased for testing
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
});

module.exports = { apiLimiter, authLimiter };
