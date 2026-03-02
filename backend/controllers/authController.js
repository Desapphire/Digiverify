/**
 * Auth Controller — Wallet-based authentication endpoints.
 */

const authService = require('../services/authService');
const auditService = require('../services/auditService');
const { AUDIT_ACTIONS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/auth/nonce/:walletAddress
 * Generate a nonce for wallet signing.
 */
const getNonce = catchAsync(async (req, res) => {
    const { walletAddress } = req.params;
    const result = await authService.getOrCreateNonce(walletAddress);

    return res.status(200).json({
        success: true,
        message: 'Nonce generated. Sign the message with your wallet.',
        data: result,
    });
});

/**
 * POST /api/auth/verify
 * Verify wallet signature and issue JWT.
 */
const verifySignature = catchAsync(async (req, res) => {
    const { walletAddress, signature } = req.body;
    const result = await authService.verifyAndAuthenticate(walletAddress, signature);

    await auditService.log({
        actionType: AUDIT_ACTIONS.USER_LOGIN,
        req,
        entityId: result.user.id,
        entityType: 'user',
        metadata: { walletAddress },
    });

    return res.status(200).json({
        success: true,
        message: 'Authentication successful.',
        data: result,
    });
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token.
 */
const refreshToken = catchAsync(async (req, res) => {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);

    return res.status(200).json({
        success: true,
        message: 'Token refreshed.',
        data: result,
    });
});

/**
 * GET /api/auth/me
 * Get current authenticated user.
 */
const getMe = catchAsync(async (req, res) => {
    const userService = require('../services/userService');
    const profile = await userService.getProfile(req.user.id);

    return res.status(200).json({
        success: true,
        message: 'User profile fetched.',
        data: profile,
    });
});

module.exports = { getNonce, verifySignature, refreshToken, getMe };
