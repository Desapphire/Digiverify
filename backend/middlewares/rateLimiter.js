/**
 * Comprehensive Rate Limiting Middlewares
 * Protects against DDoS, brute-force attacks, and external cloud API quota exhaustion.
 */

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const isDev = env.NODE_ENV === 'development';

// 1. General API limiter (all routes)
const apiLimiter = rateLimit({
    windowMs: env.RATE_LIMIT.windowMs,
    max: isDev ? 2000 : env.RATE_LIMIT.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again later.',
        code: 'TOO_MANY_REQUESTS',
    },
});

// 2. Strict limiter for Authentication (Login, Verify Signature, Nonce)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 100 : 30,     // 30 attempts per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
});

// 3. Rate limiter for Onboarding & User Registration
const onboardingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 50 : 15,      // 15 registration requests per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many registration requests from this IP. Please try again later.',
        code: 'ONBOARDING_RATE_LIMIT_EXCEEDED',
    },
});

// 4. Rate limiter for AWS Rekognition Biometric Endpoints (Protects AWS Quota)
const biometricLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 80 : 25,      // 25 facial analysis calls per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many biometric verification requests. Please try again in 15 minutes.',
        code: 'BIOMETRIC_RATE_LIMIT_EXCEEDED',
    },
});

// 5. Rate limiter for ML Risk Engine Inference (Protects CPU & Memory)
const riskLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 120 : 40,     // 40 risk assessments per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many risk evaluation requests. Please slow down.',
        code: 'RISK_RATE_LIMIT_EXCEEDED',
    },
});

module.exports = {
    apiLimiter,
    authLimiter,
    onboardingLimiter,
    biometricLimiter,
    riskLimiter,
};
