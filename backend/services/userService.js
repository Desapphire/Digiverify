/**
 * User Service — Business logic for user registration and management.
 */

const User = require('../models/User');
const { encrypt } = require('../utils/crypto');
const { generateNonce } = require('../utils/crypto');
const AppError = require('../utils/AppError');

/**
 * Register a new user with wallet address.
 */
const register = async ({ walletAddress, name, email, phone, governmentId, role }) => {
    // Check uniqueness
    const existingWallet = await User.findByWallet(walletAddress);
    if (existingWallet) {
        throw new AppError('Wallet address already registered.', 409);
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
        throw new AppError('Email already registered.', 409);
    }

    // Encrypt government ID before storage
    const governmentIdHash = governmentId ? encrypt(governmentId) : null;

    // Generate initial auth nonce
    const authNonce = generateNonce();

    const user = await User.create({
        walletAddress,
        name,
        email,
        phone,
        governmentIdHash,
        role: role || 'buyer',
        authNonce,
    });

    return {
        id: user.id,
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email,
        role: user.role,
        kycStatus: user.kycStatus,
    };
};

/**
 * Submit KYC document hash for verification.
 */
const submitKyc = async (userId, kycDocumentHash) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404);

    if (user.kycStatus === 'verified') {
        throw new AppError('KYC already verified.', 400);
    }

    return User.updateKycStatus(userId, 'pending', kycDocumentHash);
};

/**
 * Approve KYC (authority/super_admin only).
 */
const approveKyc = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404);
    return User.updateKycStatus(userId, 'verified', null);
};

/**
 * Reject KYC (authority/super_admin only).
 */
const rejectKyc = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404);
    return User.updateKycStatus(userId, 'rejected', null);
};

/**
 * Get user profile.
 */
const getProfile = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404);

    // Strip sensitive fields
    const { governmentIdHash, authNonce, ...safeUser } = user;
    return safeUser;
};

module.exports = { register, submitKyc, approveKyc, rejectKyc, getProfile };
