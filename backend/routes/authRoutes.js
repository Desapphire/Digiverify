/**
 * Auth Routes
 */
const express = require('express');
const router = express.Router();
const { getNonce, verifySignature, refreshToken, getMe } = require('../controllers/authController');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const { getNonceSchema, verifySignatureSchema } = require('../utils/validators');
const { authLimiter } = require('../middlewares/rateLimiter');

router.get('/nonce/:walletAddress', authLimiter, validate(getNonceSchema), getNonce);
router.post('/verify', authLimiter, validate(verifySignatureSchema), verifySignature);
router.post('/refresh', authLimiter, refreshToken);
router.get('/me', authenticate, getMe);

module.exports = router;
