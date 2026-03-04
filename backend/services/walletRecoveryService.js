/**
 * Wallet Recovery Service — Lost wallet recovery workflow.
 */

const WalletRecovery = require('../models/WalletRecovery');
const User = require('../models/User');
const Property = require('../models/Property');
const { withTransaction } = require('../config/db');
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');

/**
 * Report a lost wallet and request recovery.
 */
const requestRecovery = async (userId, oldWallet, reason) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404);

    if (user.walletAddress?.toLowerCase() !== oldWallet.toLowerCase()) {
        throw new AppError('The old wallet does not match your registered wallet.', 400);
    }

    // Check no pending recovery exists
    const existing = await WalletRecovery.findByUser(userId);
    const pending = existing.find(r => ['requested', 'identity_verified'].includes(r.status));
    if (pending) {
        throw new AppError('A recovery request is already pending.', 409);
    }

    return WalletRecovery.create({ userId, oldWallet, reason });
};

/**
 * Authority verifies the user's identity.
 */
const verifyIdentity = async (recoveryId, authorityId) => {
    const recovery = await WalletRecovery.findById(recoveryId);
    if (!recovery) throw new AppError('Recovery request not found.', 404);

    if (recovery.status !== 'requested') {
        throw new AppError(`Cannot verify. Current status: ${recovery.status}`, 400);
    }

    return WalletRecovery.updateStatus(recoveryId, 'identity_verified', authorityId);
};

/**
 * Complete recovery: assign new wallet and transfer all property ownership.
 */
const completeRecovery = async (recoveryId, newWallet) => {
    const recovery = await WalletRecovery.findById(recoveryId);
    if (!recovery) throw new AppError('Recovery request not found.', 404);

    if (recovery.status !== 'identity_verified') {
        throw new AppError(`Cannot complete. Identity must be verified first. Current status: ${recovery.status}`, 400);
    }

    // Check new wallet is not already in use
    const existingUser = await User.findByWallet(newWallet);
    if (existingUser && existingUser.id !== recovery.userId) {
        throw new AppError('New wallet is already registered to another user.', 409);
    }

    return withTransaction(async (client) => {
        // Update user's wallet address
        await User.updateWallet(recovery.userId, newWallet);

        // Transfer all property ownership from old wallet to new wallet
        await client.query(
            'UPDATE properties SET owner_wallet = $1, updated_at = NOW() WHERE LOWER(owner_wallet) = LOWER($2)',
            [newWallet, recovery.oldWallet]
        );

        // Update sale_transactions references
        await client.query(
            'UPDATE sale_transactions SET buyer_wallet = $1, updated_at = NOW() WHERE LOWER(buyer_wallet) = LOWER($2)',
            [newWallet, recovery.oldWallet]
        );
        await client.query(
            'UPDATE sale_transactions SET seller_wallet = $1, updated_at = NOW() WHERE LOWER(seller_wallet) = LOWER($2)',
            [newWallet, recovery.oldWallet]
        );

        // Complete recovery record
        // Note: NFT force-transfer would happen via blockchain service
        const completed = await WalletRecovery.complete(recoveryId, newWallet, null, client);

        return completed;
    });
};

/**
 * Reject a recovery request.
 */
const rejectRecovery = async (recoveryId, authorityId) => {
    const recovery = await WalletRecovery.findById(recoveryId);
    if (!recovery) throw new AppError('Recovery request not found.', 404);
    return WalletRecovery.updateStatus(recoveryId, 'rejected', authorityId);
};

/**
 * Get all pending recovery requests.
 */
const getPendingRecoveries = async () => {
    return WalletRecovery.findPending();
};

module.exports = { requestRecovery, verifyIdentity, completeRecovery, rejectRecovery, getPendingRecoveries };
