/**
 * Auth Controller — Nonce generation, signature verification, JWT, and Phase 1 Registration.
 */

const authService = require('../services/authService');
const User = require('../models/User');
const { generateNonce } = require('../utils/nonceGenerator');
const { verifySignature } = require('../utils/verifySignature');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/auth/nonce/:walletAddress
 * Legacy / standard login nonce.
 */
const getNonce = catchAsync(async (req, res) => {
    const { walletAddress } = req.params;
    const data = await authService.getOrCreateNonce(walletAddress);
    return res.status(200).json({
        success: true,
        data,
    });
});

/**
 * POST /api/auth/verify
 * Legacy / standard login signature verification.
 */
const verifySignatureController = catchAsync(async (req, res) => {
    const { walletAddress, signature } = req.body;
    const data = await authService.verifyAndAuthenticate(walletAddress, signature);
    return res.status(200).json({
        success: true,
        message: 'Authentication successful.',
        data,
    });
});

/**
 * POST /api/auth/login-password
 * Legacy / standard email/password login.
 */
const loginWithPassword = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const data = await authService.loginWithPassword(email, password);
    return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data,
    });
});

/**
 * POST /api/auth/refresh
 */
const refreshToken = catchAsync(async (req, res) => {
    const { refreshToken: token } = req.body;
    const data = await authService.refreshAccessToken(token);
    return res.status(200).json({
        success: true,
        data,
    });
});

/**
 * GET /api/auth/me
 */
const getMe = catchAsync(async (req, res) => {
    return res.status(200).json({
        success: true,
        data: req.user,
    });
});

// ── Phase 1 Registration Flow ────────────────────────────

/**
 * POST /api/auth/request-nonce
 * Unified registration flow nonce request.
 */
const requestNonceRegistration = catchAsync(async (req, res) => {
    const { walletAddress } = req.body;
    const nonce = generateNonce();
    // In a real production app, we might store this in Redis or a temp table
    // For now, we'll return it and expect it back in the verify step.
    return res.status(200).json({
        success: true,
        nonce
    });
});

/**
 * POST /api/auth/verify-signature
 * Unified registration flow signature verification.
 */
const verifySignatureRegistration = catchAsync(async (req, res) => {
    const { walletAddress, signature, nonce } = req.body;
    const recoveredAddress = verifySignature(nonce, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    return res.status(200).json({
        success: true,
        message: 'Signature verified'
    });
});

module.exports = {
    getNonce,
    verifySignature: verifySignatureController,
    loginWithPassword,
    refreshToken,
    getMe,
    requestNonce: requestNonceRegistration,
    verifySignatureRegistration,
};
