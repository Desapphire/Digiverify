/**
 * Auth Service — Nonce generation, signature verification, JWT issuance.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { verifySignature } = require('../config/blockchain');
const { SIGN_MESSAGE_TEMPLATE } = require('../config/constants');
const { generateNonce } = require('../utils/crypto');
const User = require('../models/User');
const AppError = require('../utils/AppError');

/**
 * Generate a nonce for the given wallet address.
 * If user doesn't exist yet, create a placeholder entry.
 */
const getOrCreateNonce = async (walletAddress) => {
    const nonce = generateNonce();
    let user = await User.findByWallet(walletAddress);

    if (user) {
        user = await User.updateNonce(walletAddress, nonce);
    }

    // Return nonce even if user doesn't exist yet (pre-registration)
    return { nonce, message: SIGN_MESSAGE_TEMPLATE(nonce), isRegistered: !!user };
};

/**
 * Verify a signed message and issue JWT tokens.
 */
const verifyAndAuthenticate = async (walletAddress, signature) => {
    const user = await User.findByWallet(walletAddress);
    if (!user) {
        throw new AppError('Wallet not registered. Please register first.', 404);
    }

    if (!user.isActive) {
        throw new AppError('Account deactivated. Contact support.', 403);
    }

    if (!user.authNonce) {
        throw new AppError('No pending nonce. Request a new nonce first.', 400);
    }

    // Reconstruct the message the user should have signed
    const expectedMessage = SIGN_MESSAGE_TEMPLATE(user.authNonce);
    const recoveredAddress = verifySignature(expectedMessage, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new AppError('Signature verification failed. Address mismatch.', 401);
    }

    // Invalidate the nonce (prevent replay attacks)
    await User.updateNonce(walletAddress, null);

    // Issue JWT
    const accessToken = jwt.sign(
        { id: user.id, walletAddress: user.walletAddress, role: user.role, email: user.email },
        env.JWT.secret,
        { expiresIn: env.JWT.expiresIn }
    );

    const refreshToken = jwt.sign(
        { id: user.id, walletAddress: user.walletAddress },
        env.JWT.refreshSecret,
        { expiresIn: env.JWT.refreshExpiresIn }
    );

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            walletAddress: user.walletAddress,
            name: user.name,
            email: user.email,
            role: user.role,
            kycStatus: user.kycStatus,
        },
    };
};

/**
 * Refresh an expired access token using a valid refresh token.
 */
const refreshAccessToken = async (refreshToken) => {
    try {
        const decoded = jwt.verify(refreshToken, env.JWT.refreshSecret);
        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
            throw new AppError('Invalid refresh token.', 401);
        }

        const accessToken = jwt.sign(
            { id: user.id, walletAddress: user.walletAddress, role: user.role, email: user.email },
            env.JWT.secret,
            { expiresIn: env.JWT.expiresIn }
        );

        return { accessToken };
    } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError('Invalid or expired refresh token.', 401);
    }
};

module.exports = { getOrCreateNonce, verifyAndAuthenticate, refreshAccessToken };
