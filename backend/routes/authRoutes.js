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
    getMe,
    registerLegal,
    getWalletNonce,
    verifyWallet
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

// Phase 1 Registration Flow
router.post('/register/legal', authLimiter, registerLegal);
router.post('/register/wallet/nonce', authLimiter, getWalletNonce);
router.post('/register/wallet/verify', authLimiter, verifyWallet);

module.exports = router;
