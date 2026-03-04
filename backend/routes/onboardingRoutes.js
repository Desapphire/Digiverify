/**
 * Onboarding & Registration Routes
 * Handles user registration, legacy Phase 1 flows, and unified registration flows.
 */
const express = require('express');
const router = express.Router();
const {
    requestNonce,
    verifySignatureRegistration
} = require('../controllers/authController');
const { register } = require('../controllers/userController');
const validate = require('../middlewares/validate');
const { registerUserSchema } = require('../utils/validators');
const { authLimiter } = require('../middlewares/rateLimiter');

// --- Unified Registration Flow ---
router.post('/request-nonce', authLimiter, requestNonce);
router.post('/verify-signature', authLimiter, verifySignatureRegistration);
router.post('/register', authLimiter, validate(registerUserSchema), register);

module.exports = router;
