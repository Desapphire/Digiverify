/**
 * Rate Limiting Middleware.
 * Prevents brute-force attacks and API abuse.
 * In development, rate limiting is completely bypassed.
 */

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const isDev = env.NODE_ENV === 'development';

// General API rate limiter — 500 req per 15 min per IP (dev: unlimited)
const apiLimiter = rateLimit({
    windowMs: env.RATE_LIMIT.windowMs,
    max: env.RATE_LIMIT.max,
    skip: () => isDev,          // no throttling in local development
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please try again later.',
    },
});

// Strict limiter for auth endpoints (prevent brute-force) — dev: unlimited
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 200,
    skip: () => isDev,          // no throttling in local development
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
});

module.exports = { apiLimiter, authLimiter };
