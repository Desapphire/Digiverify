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
 * POST /api/auth/register/legal
 */
const registerLegal = catchAsync(async (req, res) => {
    const { fullName, governmentId, email, phone, faceImageCid, kycDocumentCids } = req.body;

    // Hash government ID (placeholder encryption)
    const governmentIdHash = Buffer.from(governmentId).toString('base64');
    const kycDocumentHash = kycDocumentCids && kycDocumentCids.length ? kycDocumentCids[0] : null;

    const user = await User.create({
        name: fullName,
        email,
        phone,
        governmentIdHash,
        role: 'user',
    });

    await User.updateKycStatus(user.id, 'pending', kycDocumentHash);

    return res.status(201).json({
        success: true,
        message: 'Legal details submitted. Status: PENDING',
        data: { userId: user.id, status: 'PENDING' }
    });
});

/**
 * POST /api/auth/register/wallet/nonce
 */
const getWalletNonce = catchAsync(async (req, res) => {
    const { userId } = req.body;
    const nonce = generateNonce();

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.updateNonceById(userId, nonce);

    return res.status(200).json({
        success: true,
        data: { nonce }
    });
});

/**
 * POST /api/auth/register/wallet/verify
 */
const verifyWallet = catchAsync(async (req, res) => {
    const { userId, signature } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.authNonce) {
        return res.status(400).json({ success: false, message: 'Invalid request or missing nonce' });
    }

    const recoveredAddress = verifySignature(user.authNonce, signature);

    await User.updateWallet(userId, recoveredAddress);
    await User.updateKycStatus(userId, 'verified', user.kycDocumentHash);

    return res.status(200).json({
        success: true,
        message: 'Wallet linked and KYC verified.',
        data: { walletAddress: recoveredAddress, status: 'APPROVED' }
    });
});

module.exports = {
    getNonce,
    verifySignature: verifySignatureController,
    loginWithPassword,
    refreshToken,
    getMe,
    registerLegal,
    getWalletNonce,
    verifyWallet,
};
