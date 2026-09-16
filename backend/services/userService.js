/**
 * User Service — Business logic for user registration and management.
 */

const User = require('../models/User');
const bcrypt = require('bcrypt');
const { encrypt } = require('../utils/crypto');
const { generateNonce } = require('../utils/crypto');
const { ethers } = require('ethers');
const contractService = require('../blockchain/contractService');
const AppError = require('../utils/AppError');

/**
 * Register a new user with wallet address.
 */
const register = async ({ walletAddress, name, email, password, phone, governmentId, governmentIdType, houseNumber, locality, city, pinCode, state, country, role, birthdate }) => {
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
        governmentIdType,
        houseNumber,
        locality,
        city,
        pinCode,
        state,
        country,
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
const approveKyc = async (userId, reason = null) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404);

    let txHash = null;
    // On-chain Zero-Knowledge Identity Attestation in CitizenIdentityRegistry
    if (user.walletAddress) {
        try {
            console.log(`Anchoring KYC for user ${userId} (${user.walletAddress}) to CitizenIdentityRegistry...`);
            const idHash = user.governmentIdHash
                ? (user.governmentIdHash.startsWith('0x') && user.governmentIdHash.length === 66 ? user.governmentIdHash : ethers.keccak256(ethers.toUtf8Bytes(user.governmentIdHash)))
                : ethers.keccak256(ethers.toUtf8Bytes(user.id + (user.email || 'citizen')));
            const bioHash = user.faceIdHash
                ? (user.faceIdHash.startsWith('0x') && user.faceIdHash.length === 66 ? user.faceIdHash : ethers.keccak256(ethers.toUtf8Bytes(user.faceIdHash)))
                : ethers.ZeroHash;
            
            const kycLevel = user.faceVerified ? 3 : 2; // Level 3: FULL_ATTESTED, Level 2: BIOMETRIC_PASS
            const validityDuration = 31536000 * 5; // 5 years validity

            const result = await contractService.attestCitizenIdentityOnChain(
                user.walletAddress,
                idHash,
                bioHash,
                kycLevel,
                validityDuration,
                reason || 'GovTech Level-3 Attested'
            );
            txHash = result?.txHash || null;
            if (txHash) {
                console.log(`✅ KYC On-chain Attested for ${user.walletAddress}: Tx ${txHash}`);
            }
        } catch (err) {
            console.warn('⚠️ On-chain KYC attestation notice:', err.message);
        }
    }

    return User.updateKycStatus(userId, 'verified', null, reason);
};


/**
 * Reject KYC (authority/super_admin only).
 */
const rejectKyc = async (userId, reason = null) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404);
    return User.updateKycStatus(userId, 'rejected', null, reason);
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

    await User.updateFaceVerified(userId, true);
    return User.updateFaceIdHash(userId, faceIdHash);
};
/**
 * Update user profile (email, phone).
 */
const updateProfile = async (userId, { email, phone, houseNumber, locality, city, pinCode, state, country, walletAddress }) => {
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

    return User.updateProfile(userId, { 
        email: email || null, 
        phone: phone || null, 
        houseNumber: houseNumber || null, 
        locality: locality || null, 
        city: city || null, 
        pinCode: pinCode || null, 
        state: state || null, 
        country: country || null 
    });
};

/**
 * Citizen re-submits KYC data.
 */
const reKyc = async (userId, { name, phone, governmentId, governmentIdType, birthdate, houseNumber, locality, city, pinCode, state, country, faceIdHash }) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404);

    const governmentIdHash = governmentId ? encrypt(governmentId) : user.governmentIdHash;

    const updatedUser = await User.updateReKyc(userId, {
        name: name || user.name,
        phone: phone || user.phone,
        governmentIdHash,
        governmentIdType: governmentIdType || user.governmentIdType,
        birthdate: birthdate || user.birthdate,
        houseNumber: houseNumber || user.houseNumber,
        locality: locality || user.locality,
        city: city || user.city,
        pinCode: pinCode || user.pinCode,
        state: state || user.state,
        country: country || user.country || 'India',
        faceIdHash: faceIdHash || user.faceIdHash
    });

    return updatedUser;
};

/**
 * Authority requests citizen to perform Re-KYC.
 */
const requestReKyc = async (userId, reason = 'Re-KYC requested by Land Authority') => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404);

    return User.updateKycStatus(userId, 'pending', null, reason);
};

module.exports = { 
    register, 
    submitKyc, 
    approveKyc, 
    rejectKyc, 
    getProfile, 
    updateProfile, 
    bindFaceId,
    reKyc,
    requestReKyc
};
