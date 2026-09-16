/**
 * Biometric & Face Verification Routes
 */

const express = require('express');
const router = express.Router();
const {
    verifyFace,
    livenessCheck,
} = require('../controllers/biometricController');

// Optional authentication middleware so both guests (onboarding) and logged-in users can verify
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, env.JWT.secret);
            const user = await User.findById(decoded.id);
            if (user && user.isActive) {
                req.user = user;
            }
        }
    } catch (_) {
        // Continue unauthenticated if invalid token
    }
    next();
};

const { biometricLimiter } = require('../middlewares/rateLimiter');

router.post('/verify-face', biometricLimiter, optionalAuth, verifyFace);
router.post('/liveness-check', biometricLimiter, livenessCheck);

module.exports = router;
