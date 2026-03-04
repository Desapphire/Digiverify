/**
 * User Service — Business logic for user registration and management.
 */

const User = require('../models/User');
const bcrypt = require('bcrypt');
const { encrypt } = require('../utils/crypto');
const { generateNonce } = require('../utils/crypto');
const contractService = require('../blockchain/contractService');
const AppError = require('../utils/AppError');

/**
 * Register a new user with wallet address.
 */
const register = async ({ walletAddress, name, email, password, phone, governmentId, role, birthdate }) => {
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

    // Hash the password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate initial auth nonce
    const authNonce = generateNonce();

    const user = await User.create({
        walletAddress,
        name,
        email,
        password: hashedPassword,
        phone,
        governmentIdHash,
        role: role || 'user',
        authNonce,
        birthdate,
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

    // Blockchain anchoring (Mock/Placeholder for identity contract)
    console.log(`🔗 Anchoring KYC for user ${userId} (${user.walletAddress}) on-chain...`);

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
    const { governmentIdHash, authNonce, password, ...safeUser } = user;
    return safeUser;
};

/**
 * Bind Face ID hash to user.
 */
const bindFaceId = async (userId, faceIdHash) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404);

    if (user.faceIdHash) {
        throw new AppError('Face ID already bound.', 400);
    }

    return User.updateFaceIdHash(userId, faceIdHash);
};
/**
 * Update user profile (email, phone).
 */
const updateProfile = async (userId, { email, phone, walletAddress }) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404);

    // If email is changing, check uniqueness
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
            throw new AppError('Email already in use by another account.', 409);
        }
    }

    // If walletAddress is being linked (previously null), check uniqueness
    if (walletAddress && !user.walletAddress) {
        const existingWallet = await User.findByWallet(walletAddress);
        if (existingWallet) {
            throw new AppError('Wallet address already in use.', 409);
        }
        await User.updateWallet(userId, walletAddress);
    }

    return User.updateProfile(userId, { email: email || null, phone: phone || null });
};


module.exports = { register, submitKyc, approveKyc, rejectKyc, getProfile, updateProfile, bindFaceId };
