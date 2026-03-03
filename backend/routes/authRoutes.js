/**
 * Auth Routes
 */
const express = require('express');
const router = express.Router();
const {
    getNonce,
    verifySignature,
    loginWithPassword,
    refreshToken,
    getMe
} = require('../controllers/authController');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const { getNonceSchema, verifySignatureSchema, loginPasswordSchema } = require('../utils/validators');
const { authLimiter } = require('../middlewares/rateLimiter');

// Standard Auth
router.get('/nonce/:walletAddress', authLimiter, validate(getNonceSchema), getNonce);
router.post('/verify', authLimiter, validate(verifySignatureSchema), verifySignature);
router.post('/login-password', authLimiter, validate(loginPasswordSchema), loginWithPassword);
router.post('/refresh', authLimiter, refreshToken);
router.get('/me', authenticate, getMe);

module.exports = router;
